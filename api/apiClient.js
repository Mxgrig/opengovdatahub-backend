import axios from 'axios';
import cacheManager from './cacheManager.js';

const API_TIMEOUT = parseInt(process.env.EXTERNAL_API_TIMEOUT) || 30000;
const API_RATE_LIMIT = parseInt(process.env.EXTERNAL_API_RATE_LIMIT) || 100;

class ApiClient {
  constructor() {
    this.requestCount = 0;
    this.windowStart = Date.now();
    this.windowSize = 60000; // 1 minute window
    
    // Create axios instance with default config
    this.client = axios.create({
      timeout: API_TIMEOUT,
      headers: {
        'User-Agent': 'OpenGov-DataHub/1.0.0'
      }
    });
    
    // Add request interceptor for rate limiting
    this.client.interceptors.request.use(
      (config) => {
        this.enforceRateLimit();
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API request failed:', error.message);
        return Promise.reject(error);
      }
    );
  }

  enforceRateLimit() {
    const now = Date.now();
    
    // Reset window if needed
    if (now - this.windowStart > this.windowSize) {
      this.requestCount = 0;
      this.windowStart = now;
    }
    
    // Check rate limit
    if (this.requestCount >= API_RATE_LIMIT) {
      const waitTime = this.windowSize - (now - this.windowStart);
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds.`);
    }
    
    this.requestCount++;
  }

  async fetchWithCache(url, options = {}) {
    const cacheKey = cacheManager.generateKey(url, options.params);
    
    // Check cache first
    const cachedData = cacheManager.get(cacheKey);
    if (cachedData && !options.forceRefresh) {
      console.log(`Cache hit for: ${cacheKey}`);
      return cachedData;
    }
    
    try {
      console.log(`Making API request to: ${url}`);
      const response = await this.client.get(url, options);
      
      // Cache the response
      const ttl = options.cacheTTL || 3600; // 1 hour default
      cacheManager.set(cacheKey, response.data, ttl);
      
      return response.data;
    } catch (error) {
      // If API fails, try to return stale cache data
      if (cachedData && options.allowStale) {
        console.log(`API failed, returning stale cache data for: ${cacheKey}`);
        return cachedData;
      }
      
      throw error;
    }
  }

  // UK Police API - Crime Data
  async fetchCrimeData(params = {}) {
    const baseUrl = 'https://data.police.uk/api';
    const { lat, lng, date, category } = params;
    
    let url = `${baseUrl}/crimes-street/all-crime`;
    const queryParams = {};
    
    if (lat && lng) {
      queryParams.lat = lat;
      queryParams.lng = lng;
    }
    
    if (date) {
      queryParams.date = date;
    }
    
    return await this.fetchWithCache(url, {
      params: queryParams,
      cacheTTL: 3600, // 1 hour
      allowStale: true
    });
  }

  // Planning Data API
  async fetchPlanningData(params = {}) {
    const baseUrl = 'https://www.planning.data.gov.uk/entity';
    const { geometry, categories, start_date, end_date } = params;
    
    const queryParams = {};
    
    if (geometry) {
      queryParams.geometry = geometry;
    }
    
    if (categories) {
      queryParams.categories = categories;
    }
    
    if (start_date) {
      queryParams.start_date = start_date;
    }
    
    if (end_date) {
      queryParams.end_date = end_date;
    }
    
    return await this.fetchWithCache(baseUrl, {
      params: queryParams,
      cacheTTL: 1800, // 30 minutes
      allowStale: true
    });
  }

  // Council Spending API
  async fetchCouncilSpending(params = {}) {
    const baseUrl = 'https://opendata.bristol.gov.uk/api/records/1.0/search/';
    const { dataset, q, rows = 20, start = 0 } = params;
    
    const queryParams = {
      dataset: dataset || 'payments-to-suppliers',
      q: q || '',
      rows,
      start
    };
    
    return await this.fetchWithCache(baseUrl, {
      params: queryParams,
      cacheTTL: 3600, // 1 hour
      allowStale: true
    });
  }

  // Postcode lookup
  async fetchPostcodeData(postcode) {
    const baseUrl = 'https://api.postcodes.io/postcodes';
    const cleanPostcode = postcode.replace(/\s+/g, '');
    
    return await this.fetchWithCache(`${baseUrl}/${cleanPostcode}`, {
      cacheTTL: 86400, // 24 hours (postcodes don't change often)
      allowStale: true
    });
  }

  // Proxy any external API call with caching
  async proxyRequest(url, options = {}) {
    return await this.fetchWithCache(url, {
      ...options,
      cacheTTL: options.cacheTTL || 3600,
      allowStale: true
    });
  }

  // Get cache statistics
  getCacheStats() {
    return cacheManager.getStats();
  }

  // Clear cache
  clearCache() {
    cacheManager.clear();
  }

  // Force refresh cache entry
  async refreshCache(url, params = {}) {
    const cacheKey = cacheManager.generateKey(url, params);
    cacheManager.delete(cacheKey);
    
    return await this.fetchWithCache(url, {
      params,
      forceRefresh: true
    });
  }
}

export default new ApiClient();
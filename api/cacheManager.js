import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CACHE_FILE = join(__dirname, '../data/api-cache.json');
const CACHE_TTL = parseInt(process.env.CACHE_TTL) || 3600; // 1 hour default
const CACHE_MAX_SIZE = parseInt(process.env.CACHE_MAX_SIZE) || 1000;

class CacheManager {
  constructor() {
    this.cache = this.loadCache();
  }

  loadCache() {
    if (!existsSync(CACHE_FILE)) {
      writeFileSync(CACHE_FILE, JSON.stringify({}, null, 2));
      return {};
    }
    
    try {
      const data = readFileSync(CACHE_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading cache:', error);
      return {};
    }
  }

  saveCache() {
    try {
      writeFileSync(CACHE_FILE, JSON.stringify(this.cache, null, 2));
    } catch (error) {
      console.error('Error saving cache:', error);
    }
  }

  generateKey(url, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    return `${url}${sortedParams ? '?' + sortedParams : ''}`;
  }

  isExpired(timestamp, ttl = CACHE_TTL) {
    return Date.now() - timestamp > ttl * 1000;
  }

  get(key) {
    const item = this.cache[key];
    
    if (!item) {
      return null;
    }
    
    if (this.isExpired(item.timestamp, item.ttl)) {
      delete this.cache[key];
      this.saveCache();
      return null;
    }
    
    // Update last accessed time
    item.lastAccessed = Date.now();
    this.saveCache();
    
    return item.data;
  }

  set(key, data, ttl = CACHE_TTL) {
    // Remove expired items and enforce size limit
    this.cleanup();
    
    this.cache[key] = {
      data,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      ttl,
      source: 'api'
    };
    
    this.saveCache();
  }

  cleanup() {
    const now = Date.now();
    const entries = Object.entries(this.cache);
    
    // Remove expired items
    entries.forEach(([key, item]) => {
      if (this.isExpired(item.timestamp, item.ttl)) {
        delete this.cache[key];
      }
    });
    
    // Enforce size limit (LRU eviction)
    const remainingEntries = Object.entries(this.cache);
    if (remainingEntries.length > CACHE_MAX_SIZE) {
      // Sort by last accessed (oldest first)
      remainingEntries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
      
      // Remove oldest items
      const itemsToRemove = remainingEntries.length - CACHE_MAX_SIZE;
      for (let i = 0; i < itemsToRemove; i++) {
        delete this.cache[remainingEntries[i][0]];
      }
    }
    
    this.saveCache();
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    delete this.cache[key];
    this.saveCache();
  }

  clear() {
    this.cache = {};
    this.saveCache();
  }

  getStats() {
    const entries = Object.entries(this.cache);
    const now = Date.now();
    
    return {
      totalItems: entries.length,
      expiredItems: entries.filter(([key, item]) => this.isExpired(item.timestamp, item.ttl)).length,
      oldestItem: entries.length > 0 ? Math.min(...entries.map(([key, item]) => item.timestamp)) : null,
      newestItem: entries.length > 0 ? Math.max(...entries.map(([key, item]) => item.timestamp)) : null,
      cacheSize: JSON.stringify(this.cache).length,
      maxSize: CACHE_MAX_SIZE,
      defaultTTL: CACHE_TTL
    };
  }

  // Get all cached data for search indexing
  getAllData() {
    const allData = [];
    
    Object.entries(this.cache).forEach(([key, item]) => {
      if (!this.isExpired(item.timestamp, item.ttl)) {
        allData.push({
          cacheKey: key,
          data: item.data,
          timestamp: item.timestamp,
          source: item.source
        });
      }
    });
    
    return allData;
  }

  // Force refresh specific cache entry
  async refresh(key, fetcher) {
    try {
      const data = await fetcher();
      this.set(key, data);
      return data;
    } catch (error) {
      console.error('Error refreshing cache:', error);
      throw error;
    }
  }
}

export default new CacheManager();
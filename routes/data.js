import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import apiClient from '../api/apiClient.js';
import cacheManager from '../api/cacheManager.js';
import searchEngine from '../search/searchEngine.js';
import { updateUser } from '../auth/auth.js';

const router = express.Router();

// Middleware to track API usage
const trackUsage = (req, res, next) => {
  if (req.user) {
    // Increment user's search count
    const updatedUser = updateUser(req.user.id, {
      searchesUsed: (req.user.searchesUsed || 0) + 1,
      lastSearchAt: new Date().toISOString()
    });
    
    // Check if user has exceeded their limit
    if (updatedUser.searchesUsed > updatedUser.searchLimit) {
      return res.status(429).json({
        error: 'Search limit exceeded',
        message: `You have reached your limit of ${updatedUser.searchLimit} searches. Please upgrade your plan.`,
        searchesUsed: updatedUser.searchesUsed,
        searchLimit: updatedUser.searchLimit,
        plan: updatedUser.plan
      });
    }
    
    req.user = updatedUser;
  }
  
  next();
};

// Get cached data (public endpoint with rate limiting)
router.get('/', async (req, res) => {
  try {
    const { type, ...params } = req.query;
    
    let data;
    
    switch (type) {
      case 'crime':
        data = await apiClient.fetchCrimeData(params);
        break;
      case 'planning':
        data = await apiClient.fetchPlanningData(params);
        break;
      case 'spending':
        data = await apiClient.fetchCouncilSpending(params);
        break;
      case 'postcode':
        if (!params.postcode) {
          return res.status(400).json({ error: 'Postcode parameter is required' });
        }
        data = await apiClient.fetchPostcodeData(params.postcode);
        break;
      default:
        return res.status(400).json({ 
          error: 'Invalid data type',
          validTypes: ['crime', 'planning', 'spending', 'postcode']
        });
    }
    
    res.json({
      data,
      type,
      cached: true,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Data fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch data',
      message: error.message
    });
  }
});

// Enhanced data endpoint for authenticated users
router.get('/enhanced', authenticateToken, trackUsage, async (req, res) => {
  try {
    const { type, format = 'json', ...params } = req.query;
    
    let data;
    
    switch (type) {
      case 'crime':
        data = await apiClient.fetchCrimeData(params);
        break;
      case 'planning':
        data = await apiClient.fetchPlanningData(params);
        break;
      case 'spending':
        data = await apiClient.fetchCouncilSpending(params);
        break;
      case 'postcode':
        if (!params.postcode) {
          return res.status(400).json({ error: 'Postcode parameter is required' });
        }
        data = await apiClient.fetchPostcodeData(params.postcode);
        break;
      default:
        return res.status(400).json({ 
          error: 'Invalid data type',
          validTypes: ['crime', 'planning', 'spending', 'postcode']
        });
    }
    
    // Enhanced response with user context
    const response = {
      data,
      type,
      cached: true,
      timestamp: new Date().toISOString(),
      user: {
        searchesUsed: req.user.searchesUsed,
        searchLimit: req.user.searchLimit,
        plan: req.user.plan
      },
      metadata: {
        totalResults: Array.isArray(data) ? data.length : 1,
        query: params
      }
    };
    
    // Format response based on requested format
    if (format === 'csv' && Array.isArray(data)) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-data.csv"`);
      const csv = convertToCSV(data, type);
      return res.send(csv);
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('Enhanced data fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch enhanced data',
      message: error.message
    });
  }
});

// Force refresh cache endpoint (authenticated users only)
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const { type, ...params } = req.body;
    
    let data;
    const cacheKey = cacheManager.generateKey(`refresh-${type}`, params);
    
    switch (type) {
      case 'crime':
        data = await apiClient.refreshCache('https://data.police.uk/api/crimes-street/all-crime', params);
        break;
      case 'planning':
        data = await apiClient.refreshCache('https://www.planning.data.gov.uk/entity', params);
        break;
      case 'spending':
        data = await apiClient.refreshCache('https://opendata.bristol.gov.uk/api/records/1.0/search/', params);
        break;
      default:
        return res.status(400).json({ 
          error: 'Invalid data type for refresh',
          validTypes: ['crime', 'planning', 'spending']
        });
    }
    
    // Rebuild search index after refresh
    searchEngine.rebuildIndex();
    
    res.json({
      message: 'Cache refreshed successfully',
      type,
      timestamp: new Date().toISOString(),
      dataCount: Array.isArray(data) ? data.length : 1
    });
    
  } catch (error) {
    console.error('Cache refresh error:', error);
    res.status(500).json({
      error: 'Failed to refresh cache',
      message: error.message
    });
  }
});

// Get cache status and statistics
router.get('/cache/status', async (req, res) => {
  try {
    const cacheStats = apiClient.getCacheStats();
    const searchStats = searchEngine.getStats();
    
    res.json({
      cache: cacheStats,
      search: searchStats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Cache status error:', error);
    res.status(500).json({
      error: 'Failed to get cache status',
      message: error.message
    });
  }
});

// Proxy endpoint for external APIs (authenticated users)
router.get('/proxy/*', authenticateToken, trackUsage, async (req, res) => {
  try {
    const url = req.params[0];
    const options = {
      params: req.query,
      cacheTTL: parseInt(req.query.cacheTTL) || 3600
    };
    
    const data = await apiClient.proxyRequest(url, options);
    
    res.json({
      data,
      url,
      cached: true,
      timestamp: new Date().toISOString(),
      user: {
        searchesUsed: req.user.searchesUsed,
        searchLimit: req.user.searchLimit
      }
    });
    
  } catch (error) {
    console.error('Proxy request error:', error);
    res.status(500).json({
      error: 'Proxy request failed',
      message: error.message
    });
  }
});

// Helper function to convert data to CSV
function convertToCSV(data, type) {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }
  
  try {
    let headers = [];
    let rows = [];
    
    switch (type) {
      case 'crime':
        headers = ['Category', 'Location', 'Street', 'Date', 'Latitude', 'Longitude'];
        rows = data.map(crime => [
          crime.category || '',
          crime.location_type || '',
          crime.location?.street?.name || '',
          crime.month || '',
          crime.location?.latitude || '',
          crime.location?.longitude || ''
        ]);
        break;
        
      case 'planning':
        headers = ['Name', 'Description', 'Status', 'Type', 'Date'];
        rows = data.map(planning => [
          planning.name || '',
          planning.description || '',
          planning.status || '',
          planning.development_type || '',
          planning.start_date || ''
        ]);
        break;
        
      case 'spending':
        if (data.records) {
          const firstRecord = data.records[0]?.fields || {};
          headers = Object.keys(firstRecord);
          rows = data.records.map(record => 
            headers.map(header => record.fields[header] || '')
          );
        }
        break;
        
      default:
        // Generic CSV conversion
        const firstItem = data[0];
        headers = Object.keys(firstItem);
        rows = data.map(item => headers.map(header => item[header] || ''));
        break;
    }
    
    // Escape CSV values
    const escapeCsvValue = (value) => {
      const stringValue = String(value || '');
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };
    
    // Build CSV
    const csvHeaders = headers.map(escapeCsvValue).join(',');
    const csvRows = rows.map(row => row.map(escapeCsvValue).join(','));
    
    return [csvHeaders, ...csvRows].join('\n');
    
  } catch (error) {
    console.error('CSV conversion error:', error);
    return '';
  }
}

export default router;
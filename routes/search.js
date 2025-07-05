import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import searchEngine from '../search/searchEngine.js';
import { updateUser } from '../auth/auth.js';

const router = express.Router();

// Middleware to track search usage
const trackSearchUsage = (req, res, next) => {
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

// Main search endpoint (public with rate limiting)
router.get('/', async (req, res) => {
  try {
    const {
      q: query,
      type = null,
      limit = 20,
      offset = 0,
      sort = 'relevance',
      snippets = true
    } = req.query;
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        error: 'Query parameter "q" is required',
        example: '/api/search?q=crime+london'
      });
    }
    
    const options = {
      limit: Math.min(parseInt(limit), 100), // Max 100 results
      offset: parseInt(offset) || 0,
      type: type || null,
      sortBy: sort,
      includeSnippets: snippets === 'true'
    };
    
    const results = searchEngine.search(query.trim(), options);
    
    // Public response (limited)
    const response = {
      results: results.results.map(result => ({
        id: result.id,
        type: result.type,
        score: Math.round(result.score * 100) / 100,
        snippet: result.snippet ? result.snippet.substring(0, 200) : null,
        highlights: result.highlights
      })),
      pagination: {
        total: results.total,
        limit: options.limit,
        offset: options.offset,
        hasMore: results.total > (options.offset + options.limit)
      },
      meta: {
        query: results.query,
        tokens: results.tokens,
        took: results.took,
        type: type || 'all'
      }
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
});

// Enhanced search endpoint for authenticated users
router.get('/enhanced', authenticateToken, trackSearchUsage, async (req, res) => {
  try {
    const {
      q: query,
      type = null,
      limit = 50,
      offset = 0,
      sort = 'relevance',
      snippets = true,
      format = 'json'
    } = req.query;
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        error: 'Query parameter "q" is required',
        example: '/api/search/enhanced?q=crime+london'
      });
    }
    
    const options = {
      limit: Math.min(parseInt(limit), 200), // Higher limit for authenticated users
      offset: parseInt(offset) || 0,
      type: type || null,
      sortBy: sort,
      includeSnippets: snippets === 'true'
    };
    
    const results = searchEngine.search(query.trim(), options);
    
    // Enhanced response with full data access
    const response = {
      results: results.results.map(result => ({
        id: result.id,
        type: result.type,
        score: result.score,
        data: result.data, // Full data access for authenticated users
        snippet: result.snippet,
        highlights: result.highlights
      })),
      pagination: {
        total: results.total,
        limit: options.limit,
        offset: options.offset,
        hasMore: results.total > (options.offset + options.limit)
      },
      meta: {
        query: results.query,
        tokens: results.tokens,
        took: results.took,
        type: type || 'all'
      },
      user: {
        searchesUsed: req.user.searchesUsed,
        searchLimit: req.user.searchLimit,
        plan: req.user.plan,
        remainingSearches: req.user.searchLimit - req.user.searchesUsed
      }
    };
    
    // Handle different output formats
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="search-results-${Date.now()}.csv"`);
      const csv = convertSearchResultsToCSV(results.results);
      return res.send(csv);
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('Enhanced search error:', error);
    res.status(500).json({
      error: 'Enhanced search failed',
      message: error.message
    });
  }
});

// Get search suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const { q: query, limit = 5 } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Query parameter "q" is required',
        example: '/api/search/suggestions?q=cri'
      });
    }
    
    const suggestions = searchEngine.getSuggestions(query, parseInt(limit));
    
    res.json({
      query,
      suggestions: suggestions.map(suggestion => ({
        term: suggestion.term,
        count: suggestion.count
      })),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Search suggestions error:', error);
    res.status(500).json({
      error: 'Failed to get search suggestions',
      message: error.message
    });
  }
});

// Rebuild search index (admin only)
router.post('/index/rebuild', authenticateToken, async (req, res) => {
  try {
    // Check if user has admin privileges (you might want to implement role-based access)
    if (req.user.plan !== 'enterprise') {
      return res.status(403).json({
        error: 'Insufficient privileges',
        message: 'Index rebuild requires enterprise plan'
      });
    }
    
    searchEngine.rebuildIndex();
    
    res.json({
      message: 'Search index rebuild initiated',
      timestamp: new Date().toISOString(),
      stats: searchEngine.getStats()
    });
    
  } catch (error) {
    console.error('Index rebuild error:', error);
    res.status(500).json({
      error: 'Failed to rebuild search index',
      message: error.message
    });
  }
});

// Get search statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = searchEngine.getStats();
    
    res.json({
      stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Search stats error:', error);
    res.status(500).json({
      error: 'Failed to get search statistics',
      message: error.message
    });
  }
});

// Search by category/type
router.get('/category/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const validTypes = ['crime', 'planning', 'spending'];
    
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: 'Invalid category type',
        validTypes
      });
    }
    
    const {
      q: query = '',
      limit = 20,
      offset = 0
    } = req.query;
    
    const options = {
      limit: Math.min(parseInt(limit), 100),
      offset: parseInt(offset) || 0,
      type,
      includeSnippets: true
    };
    
    const results = searchEngine.search(query || '*', options);
    
    res.json({
      results: results.results.map(result => ({
        id: result.id,
        type: result.type,
        score: Math.round(result.score * 100) / 100,
        snippet: result.snippet,
        highlights: result.highlights
      })),
      category: type,
      pagination: {
        total: results.total,
        limit: options.limit,
        offset: options.offset,
        hasMore: results.total > (options.offset + options.limit)
      },
      meta: {
        query: results.query,
        took: results.took
      }
    });
    
  } catch (error) {
    console.error('Category search error:', error);
    res.status(500).json({
      error: 'Category search failed',
      message: error.message
    });
  }
});

// Helper function to convert search results to CSV
function convertSearchResultsToCSV(results) {
  if (!Array.isArray(results) || results.length === 0) {
    return 'No results found';
  }
  
  try {
    const headers = ['Type', 'Score', 'ID', 'Snippet'];
    const rows = results.map(result => [
      result.type || '',
      result.score || 0,
      result.id || '',
      (result.snippet || '').replace(/"/g, '""').replace(/\n/g, ' ')
    ]);
    
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
    return 'Error converting results to CSV';
  }
}

export default router;
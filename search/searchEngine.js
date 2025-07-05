import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cacheManager from '../api/cacheManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SEARCH_INDEX_FILE = join(__dirname, '../data/search-index.json');

class SearchEngine {
  constructor() {
    this.index = this.loadIndex();
    this.stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
      'did', 'will', 'would', 'should', 'could', 'can', 'may', 'might', 'must', 'shall'
    ]);
  }

  loadIndex() {
    if (!existsSync(SEARCH_INDEX_FILE)) {
      writeFileSync(SEARCH_INDEX_FILE, JSON.stringify({}, null, 2));
      return {};
    }
    
    try {
      const data = readFileSync(SEARCH_INDEX_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading search index:', error);
      return {};
    }
  }

  saveIndex() {
    try {
      writeFileSync(SEARCH_INDEX_FILE, JSON.stringify(this.index, null, 2));
    } catch (error) {
      console.error('Error saving search index:', error);
    }
  }

  // Tokenize text into words
  tokenize(text) {
    if (!text || typeof text !== 'string') return [];
    
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ') // Replace punctuation with spaces
      .split(/\s+/)
      .filter(word => word.length > 2 && !this.stopWords.has(word));
  }

  // Calculate TF-IDF score
  calculateTFIDF(term, document, corpus) {
    const termFreq = this.getTermFrequency(term, document);
    const docFreq = this.getDocumentFrequency(term, corpus);
    
    if (termFreq === 0 || docFreq === 0) return 0;
    
    const tf = termFreq / document.length;
    const idf = Math.log(corpus.length / docFreq);
    
    return tf * idf;
  }

  getTermFrequency(term, document) {
    return document.filter(word => word === term).length;
  }

  getDocumentFrequency(term, corpus) {
    return corpus.filter(doc => doc.includes(term)).length;
  }

  // Extract searchable text from different data types
  extractSearchableText(data, type) {
    const texts = [];
    
    if (!data || typeof data !== 'object') return texts;
    
    try {
      switch (type) {
        case 'crime':
          if (Array.isArray(data)) {
            data.forEach(crime => {
              texts.push(crime.category || '');
              texts.push(crime.location?.street?.name || '');
              texts.push(crime.location_type || '');
              texts.push(crime.context || '');
            });
          }
          break;
          
        case 'planning':
          if (Array.isArray(data)) {
            data.forEach(planning => {
              texts.push(planning.name || '');
              texts.push(planning.description || '');
              texts.push(planning.development_type || '');
              texts.push(planning.status || '');
            });
          }
          break;
          
        case 'spending':
          if (data.records && Array.isArray(data.records)) {
            data.records.forEach(record => {
              const fields = record.fields || {};
              texts.push(fields.supplier_name || '');
              texts.push(fields.description || '');
              texts.push(fields.service_area || '');
              texts.push(fields.expense_type || '');
            });
          }
          break;
          
        default:
          // Generic text extraction for unknown types
          this.extractTextFromObject(data, texts);
          break;
      }
    } catch (error) {
      console.error('Error extracting searchable text:', error);
    }
    
    return texts.filter(text => text && text.trim().length > 0);
  }

  extractTextFromObject(obj, texts) {
    if (typeof obj === 'string') {
      texts.push(obj);
    } else if (Array.isArray(obj)) {
      obj.forEach(item => this.extractTextFromObject(item, texts));
    } else if (obj && typeof obj === 'object') {
      Object.values(obj).forEach(value => this.extractTextFromObject(value, texts));
    }
  }

  // Build search index from cached data
  buildIndex() {
    console.log('Building search index...');
    
    const cachedData = cacheManager.getAllData();
    const newIndex = {};
    
    cachedData.forEach(item => {
      const { cacheKey, data } = item;
      
      // Determine data type from cache key
      let dataType = 'generic';
      if (cacheKey.includes('crime')) dataType = 'crime';
      else if (cacheKey.includes('planning')) dataType = 'planning';
      else if (cacheKey.includes('spending')) dataType = 'spending';
      
      // Extract searchable text
      const searchableTexts = this.extractSearchableText(data, dataType);
      const allText = searchableTexts.join(' ');
      const tokens = this.tokenize(allText);
      
      // Add to index
      tokens.forEach(token => {
        if (!newIndex[token]) {
          newIndex[token] = [];
        }
        
        const existingEntry = newIndex[token].find(entry => entry.docId === cacheKey);
        if (existingEntry) {
          existingEntry.count++;
        } else {
          newIndex[token].push({
            docId: cacheKey,
            count: 1,
            type: dataType,
            fields: this.getFieldsContainingTerm(token, data, dataType)
          });
        }
      });
    });
    
    this.index = newIndex;
    this.saveIndex();
    
    console.log(`Search index built with ${Object.keys(newIndex).length} terms`);
  }

  getFieldsContainingTerm(term, data, type) {
    const fields = [];
    
    // This is a simplified version - in a real implementation,
    // you'd want to track which specific fields contain the term
    // for better relevance scoring
    
    return fields;
  }

  // Search the index
  search(query, options = {}) {
    const {
      limit = 20,
      offset = 0,
      type = null,
      sortBy = 'relevance',
      includeSnippets = true
    } = options;
    
    if (!query || typeof query !== 'string') {
      return {
        results: [],
        total: 0,
        query: query || '',
        took: 0
      };
    }
    
    const startTime = Date.now();
    const tokens = this.tokenize(query);
    
    if (tokens.length === 0) {
      return {
        results: [],
        total: 0,
        query,
        took: Date.now() - startTime
      };
    }
    
    // Find matching documents
    const docScores = new Map();
    const cachedData = cacheManager.getAllData();
    
    tokens.forEach(token => {
      const matches = this.index[token] || [];
      
      matches.forEach(match => {
        if (type && match.type !== type) return;
        
        const currentScore = docScores.get(match.docId) || 0;
        const tokenScore = this.calculateTokenScore(token, match, cachedData);
        
        docScores.set(match.docId, currentScore + tokenScore);
      });
    });
    
    // Sort by score and get results
    const sortedResults = Array.from(docScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(offset, offset + limit);
    
    // Format results
    const results = sortedResults.map(([docId, score]) => {
      const cachedItem = cachedData.find(item => item.cacheKey === docId);
      
      return {
        id: docId,
        score: score,
        data: cachedItem ? cachedItem.data : null,
        type: this.getDocumentType(docId),
        snippet: includeSnippets ? this.generateSnippet(cachedItem?.data, tokens) : null,
        highlights: this.generateHighlights(cachedItem?.data, tokens)
      };
    });
    
    return {
      results,
      total: docScores.size,
      query,
      took: Date.now() - startTime,
      tokens: tokens
    };
  }

  calculateTokenScore(token, match, cachedData) {
    // Simple scoring based on term frequency
    // In a real implementation, you'd want TF-IDF scoring
    let score = match.count;
    
    // Boost score for title/name fields
    if (match.fields && match.fields.includes('title')) {
      score *= 3;
    } else if (match.fields && match.fields.includes('name')) {
      score *= 2;
    }
    
    return score;
  }

  getDocumentType(docId) {
    if (docId.includes('crime')) return 'crime';
    if (docId.includes('planning')) return 'planning';
    if (docId.includes('spending')) return 'spending';
    return 'generic';
  }

  generateSnippet(data, tokens, maxLength = 200) {
    if (!data) return null;
    
    // Simple snippet generation - find first occurrence of any token
    const text = JSON.stringify(data).toLowerCase();
    const firstToken = tokens.find(token => text.includes(token));
    
    if (!firstToken) return null;
    
    const index = text.indexOf(firstToken);
    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + maxLength);
    
    return text.substring(start, end) + (end < text.length ? '...' : '');
  }

  generateHighlights(data, tokens) {
    if (!data) return [];
    
    const highlights = [];
    const text = JSON.stringify(data).toLowerCase();
    
    tokens.forEach(token => {
      const regex = new RegExp(`\\b${token}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        highlights.push({
          term: token,
          count: matches.length
        });
      }
    });
    
    return highlights;
  }

  // Get search suggestions
  getSuggestions(query, limit = 5) {
    if (!query || query.length < 2) return [];
    
    const tokens = this.tokenize(query);
    const lastToken = tokens[tokens.length - 1] || query.toLowerCase();
    
    const suggestions = Object.keys(this.index)
      .filter(term => term.startsWith(lastToken))
      .slice(0, limit)
      .map(term => ({
        term,
        count: this.index[term].length
      }));
    
    return suggestions;
  }

  // Get index statistics
  getStats() {
    const stats = {
      totalTerms: Object.keys(this.index).length,
      totalDocuments: new Set(
        Object.values(this.index).flat().map(item => item.docId)
      ).size,
      indexSize: JSON.stringify(this.index).length,
      lastBuilt: this.lastBuilt || null
    };
    
    return stats;
  }

  // Clear the index
  clearIndex() {
    this.index = {};
    this.saveIndex();
  }

  // Rebuild index (public method)
  rebuildIndex() {
    this.clearIndex();
    this.buildIndex();
    this.lastBuilt = new Date().toISOString();
  }
}

export default new SearchEngine();
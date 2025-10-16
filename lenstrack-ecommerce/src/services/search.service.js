const { MeiliSearch } = require('meilisearch');
const winston = require('winston');

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/search.log' })
  ]
});

class SearchService {
  constructor() {
    this.client = null;
    this.isInitialized = false;
    this.indexes = {
      products: 'products',
      pages: 'pages',
      stores: 'stores',
      categories: 'categories',
      users: 'users'
    };
  }

  /**
   * Initialize search service
   */
  async initialize() {
    try {
      this.client = new MeiliSearch({
        host: process.env.MEILISEARCH_URL || 'http://localhost:7700',
        apiKey: process.env.MEILISEARCH_API_KEY || 'masterKey'
      });

      // Create indexes
      await this.createIndexes();

      // Setup index settings
      await this.setupIndexSettings();

      this.isInitialized = true;
      logger.info('Search service initialized successfully');

    } catch (error) {
      logger.warn('Search service initialization failed, continuing without search:', error.message);
      this.isInitialized = false;
      // Don't throw error, just log warning and continue
    }
  }

  /**
   * Create search indexes
   */
  async createIndexes() {
    try {
      for (const [name, uid] of Object.entries(this.indexes)) {
        try {
          await this.client.createIndex(uid);
          logger.info(`Index created: ${name} (${uid})`);
        } catch (error) {
          if (error.code !== 'index_already_exists') {
            throw error;
          }
          logger.info(`Index already exists: ${name} (${uid})`);
        }
      }
    } catch (error) {
      logger.error('Failed to create indexes:', error);
      throw error;
    }
  }

  /**
   * Setup index settings
   */
  async setupIndexSettings() {
    try {
      // Products index settings
      await this.client.index(this.indexes.products).updateSettings({
        searchableAttributes: [
          'name',
          'description',
          'tags',
          'brand',
          'category',
          'sku'
        ],
        filterableAttributes: [
          'category',
          'brand',
          'price',
          'status',
          'featured',
          'tags'
        ],
        sortableAttributes: [
          'price',
          'createdAt',
          'updatedAt',
          'views',
          'sales'
        ],
        rankingRules: [
          'words',
          'typo',
          'proximity',
          'attribute',
          'sort',
          'exactness'
        ],
        stopWords: ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']
      });

      // Pages index settings
      await this.client.index(this.indexes.pages).updateSettings({
        searchableAttributes: [
          'title',
          'description',
          'content',
          'seo.metaDescription',
          'seo.keywords'
        ],
        filterableAttributes: [
          'type',
          'status',
          'featured',
          'publishedAt'
        ],
        sortableAttributes: [
          'publishedAt',
          'createdAt',
          'updatedAt',
          'views'
        ]
      });

      // Stores index settings
      await this.client.index(this.indexes.stores).updateSettings({
        searchableAttributes: [
          'name',
          'description',
          'address.city',
          'address.state',
          'services'
        ],
        filterableAttributes: [
          'status',
          'featured',
          'address.city',
          'address.state',
          'services'
        ],
        sortableAttributes: [
          'name',
          'rating.average',
          'createdAt'
        ]
      });

      // Categories index settings
      await this.client.index(this.indexes.categories).updateSettings({
        searchableAttributes: [
          'name',
          'description',
          'seo.metaDescription'
        ],
        filterableAttributes: [
          'parent',
          'level',
          'status',
          'featured'
        ],
        sortableAttributes: [
          'name',
          'level',
          'sortOrder',
          'productCount'
        ]
      });

      logger.info('Index settings configured successfully');

    } catch (error) {
      logger.error('Failed to setup index settings:', error);
      throw error;
    }
  }

  /**
   * Index document
   */
  async indexDocument(indexName, document) {
    try {
      if (!this.indexes[indexName]) {
        throw new Error(`Index ${indexName} not found`);
      }

      const index = this.client.index(this.indexes[indexName]);
      const result = await index.addDocuments([document]);

      logger.info('Document indexed', {
        index: indexName,
        documentId: document.id,
        taskId: result.taskUid
      });

      return result;
    } catch (error) {
      logger.error('Failed to index document:', error);
      throw error;
    }
  }

  /**
   * Index multiple documents
   */
  async indexDocuments(indexName, documents) {
    try {
      if (!this.indexes[indexName]) {
        throw new Error(`Index ${indexName} not found`);
      }

      const index = this.client.index(this.indexes[indexName]);
      const result = await index.addDocuments(documents);

      logger.info('Documents indexed', {
        index: indexName,
        count: documents.length,
        taskId: result.taskUid
      });

      return result;
    } catch (error) {
      logger.error('Failed to index documents:', error);
      throw error;
    }
  }

  /**
   * Update document
   */
  async updateDocument(indexName, document) {
    try {
      if (!this.indexes[indexName]) {
        throw new Error(`Index ${indexName} not found`);
      }

      const index = this.client.index(this.indexes[indexName]);
      const result = await index.updateDocuments([document]);

      logger.info('Document updated', {
        index: indexName,
        documentId: document.id,
        taskId: result.taskUid
      });

      return result;
    } catch (error) {
      logger.error('Failed to update document:', error);
      throw error;
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(indexName, documentId) {
    try {
      if (!this.indexes[indexName]) {
        throw new Error(`Index ${indexName} not found`);
      }

      const index = this.client.index(this.indexes[indexName]);
      const result = await index.deleteDocument(documentId);

      logger.info('Document deleted', {
        index: indexName,
        documentId,
        taskId: result.taskUid
      });

      return result;
    } catch (error) {
      logger.error('Failed to delete document:', error);
      throw error;
    }
  }

  /**
   * Search documents
   */
  async search(indexName, query, options = {}) {
    try {
      if (!this.indexes[indexName]) {
        throw new Error(`Index ${indexName} not found`);
      }

      const index = this.client.index(this.indexes[indexName]);
      const result = await index.search(query, {
        limit: 20,
        offset: 0,
        attributesToRetrieve: ['*'],
        attributesToHighlight: ['*'],
        ...options
      });

      logger.info('Search performed', {
        index: indexName,
        query,
        hits: result.hits.length,
        processingTime: result.processingTimeMs
      });

      return result;
    } catch (error) {
      logger.error('Search failed:', error);
      throw error;
    }
  }

  /**
   * Search products
   */
  async searchProducts(query, filters = {}, options = {}) {
    try {
      const searchOptions = {
        limit: options.limit || 20,
        offset: options.offset || 0,
        sort: options.sort || ['price:asc'],
        filter: this.buildFilterString(filters),
        facets: ['category', 'brand', 'price'],
        ...options
      };

      return await this.search('products', query, searchOptions);
    } catch (error) {
      logger.error('Product search failed:', error);
      throw error;
    }
  }

  /**
   * Search pages
   */
  async searchPages(query, filters = {}, options = {}) {
    try {
      const searchOptions = {
        limit: options.limit || 10,
        offset: options.offset || 0,
        sort: options.sort || ['publishedAt:desc'],
        filter: this.buildFilterString(filters),
        ...options
      };

      return await this.search('pages', query, searchOptions);
    } catch (error) {
      logger.error('Page search failed:', error);
      throw error;
    }
  }

  /**
   * Search stores
   */
  async searchStores(query, filters = {}, options = {}) {
    try {
      const searchOptions = {
        limit: options.limit || 10,
        offset: options.offset || 0,
        sort: options.sort || ['rating.average:desc'],
        filter: this.buildFilterString(filters),
        ...options
      };

      return await this.search('stores', query, searchOptions);
    } catch (error) {
      logger.error('Store search failed:', error);
      throw error;
    }
  }

  /**
   * Build filter string
   */
  buildFilterString(filters) {
    const filterParts = [];

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          filterParts.push(`${key} IN [${value.join(', ')}]`);
        } else if (typeof value === 'object' && value.min !== undefined && value.max !== undefined) {
          filterParts.push(`${key} ${value.min} TO ${value.max}`);
        } else {
          filterParts.push(`${key} = ${value}`);
        }
      }
    });

    return filterParts.join(' AND ');
  }

  /**
   * Get search suggestions
   */
  async getSuggestions(indexName, query, limit = 5) {
    try {
      if (!this.indexes[indexName]) {
        throw new Error(`Index ${indexName} not found`);
      }

      const index = this.client.index(this.indexes[indexName]);
      const result = await index.search(query, {
        limit,
        attributesToRetrieve: ['name', 'title'],
        attributesToHighlight: ['name', 'title']
      });

      return result.hits.map(hit => ({
        id: hit.id,
        text: hit.name || hit.title,
        highlighted: hit._formatted?.name || hit._formatted?.title
      }));
    } catch (error) {
      logger.error('Failed to get suggestions:', error);
      throw error;
    }
  }

  /**
   * Get search analytics
   */
  async getSearchAnalytics(indexName, timeRange = '7d') {
    try {
      // This would implement search analytics logic
      // For now, return mock data
      return {
        totalSearches: 0,
        popularQueries: [],
        noResultsQueries: [],
        timeRange
      };
    } catch (error) {
      logger.error('Failed to get search analytics:', error);
      throw error;
    }
  }

  /**
   * Reindex all documents
   */
  async reindexAll(indexName) {
    try {
      if (!this.indexes[indexName]) {
        throw new Error(`Index ${indexName} not found`);
      }

      // This would implement reindexing logic based on the index type
      logger.info('Reindexing started', { index: indexName });
      
      // For now, just log it
      return { message: 'Reindexing started' };
    } catch (error) {
      logger.error('Failed to reindex:', error);
      throw error;
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(indexName) {
    try {
      if (!this.indexes[indexName]) {
        throw new Error(`Index ${indexName} not found`);
      }

      const index = this.client.index(this.indexes[indexName]);
      const stats = await index.getStats();

      return stats;
    } catch (error) {
      logger.error('Failed to get index stats:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const health = await this.client.health();
      
      return {
        status: health.status === 'available' ? 'healthy' : 'unhealthy',
        isInitialized: this.isInitialized,
        indexes: Object.keys(this.indexes),
        meilisearchStatus: health.status
      };
    } catch (error) {
      logger.error('Search health check failed:', error);
      return {
        status: 'unhealthy',
        isInitialized: this.isInitialized,
        error: error.message
      };
    }
  }

  /**
   * Close connection
   */
  async close() {
    try {
      // MeiliSearch client doesn't need explicit closing
      this.isInitialized = false;
      logger.info('Search service closed');
    } catch (error) {
      logger.error('Failed to close search service:', error);
      throw error;
    }
  }
}

module.exports = SearchService;

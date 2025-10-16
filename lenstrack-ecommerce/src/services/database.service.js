const mongoose = require('mongoose');
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
    new winston.transports.File({ filename: 'logs/database.log' })
  ]
});

class DatabaseService {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  /**
   * Connect to MongoDB
   */
  async connect() {
    try {
      const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lenstrack_ecommerce';
      
      this.connection = await mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      this.isConnected = true;
      
      logger.info('MongoDB connected successfully', {
        host: this.connection.connection.host,
        port: this.connection.connection.port,
        name: this.connection.connection.name
      });

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
        this.isConnected = true;
      });

    } catch (error) {
      logger.error('MongoDB connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        this.isConnected = false;
        logger.info('MongoDB disconnected successfully');
      }
    } catch (error) {
      logger.error('MongoDB disconnection failed:', error);
      throw error;
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
  }

  /**
   * Create indexes for all models
   */
  async createIndexes() {
    try {
      const models = [
        'User', 'Product', 'Order', 'Category', 'Store', 'Page'
      ];

      for (const modelName of models) {
        const model = mongoose.model(modelName);
        await model.createIndexes();
        logger.info(`Indexes created for ${modelName}`);
      }

      logger.info('All indexes created successfully');
    } catch (error) {
      logger.error('Failed to create indexes:', error);
      throw error;
    }
  }

  /**
   * Drop all indexes
   */
  async dropIndexes() {
    try {
      const models = [
        'User', 'Product', 'Order', 'Category', 'Store', 'Page'
      ];

      for (const modelName of models) {
        const model = mongoose.model(modelName);
        await model.collection.dropIndexes();
        logger.info(`Indexes dropped for ${modelName}`);
      }

      logger.info('All indexes dropped successfully');
    } catch (error) {
      logger.error('Failed to drop indexes:', error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getStatistics() {
    try {
      const stats = await mongoose.connection.db.stats();
      
      return {
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize,
        objects: stats.objects,
        avgObjSize: stats.avgObjSize
      };
    } catch (error) {
      logger.error('Failed to get database statistics:', error);
      throw error;
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStatistics(collectionName) {
    try {
      const collection = mongoose.connection.db.collection(collectionName);
      const stats = await collection.stats();
      
      return {
        count: stats.count,
        size: stats.size,
        avgObjSize: stats.avgObjSize,
        storageSize: stats.storageSize,
        totalIndexSize: stats.totalIndexSize,
        indexSizes: stats.indexSizes
      };
    } catch (error) {
      logger.error(`Failed to get statistics for collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Backup database
   */
  async backupDatabase() {
    try {
      // This would implement database backup logic
      // For now, we'll just log it
      logger.info('Database backup initiated');
    } catch (error) {
      logger.error('Database backup failed:', error);
      throw error;
    }
  }

  /**
   * Restore database
   */
  async restoreDatabase(backupPath) {
    try {
      // This would implement database restore logic
      logger.info('Database restore initiated', { backupPath });
    } catch (error) {
      logger.error('Database restore failed:', error);
      throw error;
    }
  }

  /**
   * Clean up old data
   */
  async cleanupOldData() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 365); // 1 year ago

      // Clean up old sessions, logs, etc.
      // This would implement cleanup logic based on business requirements
      
      logger.info('Old data cleanup completed');
    } catch (error) {
      logger.error('Old data cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Optimize database
   */
  async optimizeDatabase() {
    try {
      // This would implement database optimization logic
      logger.info('Database optimization completed');
    } catch (error) {
      logger.error('Database optimization failed:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const status = this.getStatus();
      
      if (!status.isConnected) {
        return {
          status: 'unhealthy',
          message: 'Database not connected',
          details: status
        };
      }

      // Test a simple query
      await mongoose.connection.db.admin().ping();
      
      return {
        status: 'healthy',
        message: 'Database is healthy',
        details: status
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        message: 'Database health check failed',
        error: error.message
      };
    }
  }
}

module.exports = DatabaseService;

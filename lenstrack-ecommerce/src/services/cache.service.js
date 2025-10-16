const Redis = require('redis');
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
    new winston.transports.File({ filename: 'logs/cache.log' })
  ]
});

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 3600; // 1 hour
  }

  /**
   * Initialize Redis connection
   */
  async initialize() {
    try {
      this.client = Redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      // Handle connection events
      this.client.on('connect', () => {
        logger.info('Redis connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        logger.info('Redis ready');
        this.isConnected = true;
      });

      this.client.on('error', (error) => {
        logger.error('Redis error:', error);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        logger.warn('Redis connection ended');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis reconnecting');
      });

      await this.client.connect();
      
    } catch (error) {
      logger.error('Redis connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Ping Redis server
   */
  async ping() {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis ping failed:', error);
      return false;
    }
  }

  /**
   * Set a key-value pair with TTL
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      const serializedValue = JSON.stringify(value);
      await this.client.setEx(key, ttl, serializedValue);
      logger.debug('Cache set', { key, ttl });
    } catch (error) {
      logger.error('Cache set failed:', error);
      throw error;
    }
  }

  /**
   * Get a value by key
   */
  async get(key) {
    try {
      const value = await this.client.get(key);
      if (value) {
        logger.debug('Cache hit', { key });
        return JSON.parse(value);
      }
      logger.debug('Cache miss', { key });
      return null;
    } catch (error) {
      logger.error('Cache get failed:', error);
      throw error;
    }
  }

  /**
   * Delete a key
   */
  async del(key) {
    try {
      const result = await this.client.del(key);
      logger.debug('Cache delete', { key, deleted: result > 0 });
      return result > 0;
    } catch (error) {
      logger.error('Cache delete failed:', error);
      throw error;
    }
  }

  /**
   * Delete multiple keys
   */
  async delMultiple(keys) {
    try {
      if (keys.length === 0) return 0;
      const result = await this.client.del(keys);
      logger.debug('Cache delete multiple', { keys: keys.length, deleted: result });
      return result;
    } catch (error) {
      logger.error('Cache delete multiple failed:', error);
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists check failed:', error);
      throw error;
    }
  }

  /**
   * Set expiration for a key
   */
  async expire(key, ttl) {
    try {
      const result = await this.client.expire(key, ttl);
      logger.debug('Cache expire set', { key, ttl, success: result });
      return result;
    } catch (error) {
      logger.error('Cache expire failed:', error);
      throw error;
    }
  }

  /**
   * Get TTL for a key
   */
  async ttl(key) {
    try {
      const result = await this.client.ttl(key);
      return result;
    } catch (error) {
      logger.error('Cache TTL check failed:', error);
      throw error;
    }
  }

  /**
   * Increment a numeric value
   */
  async incr(key, increment = 1) {
    try {
      const result = await this.client.incrBy(key, increment);
      logger.debug('Cache increment', { key, increment, result });
      return result;
    } catch (error) {
      logger.error('Cache increment failed:', error);
      throw error;
    }
  }

  /**
   * Decrement a numeric value
   */
  async decr(key, decrement = 1) {
    try {
      const result = await this.client.decrBy(key, decrement);
      logger.debug('Cache decrement', { key, decrement, result });
      return result;
    } catch (error) {
      logger.error('Cache decrement failed:', error);
      throw error;
    }
  }

  /**
   * Get or set pattern (cache-aside)
   */
  async getOrSet(key, fetchFunction, ttl = this.defaultTTL) {
    try {
      let value = await this.get(key);
      
      if (value === null) {
        value = await fetchFunction();
        if (value !== null && value !== undefined) {
          await this.set(key, value, ttl);
        }
      }
      
      return value;
    } catch (error) {
      logger.error('Cache getOrSet failed:', error);
      throw error;
    }
  }

  /**
   * Set with stampede protection
   */
  async setWithStampedeProtection(key, fetchFunction, ttl = this.defaultTTL, lockTTL = 30) {
    try {
      const lockKey = `${key}:lock`;
      const lockValue = Date.now().toString();
      
      // Try to acquire lock
      const lockAcquired = await this.client.setNX(lockKey, lockValue);
      
      if (lockAcquired) {
        try {
          // Set lock expiration
          await this.expire(lockKey, lockTTL);
          
          // Fetch data
          const value = await fetchFunction();
          
          if (value !== null && value !== undefined) {
            await this.set(key, value, ttl);
          }
          
          return value;
        } finally {
          // Release lock
          await this.del(lockKey);
        }
      } else {
        // Wait for other process to finish
        await this.waitForLock(lockKey, 5000); // 5 second timeout
        
        // Try to get cached value
        return await this.get(key);
      }
    } catch (error) {
      logger.error('Cache setWithStampedeProtection failed:', error);
      throw error;
    }
  }

  /**
   * Wait for lock to be released
   */
  async waitForLock(lockKey, timeout = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const exists = await this.exists(lockKey);
      if (!exists) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return false;
  }

  /**
   * Get keys by pattern
   */
  async getKeys(pattern) {
    try {
      const keys = await this.client.keys(pattern);
      logger.debug('Cache keys retrieved', { pattern, count: keys.length });
      return keys;
    } catch (error) {
      logger.error('Cache keys retrieval failed:', error);
      throw error;
    }
  }

  /**
   * Flush all cache
   */
  async flushAll() {
    try {
      await this.client.flushAll();
      logger.info('Cache flushed');
    } catch (error) {
      logger.error('Cache flush failed:', error);
      throw error;
    }
  }

  /**
   * Flush database
   */
  async flushDB() {
    try {
      await this.client.flushDb();
      logger.info('Cache database flushed');
    } catch (error) {
      logger.error('Cache database flush failed:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      const info = await this.client.info('memory');
      const stats = await this.client.info('stats');
      
      return {
        memory: this.parseInfo(info),
        stats: this.parseInfo(stats)
      };
    } catch (error) {
      logger.error('Cache stats retrieval failed:', error);
      throw error;
    }
  }

  /**
   * Parse Redis info output
   */
  parseInfo(info) {
    const lines = info.split('\r\n');
    const result = {};
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = isNaN(value) ? value : Number(value);
      }
    }
    
    return result;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const isHealthy = await this.ping();
      
      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        isConnected: this.isConnected,
        message: isHealthy ? 'Cache is healthy' : 'Cache is not responding'
      };
    } catch (error) {
      logger.error('Cache health check failed:', error);
      return {
        status: 'unhealthy',
        isConnected: false,
        message: 'Cache health check failed',
        error: error.message
      };
    }
  }

  /**
   * Close connection
   */
  async close() {
    try {
      if (this.client) {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Redis connection closed');
      }
    } catch (error) {
      logger.error('Redis close failed:', error);
      throw error;
    }
  }
}

module.exports = CacheService;

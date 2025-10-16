const Queue = require('bull');
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
    new winston.transports.File({ filename: 'logs/queue.log' })
  ]
});

class QueueService {
  constructor() {
    this.queues = {};
    this.isInitialized = false;
  }

  /**
   * Initialize queue service
   */
  async initialize() {
    try {
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0
      };

      // Initialize queues
      this.queues = {
        // Email queues
        email: new Queue('email', { redis: redisConfig }),
        emailVerification: new Queue('email-verification', { redis: redisConfig }),
        passwordReset: new Queue('password-reset', { redis: redisConfig }),
        orderConfirmation: new Queue('order-confirmation', { redis: redisConfig }),
        orderShipped: new Queue('order-shipped', { redis: redisConfig }),
        
        // SMS queues
        sms: new Queue('sms', { redis: redisConfig }),
        smsVerification: new Queue('sms-verification', { redis: redisConfig }),
        
        // WhatsApp queues
        whatsapp: new Queue('whatsapp', { redis: redisConfig }),
        
        // Push notification queues
        push: new Queue('push', { redis: redisConfig }),
        
        // Search indexing queues
        searchIndex: new Queue('search-index', { redis: redisConfig }),
        
        // Analytics queues
        analytics: new Queue('analytics', { redis: redisConfig }),
        
        // Webhook queues
        webhooks: new Queue('webhooks', { redis: redisConfig }),
        
        // Image processing queues
        imageProcessing: new Queue('image-processing', { redis: redisConfig }),
        
        // Data sync queues
        dataSync: new Queue('data-sync', { redis: redisConfig }),
        
        // Cleanup queues
        cleanup: new Queue('cleanup', { redis: redisConfig })
      };

      // Setup queue event listeners
      this.setupQueueListeners();

      // Setup processors
      this.setupProcessors();

      this.isInitialized = true;
      logger.info('Queue service initialized successfully');

    } catch (error) {
      logger.error('Queue service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Setup queue event listeners
   */
  setupQueueListeners() {
    Object.keys(this.queues).forEach(queueName => {
      const queue = this.queues[queueName];

      queue.on('completed', (job, result) => {
        logger.info('Job completed', {
          queue: queueName,
          jobId: job.id,
          jobName: job.name,
          duration: Date.now() - job.timestamp
        });
      });

      queue.on('failed', (job, err) => {
        logger.error('Job failed', {
          queue: queueName,
          jobId: job.id,
          jobName: job.name,
          error: err.message,
          attempts: job.attemptsMade
        });
      });

      queue.on('stalled', (job) => {
        logger.warn('Job stalled', {
          queue: queueName,
          jobId: job.id,
          jobName: job.name
        });
      });

      queue.on('progress', (job, progress) => {
        logger.debug('Job progress', {
          queue: queueName,
          jobId: job.id,
          jobName: job.name,
          progress
        });
      });
    });
  }

  /**
   * Setup queue processors
   */
  setupProcessors() {
    // Email processors
    this.queues.email.process('send-email', this.processEmail);
    this.queues.emailVerification.process('send-verification', this.processEmailVerification);
    this.queues.passwordReset.process('send-reset', this.processPasswordReset);
    this.queues.orderConfirmation.process('send-confirmation', this.processOrderConfirmation);
    this.queues.orderShipped.process('send-shipped', this.processOrderShipped);

    // SMS processors
    this.queues.sms.process('send-sms', this.processSMS);
    this.queues.smsVerification.process('send-verification', this.processSMSVerification);

    // WhatsApp processors
    this.queues.whatsapp.process('send-message', this.processWhatsApp);

    // Push notification processors
    this.queues.push.process('send-notification', this.processPushNotification);

    // Search indexing processors
    this.queues.searchIndex.process('index-document', this.processSearchIndex);
    this.queues.searchIndex.process('remove-document', this.processSearchRemove);

    // Analytics processors
    this.queues.analytics.process('track-event', this.processAnalytics);

    // Webhook processors
    this.queues.webhooks.process('send-webhook', this.processWebhook);

    // Image processing processors
    this.queues.imageProcessing.process('resize-image', this.processImageResize);
    this.queues.imageProcessing.process('optimize-image', this.processImageOptimize);

    // Data sync processors
    this.queues.dataSync.process('sync-data', this.processDataSync);

    // Cleanup processors
    this.queues.cleanup.process('cleanup-logs', this.processCleanupLogs);
    this.queues.cleanup.process('cleanup-temp-files', this.processCleanupTempFiles);
  }

  /**
   * Add job to queue
   */
  async addJob(queueName, jobName, data, options = {}) {
    try {
      if (!this.queues[queueName]) {
        throw new Error(`Queue ${queueName} not found`);
      }

      const job = await this.queues[queueName].add(jobName, data, {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        ...options
      });

      logger.info('Job added to queue', {
        queue: queueName,
        jobName,
        jobId: job.id,
        data: JSON.stringify(data)
      });

      return job;
    } catch (error) {
      logger.error('Failed to add job to queue:', error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName) {
    try {
      if (!this.queues[queueName]) {
        throw new Error(`Queue ${queueName} not found`);
      }

      const queue = this.queues[queueName];
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length + completed.length + failed.length
      };
    } catch (error) {
      logger.error('Failed to get queue stats:', error);
      throw error;
    }
  }

  /**
   * Get all queue statistics
   */
  async getAllQueueStats() {
    try {
      const stats = {};
      
      for (const queueName of Object.keys(this.queues)) {
        stats[queueName] = await this.getQueueStats(queueName);
      }

      return stats;
    } catch (error) {
      logger.error('Failed to get all queue stats:', error);
      throw error;
    }
  }

  /**
   * Pause queue
   */
  async pauseQueue(queueName) {
    try {
      if (!this.queues[queueName]) {
        throw new Error(`Queue ${queueName} not found`);
      }

      await this.queues[queueName].pause();
      logger.info('Queue paused', { queue: queueName });
    } catch (error) {
      logger.error('Failed to pause queue:', error);
      throw error;
    }
  }

  /**
   * Resume queue
   */
  async resumeQueue(queueName) {
    try {
      if (!this.queues[queueName]) {
        throw new Error(`Queue ${queueName} not found`);
      }

      await this.queues[queueName].resume();
      logger.info('Queue resumed', { queue: queueName });
    } catch (error) {
      logger.error('Failed to resume queue:', error);
      throw error;
    }
  }

  /**
   * Clean queue
   */
  async cleanQueue(queueName, grace = 0) {
    try {
      if (!this.queues[queueName]) {
        throw new Error(`Queue ${queueName} not found`);
      }

      await this.queues[queueName].clean(grace);
      logger.info('Queue cleaned', { queue: queueName, grace });
    } catch (error) {
      logger.error('Failed to clean queue:', error);
      throw error;
    }
  }

  /**
   * Remove job
   */
  async removeJob(queueName, jobId) {
    try {
      if (!this.queues[queueName]) {
        throw new Error(`Queue ${queueName} not found`);
      }

      const job = await this.queues[queueName].getJob(jobId);
      if (job) {
        await job.remove();
        logger.info('Job removed', { queue: queueName, jobId });
      }
    } catch (error) {
      logger.error('Failed to remove job:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const stats = await this.getAllQueueStats();
      const totalJobs = Object.values(stats).reduce((sum, queueStats) => sum + queueStats.total, 0);
      
      return {
        status: 'healthy',
        isInitialized: this.isInitialized,
        totalQueues: Object.keys(this.queues).length,
        totalJobs,
        stats
      };
    } catch (error) {
      logger.error('Queue health check failed:', error);
      return {
        status: 'unhealthy',
        isInitialized: this.isInitialized,
        error: error.message
      };
    }
  }

  // Processor methods (these would be implemented based on business logic)
  async processEmail(job) {
    // Implement email sending logic
    logger.info('Processing email job', { jobId: job.id, data: job.data });
  }

  async processEmailVerification(job) {
    // Implement email verification logic
    logger.info('Processing email verification job', { jobId: job.id, data: job.data });
  }

  async processPasswordReset(job) {
    // Implement password reset email logic
    logger.info('Processing password reset job', { jobId: job.id, data: job.data });
  }

  async processOrderConfirmation(job) {
    // Implement order confirmation email logic
    logger.info('Processing order confirmation job', { jobId: job.id, data: job.data });
  }

  async processOrderShipped(job) {
    // Implement order shipped email logic
    logger.info('Processing order shipped job', { jobId: job.id, data: job.data });
  }

  async processSMS(job) {
    // Implement SMS sending logic
    logger.info('Processing SMS job', { jobId: job.id, data: job.data });
  }

  async processSMSVerification(job) {
    // Implement SMS verification logic
    logger.info('Processing SMS verification job', { jobId: job.id, data: job.data });
  }

  async processWhatsApp(job) {
    // Implement WhatsApp message logic
    logger.info('Processing WhatsApp job', { jobId: job.id, data: job.data });
  }

  async processPushNotification(job) {
    // Implement push notification logic
    logger.info('Processing push notification job', { jobId: job.id, data: job.data });
  }

  async processSearchIndex(job) {
    // Implement search indexing logic
    logger.info('Processing search index job', { jobId: job.id, data: job.data });
  }

  async processSearchRemove(job) {
    // Implement search removal logic
    logger.info('Processing search remove job', { jobId: job.id, data: job.data });
  }

  async processAnalytics(job) {
    // Implement analytics tracking logic
    logger.info('Processing analytics job', { jobId: job.id, data: job.data });
  }

  async processWebhook(job) {
    // Implement webhook sending logic
    logger.info('Processing webhook job', { jobId: job.id, data: job.data });
  }

  async processImageResize(job) {
    // Implement image resizing logic
    logger.info('Processing image resize job', { jobId: job.id, data: job.data });
  }

  async processImageOptimize(job) {
    // Implement image optimization logic
    logger.info('Processing image optimize job', { jobId: job.id, data: job.data });
  }

  async processDataSync(job) {
    // Implement data synchronization logic
    logger.info('Processing data sync job', { jobId: job.id, data: job.data });
  }

  async processCleanupLogs(job) {
    // Implement log cleanup logic
    logger.info('Processing cleanup logs job', { jobId: job.id, data: job.data });
  }

  async processCleanupTempFiles(job) {
    // Implement temp file cleanup logic
    logger.info('Processing cleanup temp files job', { jobId: job.id, data: job.data });
  }
}

module.exports = QueueService;

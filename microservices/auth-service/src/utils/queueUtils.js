const { connectRedis } = require('../config/redis');
const logger = require('../config/logger');

// Only import BullMQ if Redis is enabled
let Queue, Worker;
try {
  if (process.env.REDIS_DISABLED !== '1') {
    const bullmq = require('bullmq');
    Queue = bullmq.Queue;
    Worker = bullmq.Worker;
  }
} catch (error) {
  logger.warn('BullMQ not available, queue functionality disabled', { error: error.message });
}

// Queue instances
const queues = {};

/**
 * Create or get a queue instance
 * @param {string} queueName - Name of the queue
 * @returns {Queue} BullMQ queue instance
 */
function getQueue(queueName) {
  try {
    if (!Queue) {
      throw new Error('Queue functionality is disabled (Redis disabled or BullMQ not available)');
    }

    if (queues[queueName]) {
      return queues[queueName];
    }

    const redisClient = connectRedis();
    
    const queue = new Queue(queueName, {
      connection: redisClient,
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs
        attempts: 3, // Retry failed jobs 3 times
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2 second delay
        },
      },
    });

    // Handle queue events
    queue.on('error', (error) => {
      logger.error(`Queue ${queueName} error`, { 
        error: error.message,
        queueName
      });
    });

    queue.on('waiting', (jobId) => {
      logger.debug(`Job ${jobId} waiting in queue ${queueName}`);
    });

    queue.on('active', (job) => {
      logger.debug(`Job ${job.id} active in queue ${queueName}`, {
        jobId: job.id,
        jobName: job.name,
        queueName
      });
    });

    queue.on('completed', (job) => {
      logger.info(`Job ${job.id} completed in queue ${queueName}`, {
        jobId: job.id,
        jobName: job.name,
        queueName,
        duration: Date.now() - job.processedOn
      });
    });

    queue.on('failed', (job, err) => {
      logger.error(`Job ${job.id} failed in queue ${queueName}`, {
        jobId: job.id,
        jobName: job.name,
        queueName,
        error: err.message,
        attempts: job.attemptsMade
      });
    });

    queues[queueName] = queue;
    return queue;

  } catch (error) {
    logger.error('Error creating queue', { 
      error: error.message,
      queueName
    });
    throw new Error(`Queue creation failed: ${error.message}`);
  }
}

/**
 * Add a job to a queue
 * @param {string} queueName - Name of the queue
 * @param {string} jobName - Name of the job
 * @param {object} data - Job data
 * @param {object} options - Job options
 * @returns {Promise<Job>} Added job
 */
async function addJob(queueName, jobName, data = {}, options = {}) {
  try {
    const queue = getQueue(queueName);
    
    const job = await queue.add(jobName, data, {
      ...options,
      jobId: options.jobId || `${jobName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });

    logger.info(`Job added to queue ${queueName}`, {
      jobId: job.id,
      jobName,
      queueName,
      data: Object.keys(data)
    });

    return job;

  } catch (error) {
    logger.error('Error adding job to queue', { 
      error: error.message,
      queueName,
      jobName
    });
    throw new Error(`Job addition failed: ${error.message}`);
  }
}

/**
 * Create a worker for a queue
 * @param {string} queueName - Name of the queue
 * @param {function} processor - Job processor function
 * @param {object} options - Worker options
 * @returns {Worker} BullMQ worker instance
 */
function createWorker(queueName, processor, options = {}) {
  try {
    if (!Worker) {
      throw new Error('Worker functionality is disabled (Redis disabled or BullMQ not available)');
    }

    const redisClient = connectRedis();
    
    const worker = new Worker(queueName, processor, {
      connection: redisClient,
      concurrency: options.concurrency || 1,
      ...options
    });

    // Handle worker events
    worker.on('ready', () => {
      logger.info(`Worker ready for queue ${queueName}`, {
        queueName,
        concurrency: options.concurrency || 1
      });
    });

    worker.on('error', (error) => {
      logger.error(`Worker error for queue ${queueName}`, { 
        error: error.message,
        queueName
      });
    });

    worker.on('failed', (job, err) => {
      logger.error(`Worker job failed in queue ${queueName}`, {
        jobId: job.id,
        jobName: job.name,
        queueName,
        error: err.message,
        attempts: job.attemptsMade
      });
    });

    return worker;

  } catch (error) {
    logger.error('Error creating worker', { 
      error: error.message,
      queueName
    });
    throw new Error(`Worker creation failed: ${error.message}`);
  }
}

/**
 * Get queue statistics
 * @param {string} queueName - Name of the queue
 * @returns {Promise<object>} Queue statistics
 */
async function getQueueStats(queueName) {
  try {
    const queue = getQueue(queueName);
    
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed()
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      total: waiting.length + active.length + completed.length + failed.length + delayed.length
    };

  } catch (error) {
    logger.error('Error getting queue stats', { 
      error: error.message,
      queueName
    });
    throw new Error(`Queue stats retrieval failed: ${error.message}`);
  }
}

/**
 * Clean old jobs from a queue
 * @param {string} queueName - Name of the queue
 * @param {object} options - Clean options
 * @returns {Promise<object>} Clean result
 */
async function cleanQueue(queueName, options = {}) {
  try {
    const queue = getQueue(queueName);
    
    const cleanOptions = {
      grace: 5000, // 5 seconds grace period
      limit: 100, // Clean up to 100 jobs
      ...options
    };

    const result = await queue.clean(cleanOptions.grace, cleanOptions.limit, cleanOptions.type);

    logger.info(`Queue ${queueName} cleaned`, {
      queueName,
      cleanedCount: result.length,
      options: cleanOptions
    });

    return result;

  } catch (error) {
    logger.error('Error cleaning queue', { 
      error: error.message,
      queueName
    });
    throw new Error(`Queue cleaning failed: ${error.message}`);
  }
}

/**
 * Pause a queue
 * @param {string} queueName - Name of the queue
 * @returns {Promise<void>}
 */
async function pauseQueue(queueName) {
  try {
    const queue = getQueue(queueName);
    await queue.pause();
    
    logger.info(`Queue ${queueName} paused`);

  } catch (error) {
    logger.error('Error pausing queue', { 
      error: error.message,
      queueName
    });
    throw new Error(`Queue pause failed: ${error.message}`);
  }
}

/**
 * Resume a queue
 * @param {string} queueName - Name of the queue
 * @returns {Promise<void>}
 */
async function resumeQueue(queueName) {
  try {
    const queue = getQueue(queueName);
    await queue.resume();
    
    logger.info(`Queue ${queueName} resumed`);

  } catch (error) {
    logger.error('Error resuming queue', { 
      error: error.message,
      queueName
    });
    throw new Error(`Queue resume failed: ${error.message}`);
  }
}

/**
 * Close all queues
 * @returns {Promise<void>}
 */
async function closeAllQueues() {
  try {
    const closePromises = Object.values(queues).map(queue => queue.close());
    await Promise.all(closePromises);
    
    // Clear the queues object
    Object.keys(queues).forEach(key => delete queues[key]);
    
    logger.info('All queues closed');

  } catch (error) {
    logger.error('Error closing queues', { 
      error: error.message
    });
    throw new Error(`Queue closing failed: ${error.message}`);
  }
}

/**
 * Get job by ID
 * @param {string} queueName - Name of the queue
 * @param {string} jobId - Job ID
 * @returns {Promise<Job|null>} Job instance or null
 */
async function getJob(queueName, jobId) {
  try {
    const queue = getQueue(queueName);
    const job = await queue.getJob(jobId);
    return job;

  } catch (error) {
    logger.error('Error getting job', { 
      error: error.message,
      queueName,
      jobId
    });
    throw new Error(`Job retrieval failed: ${error.message}`);
  }
}

/**
 * Retry a failed job
 * @param {string} queueName - Name of the queue
 * @param {string} jobId - Job ID
 * @returns {Promise<void>}
 */
async function retryJob(queueName, jobId) {
  try {
    const job = await getJob(queueName, jobId);
    if (job) {
      await job.retry();
      logger.info(`Job ${jobId} retried in queue ${queueName}`);
    } else {
      throw new Error('Job not found');
    }

  } catch (error) {
    logger.error('Error retrying job', { 
      error: error.message,
      queueName,
      jobId
    });
    throw new Error(`Job retry failed: ${error.message}`);
  }
}

module.exports = {
  getQueue,
  addJob,
  createWorker,
  getQueueStats,
  cleanQueue,
  pauseQueue,
  resumeQueue,
  closeAllQueues,
  getJob,
  retryJob
};

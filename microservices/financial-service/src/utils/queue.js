/**
 * Queue utility functions for HRMS
 * Handles BullMQ queue creation and management
 */

const { Queue, Worker, QueueEvents } = require('bullmq');
const { connectRedis } = require('../config/redis');
const logger = require('../config/logger');

// Queue instances cache
const queues = new Map();
const workers = new Map();
const queueEvents = new Map();

/**
 * Create or get a queue instance
 * @param {string} queueName - Name of the queue
 * @param {Object} options - Queue options
 * @returns {Queue} BullMQ queue instance
 */
function createQueue(queueName, options = {}) {
  if (queues.has(queueName)) {
    return queues.get(queueName);
  }

  const defaultOptions = {
    connection: connectRedis(),
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
    ...options
  };

  const queue = new Queue(queueName, defaultOptions);
  queues.set(queueName, queue);

  // Create queue events for monitoring
  const events = new QueueEvents(queueName, { connection: connectRedis() });
  queueEvents.set(queueName, events);

  // Set up event listeners
  events.on('completed', ({ jobId, returnvalue }) => {
    logger.info(`Job ${jobId} completed in queue ${queueName}`, { returnvalue });
  });

  events.on('failed', ({ jobId, failedReason }) => {
    logger.error(`Job ${jobId} failed in queue ${queueName}`, { failedReason });
  });

  events.on('stalled', ({ jobId }) => {
    logger.warn(`Job ${jobId} stalled in queue ${queueName}`);
  });

  logger.info(`Queue ${queueName} created successfully`);
  return queue;
}

/**
 * Create a worker for a queue
 * @param {string} queueName - Name of the queue
 * @param {Function} processor - Job processor function
 * @param {Object} options - Worker options
 * @returns {Worker} BullMQ worker instance
 */
function createWorker(queueName, processor, options = {}) {
  if (workers.has(queueName)) {
    return workers.get(queueName);
  }

  const defaultOptions = {
    connection: connectRedis(),
    concurrency: 5,
    ...options
  };

  const worker = new Worker(queueName, processor, defaultOptions);
  workers.set(queueName, worker);

  // Set up worker event listeners
  worker.on('completed', (job) => {
    logger.info(`Worker completed job ${job.id} in queue ${queueName}`, {
      jobName: job.name,
      duration: Date.now() - job.processedOn
    });
  });

  worker.on('failed', (job, err) => {
    logger.error(`Worker failed job ${job.id} in queue ${queueName}`, {
      jobName: job.name,
      error: err.message,
      stack: err.stack
    });
  });

  worker.on('stalled', (jobId) => {
    logger.warn(`Worker stalled job ${jobId} in queue ${queueName}`);
  });

  logger.info(`Worker created for queue ${queueName}`);
  return worker;
}

/**
 * Add a job to a queue
 * @param {string} queueName - Name of the queue
 * @param {string} jobName - Name of the job
 * @param {Object} data - Job data
 * @param {Object} options - Job options
 * @returns {Promise<Job>} Added job
 */
async function addJob(queueName, jobName, data, options = {}) {
  const queue = createQueue(queueName);
  
  const jobOptions = {
    delay: 0,
    priority: 0,
    ...options
  };

  try {
    const job = await queue.add(jobName, data, jobOptions);
    logger.info(`Job ${jobName} added to queue ${queueName}`, {
      jobId: job.id,
      data: typeof data === 'object' ? Object.keys(data) : data
    });
    return job;
  } catch (error) {
    logger.error(`Failed to add job ${jobName} to queue ${queueName}`, {
      error: error.message,
      data: typeof data === 'object' ? Object.keys(data) : data
    });
    throw error;
  }
}

/**
 * Add a delayed job to a queue
 * @param {string} queueName - Name of the queue
 * @param {string} jobName - Name of the job
 * @param {Object} data - Job data
 * @param {number} delayMs - Delay in milliseconds
 * @param {Object} options - Job options
 * @returns {Promise<Job>} Added job
 */
async function addDelayedJob(queueName, jobName, data, delayMs, options = {}) {
  return addJob(queueName, jobName, data, {
    ...options,
    delay: delayMs
  });
}

/**
 * Add a recurring job to a queue
 * @param {string} queueName - Name of the queue
 * @param {string} jobName - Name of the job
 * @param {Object} data - Job data
 * @param {string} cronPattern - Cron pattern
 * @param {Object} options - Job options
 * @returns {Promise<Job>} Added job
 */
async function addRecurringJob(queueName, jobName, data, cronPattern, options = {}) {
  return addJob(queueName, jobName, data, {
    ...options,
    repeat: {
      pattern: cronPattern
    }
  });
}

/**
 * Get queue statistics
 * @param {string} queueName - Name of the queue
 * @returns {Promise<Object>} Queue statistics
 */
async function getQueueStats(queueName) {
  const queue = createQueue(queueName);
  
  try {
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
    logger.error(`Failed to get stats for queue ${queueName}`, { error: error.message });
    throw error;
  }
}

/**
 * Get all queue statistics
 * @returns {Promise<Object>} All queue statistics
 */
async function getAllQueueStats() {
  const stats = {};
  
  for (const queueName of queues.keys()) {
    try {
      stats[queueName] = await getQueueStats(queueName);
    } catch (error) {
      logger.error(`Failed to get stats for queue ${queueName}`, { error: error.message });
      stats[queueName] = { error: error.message };
    }
  }
  
  return stats;
}

/**
 * Clean completed jobs from a queue
 * @param {string} queueName - Name of the queue
 * @param {number} count - Number of jobs to keep
 * @returns {Promise<number>} Number of jobs cleaned
 */
async function cleanQueue(queueName, count = 100) {
  const queue = createQueue(queueName);
  
  try {
    const [completed, failed] = await Promise.all([
      queue.clean(24 * 60 * 60 * 1000, count, 'completed'), // 24 hours
      queue.clean(7 * 24 * 60 * 60 * 1000, count, 'failed') // 7 days
    ]);
    
    const totalCleaned = completed + failed;
    logger.info(`Cleaned ${totalCleaned} jobs from queue ${queueName}`, {
      completed,
      failed
    });
    
    return totalCleaned;
  } catch (error) {
    logger.error(`Failed to clean queue ${queueName}`, { error: error.message });
    throw error;
  }
}

/**
 * Pause a queue
 * @param {string} queueName - Name of the queue
 * @returns {Promise<void>}
 */
async function pauseQueue(queueName) {
  const queue = createQueue(queueName);
  await queue.pause();
  logger.info(`Queue ${queueName} paused`);
}

/**
 * Resume a queue
 * @param {string} queueName - Name of the queue
 * @returns {Promise<void>}
 */
async function resumeQueue(queueName) {
  const queue = createQueue(queueName);
  await queue.resume();
  logger.info(`Queue ${queueName} resumed`);
}

/**
 * Remove a job from a queue
 * @param {string} queueName - Name of the queue
 * @param {string} jobId - Job ID
 * @returns {Promise<void>}
 */
async function removeJob(queueName, jobId) {
  const queue = createQueue(queueName);
  await queue.remove(jobId);
  logger.info(`Job ${jobId} removed from queue ${queueName}`);
}

/**
 * Retry a failed job
 * @param {string} queueName - Name of the queue
 * @param {string} jobId - Job ID
 * @returns {Promise<void>}
 */
async function retryJob(queueName, jobId) {
  const queue = createQueue(queueName);
  await queue.retry(jobId);
  logger.info(`Job ${jobId} retried in queue ${queueName}`);
}

/**
 * Get job details
 * @param {string} queueName - Name of the queue
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Job details
 */
async function getJob(queueName, jobId) {
  const queue = createQueue(queueName);
  const job = await queue.getJob(jobId);
  
  if (!job) {
    return null;
  }
  
  return {
    id: job.id,
    name: job.name,
    data: job.data,
    progress: job.progress,
    returnvalue: job.returnvalue,
    failedReason: job.failedReason,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
    timestamp: job.timestamp,
    attemptsMade: job.attemptsMade,
    opts: job.opts
  };
}

/**
 * Close all queues and workers
 * @returns {Promise<void>}
 */
async function closeAll() {
  logger.info('Closing all queues and workers...');
  
  // Close all workers
  for (const [queueName, worker] of workers) {
    try {
      await worker.close();
      logger.info(`Worker for queue ${queueName} closed`);
    } catch (error) {
      logger.error(`Error closing worker for queue ${queueName}`, { error: error.message });
    }
  }
  
  // Close all queue events
  for (const [queueName, events] of queueEvents) {
    try {
      await events.close();
      logger.info(`Queue events for ${queueName} closed`);
    } catch (error) {
      logger.error(`Error closing queue events for ${queueName}`, { error: error.message });
    }
  }
  
  // Close all queues
  for (const [queueName, queue] of queues) {
    try {
      await queue.close();
      logger.info(`Queue ${queueName} closed`);
    } catch (error) {
      logger.error(`Error closing queue ${queueName}`, { error: error.message });
    }
  }
  
  // Clear caches
  queues.clear();
  workers.clear();
  queueEvents.clear();
  
  logger.info('All queues and workers closed');
}

/**
 * Graceful shutdown handler
 */
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down queues gracefully...');
  await closeAll();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down queues gracefully...');
  await closeAll();
  process.exit(0);
});

module.exports = {
  createQueue,
  createWorker,
  addJob,
  addDelayedJob,
  addRecurringJob,
  getQueueStats,
  getAllQueueStats,
  cleanQueue,
  pauseQueue,
  resumeQueue,
  removeJob,
  retryJob,
  getJob,
  closeAll
};

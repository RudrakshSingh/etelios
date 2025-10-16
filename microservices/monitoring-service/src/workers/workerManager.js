const { createEmailWorker } = require('./emailWorker');
const { createNotificationWorker } = require('./notificationWorker');
const assetAlertJobs = require('../jobs/assetAlertJobs');
const logger = require('../config/logger');

class WorkerManager {
  constructor() {
    this.workers = new Map();
    this.isRunning = false;
  }

  /**
   * Start all workers
   * @returns {Promise<void>}
   */
  async start() {
    try {
      if (this.isRunning) {
        logger.warn('Workers are already running');
        return;
      }

      logger.info('Starting workers...');

      // Create email worker
      const emailWorker = createEmailWorker();
      this.workers.set('email', emailWorker);

      // Create notification worker
      const notificationWorker = createNotificationWorker();
      this.workers.set('notification', notificationWorker);

      // Start asset alert jobs
      assetAlertJobs.start();
      this.workers.set('assetAlerts', assetAlertJobs);

      this.isRunning = true;

      logger.info('All workers started successfully', {
        workerCount: this.workers.size,
        workerNames: Array.from(this.workers.keys())
      });

    } catch (error) {
      logger.error('Failed to start workers', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Stop all workers
   * @returns {Promise<void>}
   */
  async stop() {
    try {
      if (!this.isRunning) {
        logger.warn('Workers are not running');
        return;
      }

      logger.info('Stopping workers...');

      // Stop asset alert jobs
      if (this.workers.has('assetAlerts')) {
        this.workers.get('assetAlerts').stop();
      }

      const stopPromises = Array.from(this.workers.values()).map(worker => {
        if (worker.close) {
          return worker.close();
        }
        return Promise.resolve();
      });

      await Promise.all(stopPromises);

      this.workers.clear();
      this.isRunning = false;

      logger.info('All workers stopped successfully');

    } catch (error) {
      logger.error('Failed to stop workers', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get worker by name
   * @param {string} name - Worker name
   * @returns {object|null} Worker instance or null
   */
  getWorker(name) {
    return this.workers.get(name) || null;
  }

  /**
   * Get all workers
   * @returns {Map} Workers map
   */
  getAllWorkers() {
    return this.workers;
  }

  /**
   * Check if workers are running
   * @returns {boolean} True if workers are running
   */
  isWorkersRunning() {
    return this.isRunning;
  }

  /**
   * Get worker status
   * @returns {object} Worker status information
   */
  getWorkerStatus() {
    const status = {
      isRunning: this.isRunning,
      workerCount: this.workers.size,
      workers: {}
    };

    for (const [name, worker] of this.workers) {
      status.workers[name] = {
        name,
        isRunning: worker.isRunning || false,
        concurrency: worker.opts?.concurrency || 1
      };
    }

    return status;
  }

  /**
   * Restart workers
   * @returns {Promise<void>}
   */
  async restart() {
    try {
      logger.info('Restarting workers...');
      
      await this.stop();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      await this.start();

      logger.info('Workers restarted successfully');

    } catch (error) {
      logger.error('Failed to restart workers', {
        error: error.message
      });
      throw error;
    }
  }
}

// Create singleton instance
const workerManager = new WorkerManager();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down workers gracefully...');
  try {
    await workerManager.stop();
    process.exit(0);
  } catch (error) {
    logger.error('Error during worker shutdown', { error: error.message });
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down workers gracefully...');
  try {
    await workerManager.stop();
    process.exit(0);
  } catch (error) {
    logger.error('Error during worker shutdown', { error: error.message });
    process.exit(1);
  }
});

module.exports = workerManager;

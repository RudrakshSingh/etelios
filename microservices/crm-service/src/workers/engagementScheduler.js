const cron = require('node-cron');
const engagementService = require('../services/engagementService');
const logger = require('../config/logger');

class EngagementScheduler {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      logger.warn('Engagement scheduler is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting engagement scheduler');

    // Daily at 08:55 - Build Birthday/Anniversary jobs
    this.jobs.set('birthday-anniversary', cron.schedule('55 8 * * *', async () => {
      try {
        logger.info('Running birthday/anniversary automation');
        await engagementService.processBirthdayAnniversaryWishes();
      } catch (error) {
        logger.error('Error in birthday/anniversary automation', { error: error.message });
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    }));

    // Daily at 10:00 - Generate T-20/T-15 highlight tasks
    this.jobs.set('highlight-tasks', cron.schedule('0 10 * * *', async () => {
      try {
        logger.info('Running highlight task generation');
        await engagementService.processEyeTestRecalls();
        await engagementService.processContactLensRefills();
      } catch (error) {
        logger.error('Error in highlight task generation', { error: error.message });
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    }));

    // Hourly - Scan Post-Delivery eligible orders
    this.jobs.set('post-delivery', cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Running post-delivery feedback automation');
        await engagementService.processPostDeliveryFeedback();
      } catch (error) {
        logger.error('Error in post-delivery feedback automation', { error: error.message });
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    }));

    // Every 5 minutes - Appointment T-24h/T-2h window
    this.jobs.set('appointment-reminders', cron.schedule('*/5 * * * *', async () => {
      try {
        logger.info('Running appointment reminder processing');
        await engagementService.processReminderJobs();
      } catch (error) {
        logger.error('Error in appointment reminder processing', { error: error.message });
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    }));

    // Every 10 minutes - Process pending reminder jobs
    this.jobs.set('reminder-jobs', cron.schedule('*/10 * * * *', async () => {
      try {
        logger.info('Running reminder job processing');
        await engagementService.processReminderJobs();
      } catch (error) {
        logger.error('Error in reminder job processing', { error: error.message });
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    }));

    logger.info('Engagement scheduler started successfully', {
      jobs: Array.from(this.jobs.keys())
    });
  }

  stop() {
    if (!this.isRunning) {
      logger.warn('Engagement scheduler is not running');
      return;
    }

    this.isRunning = false;
    
    for (const [name, job] of this.jobs) {
      job.destroy();
      logger.info(`Stopped scheduler job: ${name}`);
    }
    
    this.jobs.clear();
    logger.info('Engagement scheduler stopped');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      jobs: Array.from(this.jobs.keys()),
      jobCount: this.jobs.size
    };
  }

  // Manual trigger methods for testing
  async triggerBirthdayAnniversary() {
    try {
      logger.info('Manually triggering birthday/anniversary automation');
      return await engagementService.processBirthdayAnniversaryWishes();
    } catch (error) {
      logger.error('Error in manual birthday/anniversary trigger', { error: error.message });
      throw error;
    }
  }

  async triggerPostDeliveryFeedback() {
    try {
      logger.info('Manually triggering post-delivery feedback automation');
      return await engagementService.processPostDeliveryFeedback();
    } catch (error) {
      logger.error('Error in manual post-delivery feedback trigger', { error: error.message });
      throw error;
    }
  }

  async triggerEyeTestRecalls() {
    try {
      logger.info('Manually triggering eye test recall automation');
      return await engagementService.processEyeTestRecalls();
    } catch (error) {
      logger.error('Error in manual eye test recall trigger', { error: error.message });
      throw error;
    }
  }

  async triggerContactLensRefills() {
    try {
      logger.info('Manually triggering contact lens refill automation');
      return await engagementService.processContactLensRefills();
    } catch (error) {
      logger.error('Error in manual contact lens refill trigger', { error: error.message });
      throw error;
    }
  }

  async triggerReminderJobs() {
    try {
      logger.info('Manually triggering reminder job processing');
      return await engagementService.processReminderJobs();
    } catch (error) {
      logger.error('Error in manual reminder job trigger', { error: error.message });
      throw error;
    }
  }
}

module.exports = new EngagementScheduler();

const engagementService = require('../services/engagementService');
const ReminderJob = require('../models/ReminderJob.model');
const MessageLog = require('../models/MessageLog.model');
const Contact = require('../models/Contact.model');
const logger = require('../config/logger');

class MessageWorker {
  constructor() {
    this.isProcessing = false;
    this.processingInterval = null;
    this.batchSize = 10; // Process 10 messages at a time
    this.processingIntervalMs = 30000; // Process every 30 seconds
  }

  start() {
    if (this.isProcessing) {
      logger.warn('Message worker is already running');
      return;
    }

    this.isProcessing = true;
    logger.info('Starting message worker');

    // Process messages every 30 seconds
    this.processingInterval = setInterval(async () => {
      await this.processMessages();
    }, this.processingIntervalMs);

    logger.info('Message worker started successfully');
  }

  stop() {
    if (!this.isProcessing) {
      logger.warn('Message worker is not running');
      return;
    }

    this.isProcessing = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    logger.info('Message worker stopped');
  }

  async processMessages() {
    try {
      const pendingJobs = await ReminderJob.find({
        status: 'PENDING',
        scheduled_for: { $lte: new Date() }
      })
      .sort({ priority: -1, scheduled_for: 1 })
      .limit(this.batchSize);

      if (pendingJobs.length === 0) {
        return;
      }

      logger.info(`Processing ${pendingJobs.length} pending messages`);

      for (const job of pendingJobs) {
        await this.processMessage(job);
      }
    } catch (error) {
      logger.error('Error processing messages', { error: error.message });
    }
  }

  async processMessage(job) {
    try {
      const contact = await Contact.findById(job.customer_id);
      if (!contact) {
        job.status = 'SKIPPED';
        await job.save();
        logger.warn('Contact not found for job', { job_id: job.job_id });
        return;
      }

      // Check consent
      if (!contact.consents[job.channel]) {
        job.status = 'SKIPPED';
        await job.save();
        logger.info('No consent for channel', { 
          job_id: job.job_id, 
          channel: job.channel 
        });
        return;
      }

      // Check quiet hours
      if (this.isQuietHours(contact, job.channel)) {
        // Reschedule for later
        const nextAvailable = this.getNextAvailableTime(contact);
        job.scheduled_for = nextAvailable;
        await job.save();
        logger.info('Rescheduled due to quiet hours', { 
          job_id: job.job_id,
          rescheduled_for: nextAvailable
        });
        return;
      }

      // Send message
      const result = await this.sendMessage(job, contact);
      
      if (result.success) {
        job.status = 'SENT';
        job.send_result = {
          provider_msg_id: result.messageId,
          retry_count: 0
        };
      } else {
        job.status = 'FAILED';
        job.send_result = {
          error: result.error,
          retry_count: (job.send_result?.retry_count || 0) + 1
        };
      }

      await job.save();

      // Create message log
      await this.createMessageLog(job, result);

      logger.info('Message processed', { 
        job_id: job.job_id, 
        status: job.status,
        channel: job.channel
      });
    } catch (error) {
      logger.error('Error processing message', { 
        job_id: job.job_id, 
        error: error.message 
      });
      
      // Mark as failed
      job.status = 'FAILED';
      job.send_result = {
        error: error.message,
        retry_count: (job.send_result?.retry_count || 0) + 1
      };
      await job.save();
    }
  }

  async sendMessage(job, contact) {
    // Placeholder for actual messaging integration
    // Would integrate with WhatsApp Business API, SMS providers, Email services
    try {
      // Simulate message sending
      const messageId = `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      logger.info('Message sent', {
        job_id: job.job_id,
        channel: job.channel,
        customer_id: contact.customer_id,
        message_id: messageId
      });

      return { success: true, messageId };
    } catch (error) {
      logger.error('Error sending message', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  async createMessageLog(job, result) {
    try {
      const messageLog = new MessageLog({
        log_id: `LOG-${job.job_id}-${Date.now()}`,
        job_id: job._id,
        customer_id: job.customer_id,
        channel: job.channel,
        template_id: job.template_id,
        sent_at: new Date(),
        delivery_status: result.success ? 'DELIVERED' : 'FAILED',
        meta: {
          provider_msg_id: result.messageId,
          retry_count: job.send_result?.retry_count || 0
        }
      });

      await messageLog.save();
    } catch (error) {
      logger.error('Error creating message log', { error: error.message });
    }
  }

  isQuietHours(contact, channel) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const quietStart = this.timeToMinutes(contact.preferences.quiet_hours_start);
    const quietEnd = this.timeToMinutes(contact.preferences.quiet_hours_end);

    // Only apply quiet hours to promotional messages
    // Transactional messages can be sent anytime
    return currentTime >= quietStart || currentTime <= quietEnd;
  }

  timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  getNextAvailableTime(contact) {
    const now = new Date();
    const quietEnd = this.timeToMinutes(contact.preferences.quiet_hours_end);
    const nextAvailable = new Date(now);
    
    if (now.getHours() * 60 + now.getMinutes() < quietEnd) {
      nextAvailable.setHours(Math.floor(quietEnd / 60), quietEnd % 60, 0, 0);
    } else {
      nextAvailable.setDate(nextAvailable.getDate() + 1);
      nextAvailable.setHours(Math.floor(quietEnd / 60), quietEnd % 60, 0, 0);
    }

    return nextAvailable;
  }

  getStatus() {
    return {
      isProcessing: this.isProcessing,
      batchSize: this.batchSize,
      processingIntervalMs: this.processingIntervalMs
    };
  }

  // Manual processing methods
  async processPendingMessages() {
    try {
      logger.info('Manually processing pending messages');
      await this.processMessages();
    } catch (error) {
      logger.error('Error in manual message processing', { error: error.message });
      throw error;
    }
  }

  async retryFailedMessages() {
    try {
      const failedJobs = await ReminderJob.find({
        status: 'FAILED',
        'send_result.retry_count': { $lt: 3 }
      });

      logger.info(`Retrying ${failedJobs.length} failed messages`);

      for (const job of failedJobs) {
        await this.processMessage(job);
      }
    } catch (error) {
      logger.error('Error retrying failed messages', { error: error.message });
      throw error;
    }
  }
}

module.exports = new MessageWorker();

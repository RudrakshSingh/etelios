const { addJob } = require('../utils/queueUtils');
const logger = require('../config/logger');

/**
 * Notification job types
 */
const NOTIFICATION_JOB_TYPES = {
  PUSH_NOTIFICATION: 'push_notification',
  SMS_NOTIFICATION: 'sms_notification',
  SLACK_NOTIFICATION: 'slack_notification',
  WEBHOOK_NOTIFICATION: 'webhook_notification'
};

/**
 * Add push notification job
 * @param {object} notificationData - Notification data
 * @param {object} options - Job options
 * @returns {Promise<string>} Job ID
 */
async function addPushNotificationJob(notificationData, options = {}) {
  try {
    const job = await addJob('notification-queue', NOTIFICATION_JOB_TYPES.PUSH_NOTIFICATION, {
      notificationData,
      timestamp: new Date().toISOString()
    }, {
      delay: options.delay || 0,
      attempts: options.attempts || 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    logger.info('Push notification job added', {
      jobId: job.id,
      userId: notificationData.userId,
      title: notificationData.title
    });

    return job.id;

  } catch (error) {
    logger.error('Failed to add push notification job', {
      error: error.message,
      notificationData
    });
    throw error;
  }
}

/**
 * Add SMS notification job
 * @param {object} smsData - SMS data
 * @param {object} options - Job options
 * @returns {Promise<string>} Job ID
 */
async function addSMSNotificationJob(smsData, options = {}) {
  try {
    const job = await addJob('notification-queue', NOTIFICATION_JOB_TYPES.SMS_NOTIFICATION, {
      smsData,
      timestamp: new Date().toISOString()
    }, {
      delay: options.delay || 0,
      attempts: options.attempts || 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    logger.info('SMS notification job added', {
      jobId: job.id,
      phoneNumber: smsData.phoneNumber,
      message: smsData.message
    });

    return job.id;

  } catch (error) {
    logger.error('Failed to add SMS notification job', {
      error: error.message,
      smsData
    });
    throw error;
  }
}

/**
 * Add Slack notification job
 * @param {object} slackData - Slack data
 * @param {object} options - Job options
 * @returns {Promise<string>} Job ID
 */
async function addSlackNotificationJob(slackData, options = {}) {
  try {
    const job = await addJob('notification-queue', NOTIFICATION_JOB_TYPES.SLACK_NOTIFICATION, {
      slackData,
      timestamp: new Date().toISOString()
    }, {
      delay: options.delay || 0,
      attempts: options.attempts || 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    logger.info('Slack notification job added', {
      jobId: job.id,
      channel: slackData.channel,
      message: slackData.message
    });

    return job.id;

  } catch (error) {
    logger.error('Failed to add Slack notification job', {
      error: error.message,
      slackData
    });
    throw error;
  }
}

/**
 * Add webhook notification job
 * @param {object} webhookData - Webhook data
 * @param {object} options - Job options
 * @returns {Promise<string>} Job ID
 */
async function addWebhookNotificationJob(webhookData, options = {}) {
  try {
    const job = await addJob('notification-queue', NOTIFICATION_JOB_TYPES.WEBHOOK_NOTIFICATION, {
      webhookData,
      timestamp: new Date().toISOString()
    }, {
      delay: options.delay || 0,
      attempts: options.attempts || 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    logger.info('Webhook notification job added', {
      jobId: job.id,
      url: webhookData.url,
      event: webhookData.event
    });

    return job.id;

  } catch (error) {
    logger.error('Failed to add webhook notification job', {
      error: error.message,
      webhookData
    });
    throw error;
  }
}

module.exports = {
  NOTIFICATION_JOB_TYPES,
  addPushNotificationJob,
  addSMSNotificationJob,
  addSlackNotificationJob,
  addWebhookNotificationJob
};

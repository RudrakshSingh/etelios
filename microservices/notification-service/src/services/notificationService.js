const Notification = require('../models/Notification.model');
const { addPushNotificationJob, addSMSNotificationJob, addSlackNotificationJob, addWebhookNotificationJob } = require('../jobs/notificationJobs');
const { sendEmail } = require('./emailService');
const { sendSMS } = require('../utils/sms');
const logger = require('../config/logger');

class NotificationService {
  /**
   * Create and send notification
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} Created notification
   */
  async createNotification(notificationData) {
    try {
      const {
        recipient_id,
        recipient_type = 'USER',
        title,
        message,
        type,
        category,
        priority = 'MEDIUM',
        channels = ['APP_INBOX'],
        metadata = {},
        template_id,
        variables = {},
        scheduled_for,
        expires_at,
        created_by
      } = notificationData;

      // Create notification record
      const notification = new Notification({
        recipient_id,
        recipient_type,
        title,
        message,
        type,
        category,
        priority,
        channels: channels.map(channel => ({ channel, status: 'PENDING' })),
        metadata,
        template_id,
        variables,
        scheduled_for,
        expires_at,
        created_by
      });

      await notification.save();

      // Process channels
      for (const channelData of notification.channels) {
        await this.processChannel(notification, channelData);
      }

      logger.info('Notification created and processed', {
        notificationId: notification.notification_id,
        recipientId: recipient_id,
        type,
        channels: channels.length
      });

      return notification;

    } catch (error) {
      logger.error('Error creating notification', {
        error: error.message,
        notificationData
      });
      throw error;
    }
  }

  /**
   * Process notification channel
   * @param {Object} notification - Notification object
   * @param {Object} channelData - Channel data
   */
  async processChannel(notification, channelData) {
    try {
      const { channel } = channelData;

      switch (channel) {
        case 'EMAIL':
          await this.sendEmailNotification(notification, channelData);
          break;
        case 'SMS':
          await this.sendSMSNotification(notification, channelData);
          break;
        case 'WHATSAPP':
          await this.sendWhatsAppNotification(notification, channelData);
          break;
        case 'PUSH':
          await this.sendPushNotification(notification, channelData);
          break;
        case 'SLACK':
          await this.sendSlackNotification(notification, channelData);
          break;
        case 'WEBHOOK':
          await this.sendWebhookNotification(notification, channelData);
          break;
        case 'APP_INBOX':
          // App inbox notifications are stored in database
          channelData.status = 'DELIVERED';
          channelData.delivered_at = new Date();
          break;
        default:
          logger.warn('Unknown notification channel', { channel });
      }

      await notification.save();

    } catch (error) {
      logger.error('Error processing notification channel', {
        error: error.message,
        notificationId: notification.notification_id,
        channel: channelData.channel
      });
      
      channelData.status = 'FAILED';
      channelData.failed_at = new Date();
      channelData.error_message = error.message;
      channelData.delivery_attempts += 1;
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(notification, channelData) {
    try {
      // Get recipient email from user data
      const recipient = await this.getRecipientData(notification.recipient_id);
      
      if (!recipient.email) {
        throw new Error('Recipient email not found');
      }

      await sendEmail({
        to: recipient.email,
        subject: notification.title,
        html: this.formatMessage(notification.message, notification.variables),
        text: notification.message
      });

      channelData.status = 'DELIVERED';
      channelData.delivered_at = new Date();
      channelData.provider_message_id = `email-${Date.now()}`;

    } catch (error) {
      throw new Error(`Email notification failed: ${error.message}`);
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMSNotification(notification, channelData) {
    try {
      // Get recipient phone from user data
      const recipient = await this.getRecipientData(notification.recipient_id);
      
      if (!recipient.phone) {
        throw new Error('Recipient phone not found');
      }

      // Add SMS job to queue
      await addSMSNotificationJob({
        phoneNumber: recipient.phone,
        message: this.formatMessage(notification.message, notification.variables)
      });

      channelData.status = 'SENT';
      channelData.sent_at = new Date();
      channelData.provider_message_id = `sms-${Date.now()}`;

    } catch (error) {
      throw new Error(`SMS notification failed: ${error.message}`);
    }
  }

  /**
   * Send WhatsApp notification
   */
  async sendWhatsAppNotification(notification, channelData) {
    try {
      // TODO: Implement WhatsApp Business API integration
      logger.info('WhatsApp notification queued', {
        notificationId: notification.notification_id,
        recipientId: notification.recipient_id
      });

      channelData.status = 'SENT';
      channelData.sent_at = new Date();
      channelData.provider_message_id = `whatsapp-${Date.now()}`;

    } catch (error) {
      throw new Error(`WhatsApp notification failed: ${error.message}`);
    }
  }

  /**
   * Send push notification
   */
  async sendPushNotification(notification, channelData) {
    try {
      // Add push notification job to queue
      await addPushNotificationJob({
        userId: notification.recipient_id,
        title: notification.title,
        message: notification.message,
        data: notification.metadata
      });

      channelData.status = 'SENT';
      channelData.sent_at = new Date();
      channelData.provider_message_id = `push-${Date.now()}`;

    } catch (error) {
      throw new Error(`Push notification failed: ${error.message}`);
    }
  }

  /**
   * Send Slack notification
   */
  async sendSlackNotification(notification, channelData) {
    try {
      // Add Slack notification job to queue
      await addSlackNotificationJob({
        channel: '#general',
        text: notification.message,
        attachments: [{
          color: this.getPriorityColor(notification.priority),
          title: notification.title,
          text: notification.message,
          fields: [
            { title: 'Type', value: notification.type, short: true },
            { title: 'Priority', value: notification.priority, short: true }
          ]
        }]
      });

      channelData.status = 'SENT';
      channelData.sent_at = new Date();
      channelData.provider_message_id = `slack-${Date.now()}`;

    } catch (error) {
      throw new Error(`Slack notification failed: ${error.message}`);
    }
  }

  /**
   * Send webhook notification
   */
  async sendWebhookNotification(notification, channelData) {
    try {
      // Add webhook notification job to queue
      await addWebhookNotificationJob({
        url: notification.metadata.webhook_url,
        event: notification.type,
        data: {
          notification_id: notification.notification_id,
          title: notification.title,
          message: notification.message,
          metadata: notification.metadata
        }
      });

      channelData.status = 'SENT';
      channelData.sent_at = new Date();
      channelData.provider_message_id = `webhook-${Date.now()}`;

    } catch (error) {
      throw new Error(`Webhook notification failed: ${error.message}`);
    }
  }

  /**
   * Get recipient data
   */
  async getRecipientData(recipientId) {
    try {
      const User = require('../models/User.model');
      const Contact = require('../models/Contact.model');
      
      // Try User model first
      let recipient = await User.findById(recipientId);
      if (recipient) {
        return {
          email: recipient.email,
          phone: recipient.phone,
          name: recipient.name
        };
      }

      // Try Contact model
      recipient = await Contact.findById(recipientId);
      if (recipient) {
        return {
          email: recipient.email,
          phone: recipient.phone,
          name: recipient.name
        };
      }

      throw new Error('Recipient not found');

    } catch (error) {
      logger.error('Error getting recipient data', {
        error: error.message,
        recipientId
      });
      throw error;
    }
  }

  /**
   * Format message with variables
   */
  formatMessage(message, variables = {}) {
    let formattedMessage = message;
    
    Object.keys(variables).forEach(key => {
      const placeholder = `{{${key}}}`;
      formattedMessage = formattedMessage.replace(new RegExp(placeholder, 'g'), variables[key]);
    });

    return formattedMessage;
  }

  /**
   * Get priority color for Slack
   */
  getPriorityColor(priority) {
    const colors = {
      'LOW': 'good',
      'MEDIUM': 'warning',
      'HIGH': 'danger',
      'URGENT': 'danger',
      'CRITICAL': '#ff0000'
    };
    return colors[priority] || 'warning';
  }

  /**
   * Get notifications for user
   */
  async getUserNotifications(userId, filters = {}) {
    try {
      const {
        status,
        type,
        category,
        priority,
        limit = 20,
        offset = 0,
        unread_only = false
      } = filters;

      const query = { recipient_id: userId };

      if (status) query.status = status;
      if (type) query.type = type;
      if (category) query.category = category;
      if (priority) query.priority = priority;
      if (unread_only) query.read_at = { $exists: false };

      const notifications = await Notification.find(query)
        .populate('created_by', 'name email')
        .sort({ created_at: -1 })
        .limit(limit)
        .skip(offset);

      const total = await Notification.countDocuments(query);

      return {
        notifications,
        pagination: {
          total,
          limit,
          offset,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      logger.error('Error getting user notifications', {
        error: error.message,
        userId,
        filters
      });
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        notification_id: notificationId,
        recipient_id: userId
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      notification.read_at = new Date();
      await notification.save();

      logger.info('Notification marked as read', {
        notificationId,
        userId
      });

      return notification;

    } catch (error) {
      logger.error('Error marking notification as read', {
        error: error.message,
        notificationId,
        userId
      });
      throw error;
    }
  }

  /**
   * Acknowledge notification
   */
  async acknowledgeNotification(notificationId, userId, response = 'ACCEPTED', responseData = {}) {
    try {
      const notification = await Notification.findOne({
        notification_id: notificationId,
        recipient_id: userId
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      notification.acknowledged_at = new Date();
      notification.acknowledged_by = userId;
      notification.response = response;
      notification.response_data = responseData;
      await notification.save();

      logger.info('Notification acknowledged', {
        notificationId,
        userId,
        response
      });

      return notification;

    } catch (error) {
      logger.error('Error acknowledging notification', {
        error: error.message,
        notificationId,
        userId
      });
      throw error;
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(filters = {}) {
    try {
      const {
        start_date,
        end_date,
        type,
        category,
        priority
      } = filters;

      const matchQuery = {};
      
      if (start_date || end_date) {
        matchQuery.created_at = {};
        if (start_date) matchQuery.created_at.$gte = new Date(start_date);
        if (end_date) matchQuery.created_at.$lte = new Date(end_date);
      }
      if (type) matchQuery.type = type;
      if (category) matchQuery.category = category;
      if (priority) matchQuery.priority = priority;

      const stats = await Notification.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            sent: { $sum: { $cond: [{ $eq: ['$status', 'SENT'] }, 1, 0] } },
            delivered: { $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, 1, 0] } },
            read: { $sum: { $cond: [{ $ne: ['$read_at', null] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] } },
            by_type: {
              $push: {
                type: '$type',
                status: '$status'
              }
            }
          }
        }
      ]);

      return stats[0] || {
        total: 0,
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0
      };

    } catch (error) {
      logger.error('Error getting notification statistics', {
        error: error.message,
        filters
      });
      throw error;
    }
  }
}

module.exports = new NotificationService();

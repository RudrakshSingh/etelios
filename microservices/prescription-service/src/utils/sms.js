const twilio = require('twilio');
const logger = require('../config/logger');

class SMSService {
  constructor() {
    this.client = null;
    this.initializeClient();
  }

  initializeClient() {
    try {
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        
        logger.info('SMS service initialized', {
          accountSid: process.env.TWILIO_ACCOUNT_SID
        });
      } else {
        logger.warn('SMS service not configured - Twilio credentials missing');
      }
    } catch (error) {
      logger.error('SMS service initialization failed', { error: error.message });
    }
  }

  async sendSMS(smsData) {
    try {
      if (!this.client) {
        throw new Error('SMS service not initialized');
      }

      const {
        to,
        message,
        from = process.env.TWILIO_PHONE_NUMBER
      } = smsData;

      const result = await this.client.messages.create({
        body: message,
        from: from,
        to: to
      });

      logger.info('SMS sent successfully', {
        to,
        messageSid: result.sid,
        status: result.status
      });

      return result;
    } catch (error) {
      logger.error('SMS sending failed', { 
        error: error.message, 
        to: smsData.to 
      });
      throw error;
    }
  }

  async sendBulkSMS(smsList) {
    try {
      if (!this.client) {
        throw new Error('SMS service not initialized');
      }

      const results = [];
      
      for (const smsData of smsList) {
        try {
          const result = await this.sendSMS(smsData);
          results.push({ success: true, to: smsData.to, messageSid: result.sid });
        } catch (error) {
          results.push({ success: false, to: smsData.to, error: error.message });
        }
      }

      logger.info('Bulk SMS sending completed', {
        total: smsList.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      });

      return results;
    } catch (error) {
      logger.error('Bulk SMS sending failed', { error: error.message });
      throw error;
    }
  }

  async sendTemplateSMS(templateName, phoneNumber, data = {}) {
    try {
      const templates = {
        onboarding: `Welcome to the team! Please sign your ${data.documentCount} onboarding documents. Login: ${process.env.FRONTEND_URL}/documents`,
        signature_reminder: `Reminder: Please sign your pending document - ${data.documentTitle}. Login: ${process.env.FRONTEND_URL}/documents/${data.documentId}`,
        escalation: `URGENT: Overdue document signature required for ${data.employeeName}. Please take immediate action.`,
        expiry_reminder: `Document expiring in ${data.daysUntilExpiry} days: ${data.documentTitle}. Please review.`,
        promotion_transfer: `Congratulations on your ${data.newRole}! Please sign your ${data.documentCount} promotion documents. Login: ${process.env.FRONTEND_URL}/documents`,
        exit: `Exit process: Please sign your ${data.documentCount} exit documents. Last working date: ${data.lastWorkingDate}. Login: ${process.env.FRONTEND_URL}/documents`
      };

      const message = templates[templateName];
      if (!message) {
        throw new Error(`SMS template '${templateName}' not found`);
      }

      return await this.sendSMS({
        to: phoneNumber,
        message: message
      });
    } catch (error) {
      logger.error('Template SMS sending failed', { 
        error: error.message, 
        templateName, 
        phoneNumber 
      });
      throw error;
    }
  }

  async verifyPhoneNumber(phoneNumber) {
    try {
      if (!this.client) {
        throw new Error('SMS service not initialized');
      }

      // This would typically involve sending a verification code
      // For now, we'll just validate the phone number format
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      return phoneRegex.test(phoneNumber);
    } catch (error) {
      logger.error('Phone number verification failed', { 
        error: error.message, 
        phoneNumber 
      });
      return false;
    }
  }

  async getMessageStatus(messageSid) {
    try {
      if (!this.client) {
        throw new Error('SMS service not initialized');
      }

      const message = await this.client.messages(messageSid).fetch();
      
      return {
        sid: message.sid,
        status: message.status,
        direction: message.direction,
        from: message.from,
        to: message.to,
        body: message.body,
        dateCreated: message.dateCreated,
        dateUpdated: message.dateUpdated,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage
      };
    } catch (error) {
      logger.error('Get message status failed', { 
        error: error.message, 
        messageSid 
      });
      throw error;
    }
  }

  async getAccountUsage() {
    try {
      if (!this.client) {
        throw new Error('SMS service not initialized');
      }

      const account = await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      
      return {
        accountSid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status,
        type: account.type,
        dateCreated: account.dateCreated
      };
    } catch (error) {
      logger.error('Get account usage failed', { error: error.message });
      throw error;
    }
  }
}

// Create singleton instance
const smsService = new SMSService();

module.exports = smsService;

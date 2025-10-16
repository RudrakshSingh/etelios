const nodemailer = require('nodemailer');
const logger = require('../config/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });

      logger.info('Email service initialized', {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT
      });
    } catch (error) {
      logger.error('Email service initialization failed', { error: error.message });
    }
  }

  async sendEmail(emailData) {
    try {
      if (!this.transporter) {
        throw new Error('Email service not initialized');
      }

      const {
        to,
        subject,
        text,
        html,
        template,
        data = {},
        attachments = []
      } = emailData;

      let emailContent = {};

      if (template) {
        emailContent = await this.generateEmailFromTemplate(template, data);
      } else {
        emailContent = { text, html };
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to,
        subject,
        ...emailContent,
        attachments
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', {
        to,
        subject,
        messageId: result.messageId
      });

      return result;
    } catch (error) {
      logger.error('Email sending failed', { 
        error: error.message, 
        to: emailData.to,
        subject: emailData.subject 
      });
      throw error;
    }
  }

  async generateEmailFromTemplate(templateName, data) {
    try {
      const templates = {
        onboarding: {
          subject: 'Welcome! Please sign your onboarding documents',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Welcome to the team, ${data.name}!</h2>
              <p>We're excited to have you on board. To complete your onboarding process, please sign your ${data.documentCount} onboarding documents.</p>
              <p><strong>Documents to sign:</strong></p>
              <ul>
                <li>Offer Letter</li>
                <li>Non-Disclosure Agreement (NDA)</li>
                <li>POSH Acknowledgment</li>
                <li>Company Handbook</li>
              </ul>
              <p>Please click the link below to access your documents:</p>
              <a href="${data.loginUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Sign Documents</a>
              <p>If you have any questions, please contact HR.</p>
              <p>Best regards,<br>HR Team</p>
            </div>
          `
        },
        signature_reminder: {
          subject: 'Reminder: Please sign your pending document',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Document Signature Reminder</h2>
              <p>Hello ${data.name},</p>
              <p>This is a friendly reminder that you have a pending document that requires your signature:</p>
              <p><strong>Document:</strong> ${data.documentTitle}</p>
              <p><strong>Type:</strong> ${data.documentType}</p>
              <p>Please click the link below to sign the document:</p>
              <a href="${data.loginUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Sign Document</a>
              <p>If you have already signed this document, please ignore this email.</p>
              <p>Best regards,<br>HR Team</p>
            </div>
          `
        },
        escalation: {
          subject: 'URGENT: Overdue document signature required',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc3545;">URGENT: Overdue Document Signature</h2>
              <p>Hello ${data.name},</p>
              <p>This is an urgent notification regarding an overdue document signature:</p>
              <p><strong>Employee:</strong> ${data.employeeName}</p>
              <p><strong>Document:</strong> ${data.documentTitle}</p>
              <p><strong>Type:</strong> ${data.documentType}</p>
              <p><strong>Days Overdue:</strong> ${data.daysOverdue}</p>
              <p>Please take immediate action to ensure this document is signed.</p>
              <a href="${data.loginUrl}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Document</a>
              <p>Best regards,<br>HR Team</p>
            </div>
          `
        },
        expiry_reminder: {
          subject: `Document expiring in ${data.daysUntilExpiry} days`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #ffc107;">Document Expiry Reminder</h2>
              <p>Hello ${data.name},</p>
              <p>This is a reminder that one of your documents is expiring soon:</p>
              <p><strong>Document:</strong> ${data.documentTitle}</p>
              <p><strong>Type:</strong> ${data.documentType}</p>
              <p><strong>Expiry Date:</strong> ${new Date(data.expiryDate).toLocaleDateString()}</p>
              <p><strong>Days Remaining:</strong> ${data.daysUntilExpiry}</p>
              <p>Please review the document and take necessary action if required.</p>
              <a href="${data.loginUrl}" style="background-color: #ffc107; color: black; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Document</a>
              <p>Best regards,<br>HR Team</p>
            </div>
          `
        },
        promotion_transfer: {
          subject: 'Congratulations! Please sign your promotion/transfer documents',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #28a745;">Congratulations on your ${data.newRole}!</h2>
              <p>Hello ${data.name},</p>
              <p>Congratulations on your ${data.newRole} position in the ${data.newDepartment} department!</p>
              <p>To complete this process, please sign your ${data.documentCount} promotion/transfer documents:</p>
              <ul>
                <li>Promotion Letter</li>
                <li>Salary Revision Letter</li>
              </ul>
              <p>Please click the link below to access your documents:</p>
              <a href="${data.loginUrl}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Sign Documents</a>
              <p>Best regards,<br>HR Team</p>
            </div>
          `
        },
        exit: {
          subject: 'Exit Process - Please sign your exit documents',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #6c757d;">Exit Process Documents</h2>
              <p>Hello ${data.name},</p>
              <p>As part of your exit process, please sign your ${data.documentCount} exit documents:</p>
              <ul>
                <li>No Dues Certificate</li>
                <li>Full and Final Settlement</li>
              </ul>
              <p><strong>Last Working Date:</strong> ${new Date(data.lastWorkingDate).toLocaleDateString()}</p>
              <p>Please click the link below to access your documents:</p>
              <a href="${data.loginUrl}" style="background-color: #6c757d; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Sign Documents</a>
              <p>Best regards,<br>HR Team</p>
            </div>
          `
        }
      };

      const template = templates[templateName];
      if (!template) {
        throw new Error(`Email template '${templateName}' not found`);
      }

      return {
        subject: template.subject,
        html: template.html
      };
    } catch (error) {
      logger.error('Email template generation failed', { 
        error: error.message, 
        templateName, 
        data 
      });
      throw error;
    }
  }

  async sendBulkEmail(emails) {
    try {
      const results = [];
      
      for (const emailData of emails) {
        try {
          const result = await this.sendEmail(emailData);
          results.push({ success: true, to: emailData.to, messageId: result.messageId });
        } catch (error) {
          results.push({ success: false, to: emailData.to, error: error.message });
        }
      }

      logger.info('Bulk email sending completed', {
        total: emails.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      });

      return results;
    } catch (error) {
      logger.error('Bulk email sending failed', { error: error.message });
      throw error;
    }
  }

  async verifyConnection() {
    try {
      if (!this.transporter) {
        throw new Error('Email service not initialized');
      }

      await this.transporter.verify();
      
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection verification failed', { error: error.message });
      return false;
    }
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;
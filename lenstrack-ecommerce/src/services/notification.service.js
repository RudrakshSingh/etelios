const nodemailer = require('nodemailer');
const twilio = require('twilio');
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
    new winston.transports.File({ filename: 'logs/notifications.log' })
  ]
});

class NotificationService {
  constructor() {
    this.emailTransporter = null;
    this.twilioClient = null;
    this.initialize();
  }

  /**
   * Initialize notification services
   */
  async initialize() {
    try {
      // Initialize email transporter
      this.emailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      // Initialize Twilio client
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        this.twilioClient = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
      }

      logger.info('Notification services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize notification services:', error);
    }
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(email, token) {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
      
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@lenstrack.com',
        to: email,
        subject: 'Verify Your Email Address',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to Lenstrack!</h2>
            <p>Please click the button below to verify your email address:</p>
            <a href="${verificationUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Verify Email
            </a>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p>${verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
          </div>
        `
      };

      await this.emailTransporter.sendMail(mailOptions);
      logger.info('Email verification sent', { email });
    } catch (error) {
      logger.error('Failed to send email verification:', error);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(email, token) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
      
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@lenstrack.com',
        to: email,
        subject: 'Reset Your Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>You requested to reset your password. Click the button below to reset it:</p>
            <a href="${resetUrl}" 
               style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Password
            </a>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p>${resetUrl}</p>
            <p>This link will expire in 10 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
        `
      };

      await this.emailTransporter.sendMail(mailOptions);
      logger.info('Password reset email sent', { email });
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      throw error;
    }
  }

  /**
   * Send SMS verification
   */
  async sendSMSVerification(phone, code) {
    try {
      if (!this.twilioClient) {
        throw new Error('Twilio not configured');
      }

      const message = await this.twilioClient.messages.create({
        body: `Your Lenstrack verification code is: ${code}. This code expires in 5 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });

      logger.info('SMS verification sent', { phone, messageId: message.sid });
    } catch (error) {
      logger.error('Failed to send SMS verification:', error);
      throw error;
    }
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(order) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@lenstrack.com',
        to: order.customer.email,
        subject: `Order Confirmation - ${order.orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Order Confirmation</h2>
            <p>Thank you for your order! Your order number is: <strong>${order.orderNumber}</strong></p>
            
            <h3>Order Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f8f9fa;">
                  <th style="border: 1px solid #dee2e6; padding: 8px;">Item</th>
                  <th style="border: 1px solid #dee2e6; padding: 8px;">Quantity</th>
                  <th style="border: 1px solid #dee2e6; padding: 8px;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map(item => `
                  <tr>
                    <td style="border: 1px solid #dee2e6; padding: 8px;">${item.product.name}</td>
                    <td style="border: 1px solid #dee2e6; padding: 8px;">${item.quantity}</td>
                    <td style="border: 1px solid #dee2e6; padding: 8px;">₹${item.total}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <h3>Order Total: ₹${order.pricing.total}</h3>
            
            <p>We'll send you another email when your order ships.</p>
          </div>
        `
      };

      await this.emailTransporter.sendMail(mailOptions);
      logger.info('Order confirmation email sent', { orderId: order._id, email: order.customer.email });
    } catch (error) {
      logger.error('Failed to send order confirmation:', error);
      throw error;
    }
  }

  /**
   * Send order shipped notification
   */
  async sendOrderShipped(order) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@lenstrack.com',
        to: order.customer.email,
        subject: `Your Order Has Shipped - ${order.orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Your Order Has Shipped!</h2>
            <p>Great news! Your order <strong>${order.orderNumber}</strong> has been shipped.</p>
            
            ${order.shipping.trackingNumber ? `
              <p><strong>Tracking Number:</strong> ${order.shipping.trackingNumber}</p>
              <p><strong>Carrier:</strong> ${order.shipping.carrier}</p>
            ` : ''}
            
            <p>Expected delivery: ${order.shipping.estimatedDelivery ? new Date(order.shipping.estimatedDelivery).toLocaleDateString() : 'TBD'}</p>
            
            <p>Thank you for shopping with Lenstrack!</p>
          </div>
        `
      };

      await this.emailTransporter.sendMail(mailOptions);
      logger.info('Order shipped notification sent', { orderId: order._id, email: order.customer.email });
    } catch (error) {
      logger.error('Failed to send order shipped notification:', error);
      throw error;
    }
  }

  /**
   * Send WhatsApp notification
   */
  async sendWhatsAppMessage(phone, message) {
    try {
      // This would integrate with WhatsApp Business API
      // For now, we'll just log it
      logger.info('WhatsApp message sent', { phone, message });
    } catch (error) {
      logger.error('Failed to send WhatsApp message:', error);
      throw error;
    }
  }

  /**
   * Send push notification
   */
  async sendPushNotification(userId, title, body, data = {}) {
    try {
      // This would integrate with FCM or similar push notification service
      logger.info('Push notification sent', { userId, title, body, data });
    } catch (error) {
      logger.error('Failed to send push notification:', error);
      throw error;
    }
  }

  /**
   * Send bulk email
   */
  async sendBulkEmail(recipients, subject, html) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@lenstrack.com',
        bcc: recipients,
        subject,
        html
      };

      await this.emailTransporter.sendMail(mailOptions);
      logger.info('Bulk email sent', { recipientCount: recipients.length, subject });
    } catch (error) {
      logger.error('Failed to send bulk email:', error);
      throw error;
    }
  }

  /**
   * Send SMS to multiple recipients
   */
  async sendBulkSMS(recipients, message) {
    try {
      if (!this.twilioClient) {
        throw new Error('Twilio not configured');
      }

      const promises = recipients.map(phone => 
        this.twilioClient.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone
        })
      );

      const results = await Promise.allSettled(promises);
      logger.info('Bulk SMS sent', { recipientCount: recipients.length, successCount: results.filter(r => r.status === 'fulfilled').length });
    } catch (error) {
      logger.error('Failed to send bulk SMS:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;

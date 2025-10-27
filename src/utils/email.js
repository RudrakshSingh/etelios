const nodemailer = require('nodemailer');
const logger = require('./logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      // Verify connection
      await this.transporter.verify();
      this.isInitialized = true;
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.warn('Email service initialization failed:', error.message);
      this.isInitialized = false;
    }
  }

  async sendEmail(to, subject, text, html = null) {
    if (!this.isInitialized) {
      logger.warn('Email service not initialized, skipping email send');
      return { success: false, message: 'Email service not initialized' };
    }

    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        text,
        html
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${to}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error('Failed to send email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendWelcomeEmail(userEmail, userName) {
    const subject = 'Welcome to Etelios HRMS';
    const text = `Welcome ${userName}! Your account has been created successfully.`;
    const html = `
      <h2>Welcome to Etelios HRMS</h2>
      <p>Hello ${userName},</p>
      <p>Your account has been created successfully. You can now access the system.</p>
      <p>Best regards,<br>Etelios Team</p>
    `;

    return this.sendEmail(userEmail, subject, text, html);
  }

  async sendPasswordResetEmail(userEmail, resetToken) {
    const subject = 'Password Reset Request';
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const text = `Click the following link to reset your password: ${resetUrl}`;
    const html = `
      <h2>Password Reset Request</h2>
      <p>You requested a password reset. Click the button below to reset your password:</p>
      <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>If the button doesn't work, copy and paste this link: ${resetUrl}</p>
      <p>This link will expire in 1 hour.</p>
    `;

    return this.sendEmail(userEmail, subject, text, html);
  }
}

// Create singleton instance
const emailService = new EmailService();

// Initialize on module load
emailService.initialize();

module.exports = {
  emailService,
  sendEmail: (to, subject, text, html) => emailService.sendEmail(to, subject, text, html),
  sendWelcomeEmail: (userEmail, userName) => emailService.sendWelcomeEmail(userEmail, userName),
  sendPasswordResetEmail: (userEmail, resetToken) => emailService.sendPasswordResetEmail(userEmail, resetToken)
};

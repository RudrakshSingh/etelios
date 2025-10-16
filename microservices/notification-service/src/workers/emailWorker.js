const { createWorker, createScheduler } = require('../utils/queueUtils');
const { sendEmail } = require('../utils/email');
const logger = require('../config/logger');

/**
 * Email templates
 */
const emailTemplates = {
  welcome: (data) => ({
    subject: 'Welcome to HRMS',
    text: `Welcome ${data.firstName}! Your employee ID is ${data.employeeId}. You can login at ${data.loginUrl}`,
    html: `
      <h1>Welcome to HRMS!</h1>
      <p>Dear ${data.firstName},</p>
      <p>Welcome to our HR Management System! Your employee ID is <strong>${data.employeeId}</strong>.</p>
      <p>You can login to the system at: <a href="${data.loginUrl}">${data.loginUrl}</a></p>
      <p>Best regards,<br>HR Team</p>
    `
  }),

  'password-reset': (data) => ({
    subject: 'Password Reset Request',
    text: `Hello ${data.firstName}, please click the link to reset your password: ${data.resetUrl}`,
    html: `
      <h1>Password Reset Request</h1>
      <p>Dear ${data.firstName},</p>
      <p>You have requested to reset your password. Please click the link below to reset it:</p>
      <p><a href="${data.resetUrl}">Reset Password</a></p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>Best regards,<br>HR Team</p>
    `
  }),

  'transfer-notification': (data) => ({
    subject: 'Transfer Request Notification',
    text: `Hello ${data.firstName}, your transfer request from ${data.fromStore} to ${data.toStore} has been submitted. Effective date: ${data.effectiveDate}`,
    html: `
      <h1>Transfer Request Notification</h1>
      <p>Dear ${data.firstName},</p>
      <p>Your transfer request has been submitted successfully:</p>
      <ul>
        <li><strong>From:</strong> ${data.fromStore}</li>
        <li><strong>To:</strong> ${data.toStore}</li>
        <li><strong>Effective Date:</strong> ${data.effectiveDate}</li>
        <li><strong>Transfer ID:</strong> ${data.transferId}</li>
      </ul>
      <p>You will be notified once the request is reviewed.</p>
      <p>Best regards,<br>HR Team</p>
    `
  }),

  'transfer-approval': (data) => ({
    subject: 'Transfer Request Approved',
    text: `Hello ${data.firstName}, your transfer request from ${data.fromStore} to ${data.toStore} has been approved. Effective date: ${data.effectiveDate}`,
    html: `
      <h1>Transfer Request Approved</h1>
      <p>Dear ${data.firstName},</p>
      <p>Great news! Your transfer request has been approved:</p>
      <ul>
        <li><strong>From:</strong> ${data.fromStore}</li>
        <li><strong>To:</strong> ${data.toStore}</li>
        <li><strong>Effective Date:</strong> ${data.effectiveDate}</li>
        <li><strong>Transfer ID:</strong> ${data.transferId}</li>
      </ul>
      <p>Please prepare for your transition to the new location.</p>
      <p>Best regards,<br>HR Team</p>
    `
  }),

  'transfer-rejection': (data) => ({
    subject: 'Transfer Request Rejected',
    text: `Hello ${data.firstName}, your transfer request has been rejected. Reason: ${data.reason}`,
    html: `
      <h1>Transfer Request Rejected</h1>
      <p>Dear ${data.firstName},</p>
      <p>Unfortunately, your transfer request has been rejected.</p>
      <p><strong>Reason:</strong> ${data.reason}</p>
      <p><strong>Transfer ID:</strong> ${data.transferId}</p>
      <p>If you have any questions, please contact HR.</p>
      <p>Best regards,<br>HR Team</p>
    `
  }),

  'role-change': (data) => ({
    subject: 'Role Change Notification',
    text: `Hello ${data.firstName}, your role has been changed from ${data.oldRole} to ${data.newRole}`,
    html: `
      <h1>Role Change Notification</h1>
      <p>Dear ${data.firstName},</p>
      <p>Your role has been updated:</p>
      <ul>
        <li><strong>Previous Role:</strong> ${data.oldRole}</li>
        <li><strong>New Role:</strong> ${data.newRole}</li>
      </ul>
      <p>Please log in to see your updated permissions and responsibilities.</p>
      <p>Best regards,<br>HR Team</p>
    `
  }),

  'status-change': (data) => ({
    subject: 'Status Change Notification',
    text: `Hello ${data.firstName}, your status has been changed from ${data.oldStatus} to ${data.newStatus}`,
    html: `
      <h1>Status Change Notification</h1>
      <p>Dear ${data.firstName},</p>
      <p>Your employment status has been updated:</p>
      <ul>
        <li><strong>Previous Status:</strong> ${data.oldStatus}</li>
        <li><strong>New Status:</strong> ${data.newStatus}</li>
      </ul>
      <p>If you have any questions about this change, please contact HR.</p>
      <p>Best regards,<br>HR Team</p>
    `
  }),

  'attendance-reminder': (data) => ({
    subject: 'Daily Attendance Reminder',
    text: `Hello ${data.firstName}, don't forget to clock in/out today at ${data.storeName}`,
    html: `
      <h1>Daily Attendance Reminder</h1>
      <p>Dear ${data.firstName},</p>
      <p>This is a friendly reminder to clock in/out today at <strong>${data.storeName}</strong>.</p>
      <p><strong>Date:</strong> ${data.date}</p>
      <p>Remember to use the HRMS app to record your attendance.</p>
      <p>Best regards,<br>HR Team</p>
    `
  })
};

/**
 * Email worker processor
 */
const emailWorkerProcessor = async (job) => {
  try {
    const { to, subject, template, data } = job.data;

    logger.info('Processing email job', { 
      jobName: job.name, 
      jobId: job.id, 
      to, 
      template 
    });

    // Get email template
    const templateFunction = emailTemplates[template];
    if (!templateFunction) {
      throw new Error(`Email template '${template}' not found`);
    }

    // Generate email content
    const emailContent = templateFunction(data);

    // Send email
    await sendEmail({
      to,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html
    });

    logger.info('Email sent successfully', { 
      jobName: job.name, 
      jobId: job.id, 
      to, 
      template 
    });

    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    logger.error('Error processing email job', { 
      jobName: job.name, 
      jobId: job.id, 
      error: error.message 
    });
    throw error;
  }
};

/**
 * Initialize email worker
 */
const initializeEmailWorker = () => {
  try {
    // Create scheduler for delayed jobs
    createScheduler('email-queue');

    // Create worker
    const worker = createWorker('email-queue', emailWorkerProcessor);

    logger.info('Email worker initialized successfully');

    return worker;
  } catch (error) {
    logger.error('Error initializing email worker', { error: error.message });
    throw error;
  }
};

module.exports = {
  initializeEmailWorker,
  emailWorkerProcessor
};
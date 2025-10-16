const { addJob } = require('../utils/queueUtils');
const logger = require('../config/logger');

/**
 * Adds a welcome email job to the queue
 * @param {string} email - Recipient email
 * @param {string} firstName - Recipient first name
 * @param {string} employeeId - Employee ID
 */
const sendWelcomeEmail = async (email, firstName, employeeId) => {
  try {
    await addJob('email-queue', 'welcome-email', {
      to: email,
      subject: 'Welcome to HRMS',
      template: 'welcome',
      data: {
        firstName,
        employeeId,
        loginUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
      }
    }, {
      delay: 1000, // 1 second delay
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    logger.info('Welcome email job added to queue', { email, employeeId });
  } catch (error) {
    logger.error('Error adding welcome email job', { error: error.message, email, employeeId });
    throw error;
  }
};

/**
 * Adds a password reset email job to the queue
 * @param {string} email - Recipient email
 * @param {string} resetToken - Password reset token
 * @param {string} firstName - Recipient first name
 */
const sendPasswordResetEmail = async (email, resetToken, firstName) => {
  try {
    await addJob('email-queue', 'password-reset-email', {
      to: email,
      subject: 'Password Reset Request',
      template: 'password-reset',
      data: {
        firstName,
        resetToken,
        resetUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`
      }
    }, {
      delay: 1000,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    logger.info('Password reset email job added to queue', { email });
  } catch (error) {
    logger.error('Error adding password reset email job', { error: error.message, email });
    throw error;
  }
};

/**
 * Adds a transfer notification email job to the queue
 * @param {string} email - Recipient email
 * @param {string} firstName - Recipient first name
 * @param {string} transferId - Transfer ID
 * @param {string} fromStore - From store name
 * @param {string} toStore - To store name
 * @param {string} effectiveDate - Effective date
 */
const sendTransferNotificationEmail = async (email, firstName, transferId, fromStore, toStore, effectiveDate) => {
  try {
    await addJob('email-queue', 'transfer-notification-email', {
      to: email,
      subject: 'Transfer Request Notification',
      template: 'transfer-notification',
      data: {
        firstName,
        transferId,
        fromStore,
        toStore,
        effectiveDate
      }
    }, {
      delay: 1000,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    logger.info('Transfer notification email job added to queue', { email, transferId });
  } catch (error) {
    logger.error('Error adding transfer notification email job', { error: error.message, email, transferId });
    throw error;
  }
};

/**
 * Adds a transfer approval email job to the queue
 * @param {string} email - Recipient email
 * @param {string} firstName - Recipient first name
 * @param {string} transferId - Transfer ID
 * @param {string} fromStore - From store name
 * @param {string} toStore - To store name
 * @param {string} effectiveDate - Effective date
 */
const sendTransferApprovalEmail = async (email, firstName, transferId, fromStore, toStore, effectiveDate) => {
  try {
    await addJob('email-queue', 'transfer-approval-email', {
      to: email,
      subject: 'Transfer Request Approved',
      template: 'transfer-approval',
      data: {
        firstName,
        transferId,
        fromStore,
        toStore,
        effectiveDate
      }
    }, {
      delay: 1000,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    logger.info('Transfer approval email job added to queue', { email, transferId });
  } catch (error) {
    logger.error('Error adding transfer approval email job', { error: error.message, email, transferId });
    throw error;
  }
};

/**
 * Adds a transfer rejection email job to the queue
 * @param {string} email - Recipient email
 * @param {string} firstName - Recipient first name
 * @param {string} transferId - Transfer ID
 * @param {string} reason - Rejection reason
 */
const sendTransferRejectionEmail = async (email, firstName, transferId, reason) => {
  try {
    await addJob('email-queue', 'transfer-rejection-email', {
      to: email,
      subject: 'Transfer Request Rejected',
      template: 'transfer-rejection',
      data: {
        firstName,
        transferId,
        reason
      }
    }, {
      delay: 1000,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    logger.info('Transfer rejection email job added to queue', { email, transferId });
  } catch (error) {
    logger.error('Error adding transfer rejection email job', { error: error.message, email, transferId });
    throw error;
  }
};

/**
 * Adds a role change notification email job to the queue
 * @param {string} email - Recipient email
 * @param {string} firstName - Recipient first name
 * @param {string} oldRole - Old role name
 * @param {string} newRole - New role name
 */
const sendRoleChangeEmail = async (email, firstName, oldRole, newRole) => {
  try {
    await addJob('email-queue', 'role-change-email', {
      to: email,
      subject: 'Role Change Notification',
      template: 'role-change',
      data: {
        firstName,
        oldRole,
        newRole
      }
    }, {
      delay: 1000,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    logger.info('Role change email job added to queue', { email, oldRole, newRole });
  } catch (error) {
    logger.error('Error adding role change email job', { error: error.message, email, oldRole, newRole });
    throw error;
  }
};

/**
 * Adds a status change notification email job to the queue
 * @param {string} email - Recipient email
 * @param {string} firstName - Recipient first name
 * @param {string} oldStatus - Old status
 * @param {string} newStatus - New status
 */
const sendStatusChangeEmail = async (email, firstName, oldStatus, newStatus) => {
  try {
    await addJob('email-queue', 'status-change-email', {
      to: email,
      subject: 'Status Change Notification',
      template: 'status-change',
      data: {
        firstName,
        oldStatus,
        newStatus
      }
    }, {
      delay: 1000,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    logger.info('Status change email job added to queue', { email, oldStatus, newStatus });
  } catch (error) {
    logger.error('Error adding status change email job', { error: error.message, email, oldStatus, newStatus });
    throw error;
  }
};

/**
 * Adds a daily attendance reminder email job to the queue
 * @param {string} email - Recipient email
 * @param {string} firstName - Recipient first name
 * @param {string} storeName - Store name
 */
const sendAttendanceReminderEmail = async (email, firstName, storeName) => {
  try {
    await addJob('email-queue', 'attendance-reminder-email', {
      to: email,
      subject: 'Daily Attendance Reminder',
      template: 'attendance-reminder',
      data: {
        firstName,
        storeName,
        date: new Date().toLocaleDateString()
      }
    }, {
      delay: 1000,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    logger.info('Attendance reminder email job added to queue', { email, storeName });
  } catch (error) {
    logger.error('Error adding attendance reminder email job', { error: error.message, email, storeName });
    throw error;
  }
};

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendTransferNotificationEmail,
  sendTransferApprovalEmail,
  sendTransferRejectionEmail,
  sendRoleChangeEmail,
  sendStatusChangeEmail,
  sendAttendanceReminderEmail
};
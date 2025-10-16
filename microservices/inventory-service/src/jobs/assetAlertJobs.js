const cron = require('node-cron');
const Asset = require('../models/Asset.model');
const User = require('../models/User.model');
const logger = require('../config/logger');
const { sendEmail } = require('../utils/email');
const { sendSMS } = require('../utils/sms');
const { recordAuditLog } = require('../utils/audit');

/**
 * Asset Alert Jobs
 * Handles automated alerts for unreturned assets
 */

class AssetAlertJobs {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Start the asset alert scheduler
   */
  start() {
    if (this.isRunning) {
      logger.warn('Asset alert jobs already running');
      return;
    }

    // Run daily at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
      await this.checkAndSendAssetAlerts();
    });

    // Run weekly on Monday at 10:00 AM for recovery alerts
    cron.schedule('0 10 * * 1', async () => {
      await this.checkAndSendRecoveryAlerts();
    });

    this.isRunning = true;
    logger.info('Asset alert jobs started');
  }

  /**
   * Stop the asset alert scheduler
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Asset alert jobs not running');
      return;
    }

    cron.destroy();
    this.isRunning = false;
    logger.info('Asset alert jobs stopped');
  }

  /**
   * Check and send alerts for unreturned assets
   */
  async checkAndSendAssetAlerts() {
    try {
      logger.info('Starting asset alert check...');

      // Find assets that need alerts
      const assets = await Asset.findAssetsRequiringAlerts();
      
      if (assets.length === 0) {
        logger.info('No assets require alerts');
        return;
      }

      logger.info(`Found ${assets.length} assets requiring alerts`);

      let alertsSent = 0;
      let alertsFailed = 0;

      for (const asset of assets) {
        try {
          await this.sendAssetAlert(asset);
          await asset.sendAlert();
          alertsSent++;
        } catch (error) {
          logger.error('Failed to send alert for asset', {
            assetId: asset._id,
            error: error.message
          });
          alertsFailed++;
        }
      }

      // Record audit log
      await recordAuditLog('system', 'ASSET_ALERTS_SENT', {
        totalAssets: assets.length,
        alertsSent,
        alertsFailed
      });

      logger.info('Asset alert check completed', {
        totalAssets: assets.length,
        alertsSent,
        alertsFailed
      });

    } catch (error) {
      logger.error('Error in checkAndSendAssetAlerts', { error: error.message });
    }
  }

  /**
   * Send alert for a specific asset
   */
  async sendAssetAlert(asset) {
    try {
      // Get employee details
      const employee = await User.findById(asset.assigned_to);
      if (!employee) {
        throw new Error('Employee not found');
      }

      // Calculate days since issue
      const daysSinceIssue = Math.floor((new Date() - asset.assigned_date) / (1000 * 60 * 60 * 24));

      // Prepare alert data
      const alertData = {
        employeeName: `${employee.first_name} ${employee.last_name}`,
        employeeEmail: employee.email,
        employeePhone: employee.phone,
        assetName: asset.name,
        assetId: asset.asset_id,
        issueDate: asset.assigned_date,
        daysSinceIssue,
        category: asset.category,
        condition: asset.condition
      };

      // Send email alert
      if (employee.email) {
        await this.sendEmailAlert(alertData);
      }

      // Send SMS alert
      if (employee.phone) {
        await this.sendSMSAlert(alertData);
      }

      logger.info('Asset alert sent successfully', {
        assetId: asset._id,
        employeeId: employee._id,
        daysSinceIssue
      });

    } catch (error) {
      logger.error('Error sending asset alert', {
        assetId: asset._id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send email alert
   */
  async sendEmailAlert(alertData) {
    try {
      const subject = `Asset Return Reminder - ${alertData.assetName}`;
      const htmlContent = this.generateEmailTemplate(alertData);

      await sendEmail({
        to: alertData.employeeEmail,
        subject,
        html: htmlContent
      });

      logger.info('Email alert sent', {
        email: alertData.employeeEmail,
        assetName: alertData.assetName
      });

    } catch (error) {
      logger.error('Error sending email alert', { error: error.message });
      throw error;
    }
  }

  /**
   * Send SMS alert
   */
  async sendSMSAlert(alertData) {
    try {
      const message = `Reminder: Please return asset "${alertData.assetName}" (${alertData.assetId}) issued on ${alertData.issueDate.toDateString()}. ${alertData.daysSinceIssue} days overdue.`;

      await sendSMS({
        to: alertData.employeePhone,
        message
      });

      logger.info('SMS alert sent', {
        phone: alertData.employeePhone,
        assetName: alertData.assetName
      });

    } catch (error) {
      logger.error('Error sending SMS alert', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate email template for asset alert
   */
  generateEmailTemplate(alertData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .content { padding: 20px; }
          .asset-details { background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; }
          .urgent { color: #dc3545; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Asset Return Reminder</h2>
          </div>
          <div class="content">
            <p>Dear ${alertData.employeeName},</p>
            
            <p>This is a reminder that you have an outstanding company asset that needs to be returned:</p>
            
            <div class="asset-details">
              <h3>Asset Details:</h3>
              <ul>
                <li><strong>Asset Name:</strong> ${alertData.assetName}</li>
                <li><strong>Asset ID:</strong> ${alertData.assetId}</li>
                <li><strong>Category:</strong> ${alertData.category}</li>
                <li><strong>Issue Date:</strong> ${alertData.issueDate.toDateString()}</li>
                <li><strong>Days Since Issue:</strong> <span class="urgent">${alertData.daysSinceIssue} days</span></li>
                <li><strong>Current Condition:</strong> ${alertData.condition}</li>
              </ul>
            </div>
            
            <p>Please return this asset to the HR department as soon as possible. Failure to return company assets may result in recovery charges being deducted from your salary or final settlement.</p>
            
            <p>If you have any questions or concerns, please contact the HR department immediately.</p>
            
            <p>Thank you for your cooperation.</p>
          </div>
          <div class="footer">
            <p>This is an automated reminder from the HRMS system.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Check and send recovery alerts
   */
  async checkAndSendRecoveryAlerts() {
    try {
      logger.info('Starting recovery alert check...');

      // Find assets with recovery required
      const assets = await Asset.findAssetsWithRecovery();
      
      if (assets.length === 0) {
        logger.info('No assets require recovery alerts');
        return;
      }

      logger.info(`Found ${assets.length} assets requiring recovery`);

      let recoveryAlertsSent = 0;
      let recoveryAlertsFailed = 0;

      for (const asset of assets) {
        try {
          await this.sendRecoveryAlert(asset);
          recoveryAlertsSent++;
        } catch (error) {
          logger.error('Failed to send recovery alert for asset', {
            assetId: asset._id,
            error: error.message
          });
          recoveryAlertsFailed++;
        }
      }

      // Record audit log
      await recordAuditLog('system', 'RECOVERY_ALERTS_SENT', {
        totalAssets: assets.length,
        recoveryAlertsSent,
        recoveryAlertsFailed
      });

      logger.info('Recovery alert check completed', {
        totalAssets: assets.length,
        recoveryAlertsSent,
        recoveryAlertsFailed
      });

    } catch (error) {
      logger.error('Error in checkAndSendRecoveryAlerts', { error: error.message });
    }
  }

  /**
   * Send recovery alert for a specific asset
   */
  async sendRecoveryAlert(asset) {
    try {
      // Get employee details
      const employee = await User.findById(asset.assigned_to);
      if (!employee) {
        throw new Error('Employee not found');
      }

      // Prepare recovery alert data
      const recoveryData = {
        employeeName: `${employee.first_name} ${employee.last_name}`,
        employeeEmail: employee.email,
        employeePhone: employee.phone,
        assetName: asset.name,
        assetId: asset.asset_id,
        recoveryAmount: asset.asset_register.recovery_amount,
        recoveryReason: asset.asset_register.recovery_reason,
        issueDate: asset.assigned_date
      };

      // Send email alert
      if (employee.email) {
        await this.sendRecoveryEmailAlert(recoveryData);
      }

      // Send SMS alert
      if (employee.phone) {
        await this.sendRecoverySMSAlert(recoveryData);
      }

      logger.info('Recovery alert sent successfully', {
        assetId: asset._id,
        employeeId: employee._id,
        recoveryAmount: recoveryData.recoveryAmount
      });

    } catch (error) {
      logger.error('Error sending recovery alert', {
        assetId: asset._id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send recovery email alert
   */
  async sendRecoveryEmailAlert(recoveryData) {
    try {
      const subject = `Asset Recovery Notice - ${recoveryData.assetName}`;
      const htmlContent = this.generateRecoveryEmailTemplate(recoveryData);

      await sendEmail({
        to: recoveryData.employeeEmail,
        subject,
        html: htmlContent
      });

      logger.info('Recovery email alert sent', {
        email: recoveryData.employeeEmail,
        assetName: recoveryData.assetName
      });

    } catch (error) {
      logger.error('Error sending recovery email alert', { error: error.message });
      throw error;
    }
  }

  /**
   * Send recovery SMS alert
   */
  async sendRecoverySMSAlert(recoveryData) {
    try {
      const message = `Recovery Notice: Asset "${recoveryData.assetName}" (${recoveryData.assetId}) requires recovery of ₹${recoveryData.recoveryAmount}. Reason: ${recoveryData.recoveryReason}. Please contact HR immediately.`;

      await sendSMS({
        to: recoveryData.employeePhone,
        message
      });

      logger.info('Recovery SMS alert sent', {
        phone: recoveryData.employeePhone,
        assetName: recoveryData.assetName
      });

    } catch (error) {
      logger.error('Error sending recovery SMS alert', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate recovery email template
   */
  generateRecoveryEmailTemplate(recoveryData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc3545; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .content { padding: 20px; }
          .recovery-details { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; }
          .amount { font-size: 24px; font-weight: bold; color: #dc3545; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Asset Recovery Notice</h2>
          </div>
          <div class="content">
            <p>Dear ${recoveryData.employeeName},</p>
            
            <p>This is a formal notice regarding the recovery of company assets:</p>
            
            <div class="recovery-details">
              <h3>Recovery Details:</h3>
              <ul>
                <li><strong>Asset Name:</strong> ${recoveryData.assetName}</li>
                <li><strong>Asset ID:</strong> ${recoveryData.assetId}</li>
                <li><strong>Issue Date:</strong> ${recoveryData.issueDate.toDateString()}</li>
                <li><strong>Recovery Amount:</strong> <span class="amount">₹${recoveryData.recoveryAmount}</span></li>
                <li><strong>Reason:</strong> ${recoveryData.recoveryReason}</li>
              </ul>
            </div>
            
            <p><strong>Important:</strong> The recovery amount of ₹${recoveryData.recoveryAmount} will be deducted from your salary or final settlement as per company policy.</p>
            
            <p>If you have any questions or wish to dispute this recovery, please contact the HR department immediately.</p>
            
            <p>This notice is generated automatically by the HRMS system.</p>
          </div>
          <div class="footer">
            <p>This is an automated notice from the HRMS system.</p>
            <p>Please contact HR for any queries.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new AssetAlertJobs();

const Asset = require('../models/Asset.model');
const User = require('../models/User.model');
const logger = require('../config/logger');
const { recordAuditLog } = require('../utils/audit');
const { sendEmail } = require('../utils/email');
const { sendSMS } = require('../utils/sms');
const assetRecoveryService = require('../services/assetRecovery.service');
const assetRegisterService = require('../services/assetRegister.service');

class AssetRegisterController {
  /**
   * Issue asset with complete register details
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next function
   */
  async issueAsset(req, res, next) {
    try {
      const { assetId } = req.params;
      const registerData = req.body;
      const issuedBy = req.user.id;

      const result = await assetRegisterService.issueAsset(assetId, registerData, issuedBy);

      res.status(200).json(result);

    } catch (error) {
      logger.error('Error in issueAsset', { error: error.message });
      next(error);
    }
  }

  /**
   * Return asset with register details
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next function
   */
  async returnAsset(req, res, next) {
    try {
      const { assetId } = req.params;
      const returnData = req.body;
      const receivedBy = req.user.id;

      const result = await assetRegisterService.returnAsset(assetId, returnData, receivedBy);

      res.status(200).json(result);

    } catch (error) {
      logger.error('Error in returnAsset', { error: error.message });
      next(error);
    }
  }

  /**
   * Acknowledge asset receipt with signatures
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next function
   */
  async acknowledgeAsset(req, res, next) {
    try {
      const { assetId } = req.params;
      const acknowledgmentData = req.body;
      const acknowledgedBy = req.user.id;

      const result = await assetRegisterService.acknowledgeAsset(assetId, acknowledgmentData, acknowledgedBy);

      res.status(200).json(result);

    } catch (error) {
      logger.error('Error in acknowledgeAsset', { error: error.message });
      next(error);
    }
  }

  /**
   * Get asset register for an employee
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next function
   */
  async getEmployeeAssetRegister(req, res, next) {
    try {
      const { employeeId } = req.params;
      const options = req.query;

      const result = await assetRegisterService.getEmployeeAssetRegister(employeeId, options);

      res.status(200).json(result);

    } catch (error) {
      logger.error('Error in getEmployeeAssetRegister', { error: error.message });
      next(error);
    }
  }

  /**
   * Get all asset registers with filtering
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next function
   */
  async getAllAssetRegisters(req, res, next) {
    try {
      const filters = req.query;

      const result = await assetRegisterService.getAllAssetRegisters(filters);

      res.status(200).json(result);

    } catch (error) {
      logger.error('Error in getAllAssetRegisters', { error: error.message });
      next(error);
    }
  }

  /**
   * Mark recovery required for damaged/missing asset
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next function
   */
  async markRecoveryRequired(req, res, next) {
    try {
      const { assetId } = req.params;
      const recoveryData = req.body;
      const markedBy = req.user.id;

      // Find the asset
      const asset = await Asset.findById(assetId);
      if (!asset) {
        return res.status(404).json({
          success: false,
          message: 'Asset not found'
        });
      }

      // Mark recovery required
      await asset.markRecoveryRequired(recoveryData);

      // Record audit log
      await recordAuditLog(markedBy, 'ASSET_RECOVERY_MARKED', {
        assetId: asset._id,
        assetName: asset.name,
        recoveryAmount: recoveryData.amount,
        recoveryReason: recoveryData.reason
      });

      logger.info('Asset recovery marked successfully', {
        assetId: asset._id,
        recoveryAmount: recoveryData.amount,
        markedBy
      });

      res.status(200).json({
        success: true,
        message: 'Asset recovery marked successfully',
        data: asset
      });

    } catch (error) {
      logger.error('Error in markRecoveryRequired', { error: error.message });
      next(error);
    }
  }

  /**
   * Send alerts for unreturned assets
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next function
   */
  async sendAlertsForUnreturnedAssets(req, res, next) {
    try {
      const sentBy = req.user.id;

      // Find assets requiring alerts
      const assets = await Asset.findAssetsRequiringAlerts();

      let alertsSent = 0;
      const alertResults = [];

      for (const asset of assets) {
        try {
          // Send alert
          await asset.sendAlert();

          // Get employee details
          const employee = await User.findById(asset.assigned_to);
          if (employee) {
            // Send email alert
            await sendEmail({
              to: employee.email,
              subject: 'Asset Return Reminder',
              template: 'asset-return-reminder',
              data: {
                employeeName: employee.first_name,
                assetName: asset.name,
                assetId: asset.asset_id,
                issueDate: asset.assigned_date
              }
            });

            // Send SMS alert (if phone number available)
            if (employee.phone) {
              await sendSMS({
                to: employee.phone,
                message: `Reminder: Please return asset ${asset.name} (${asset.asset_id}) issued on ${asset.assigned_date.toDateString()}`
              });
            }

            alertsSent++;
            alertResults.push({
              assetId: asset._id,
              assetName: asset.name,
              employeeName: employee.first_name,
              status: 'sent'
            });
          }
        } catch (error) {
          logger.error('Error sending alert for asset', {
            assetId: asset._id,
            error: error.message
          });
          alertResults.push({
            assetId: asset._id,
            assetName: asset.name,
            status: 'failed',
            error: error.message
          });
        }
      }

      // Record audit log
      await recordAuditLog(sentBy, 'ASSET_ALERTS_SENT', {
        totalAssets: assets.length,
        alertsSent
      });

      logger.info('Asset alerts sent successfully', {
        totalAssets: assets.length,
        alertsSent,
        sentBy
      });

      res.status(200).json({
        success: true,
        message: 'Asset alerts processed successfully',
        data: {
          totalAssets: assets.length,
          alertsSent,
          results: alertResults
        }
      });

    } catch (error) {
      logger.error('Error in sendAlertsForUnreturnedAssets', { error: error.message });
      next(error);
    }
  }

  /**
   * Get assets with recovery required
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next function
   */
  async getAssetsWithRecovery(req, res, next) {
    try {
      const assets = await Asset.findAssetsWithRecovery()
        .populate('assigned_to', 'employee_id first_name last_name email')
        .populate('assigned_by', 'first_name last_name email');

      res.status(200).json({
        success: true,
        message: 'Assets with recovery retrieved successfully',
        data: assets
      });

    } catch (error) {
      logger.error('Error in getAssetsWithRecovery', { error: error.message });
      next(error);
    }
  }

  /**
   * Generate asset register report
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next function
   */
  async generateAssetRegisterReport(req, res, next) {
    try {
      const { 
        dateFrom, 
        dateTo, 
        category, 
        status,
        format = 'json' 
      } = req.query;

      const filter = {};

      // Apply date filter
      if (dateFrom || dateTo) {
        filter.assigned_date = {};
        if (dateFrom) filter.assigned_date.$gte = new Date(dateFrom);
        if (dateTo) filter.assigned_date.$lte = new Date(dateTo);
      }

      if (category) filter.category = category;
      if (status) filter.status = status;

      const assets = await Asset.find(filter)
        .populate('assigned_to', 'employee_id first_name last_name email')
        .populate('assigned_by', 'first_name last_name email')
        .sort({ assigned_date: -1 });

      // Generate report data
      const reportData = {
        generatedAt: new Date(),
        filters: { dateFrom, dateTo, category, status },
        summary: {
          totalAssets: assets.length,
          byCategory: {},
          byStatus: {},
          totalValue: 0
        },
        assets: assets.map(asset => ({
          assetId: asset.asset_id,
          name: asset.name,
          category: asset.category,
          status: asset.status,
          condition: asset.condition,
          purchasePrice: asset.purchase_price,
          employee: asset.assigned_to ? {
            id: asset.assigned_to.employee_id,
            name: `${asset.assigned_to.first_name} ${asset.assigned_to.last_name}`,
            email: asset.assigned_to.email
          } : null,
          issueDate: asset.assigned_date,
          returnDate: asset.return_date,
          registerDetails: asset.asset_register
        }))
      };

      // Calculate summary statistics
      assets.forEach(asset => {
        // By category
        if (!reportData.summary.byCategory[asset.category]) {
          reportData.summary.byCategory[asset.category] = 0;
        }
        reportData.summary.byCategory[asset.category]++;

        // By status
        if (!reportData.summary.byStatus[asset.status]) {
          reportData.summary.byStatus[asset.status] = 0;
        }
        reportData.summary.byStatus[asset.status]++;

        // Total value
        reportData.summary.totalValue += asset.purchase_price || 0;
      });

      res.status(200).json({
        success: true,
        message: 'Asset register report generated successfully',
        data: reportData
      });

    } catch (error) {
      logger.error('Error in generateAssetRegisterReport', { error: error.message });
      next(error);
    }
  }

  /**
   * Upload asset condition photos/receipts
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next function
   */
  async uploadAssetDocuments(req, res, next) {
    try {
      const { assetId } = req.params;
      const { type, description } = req.body;
      const uploadedBy = req.user.id;

      // Find the asset
      const asset = await Asset.findById(assetId);
      if (!asset) {
        return res.status(404).json({
          success: false,
          message: 'Asset not found'
        });
      }

      // Handle file upload (assuming multer middleware is used)
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      // Add document to asset
      const document = {
        name: req.file.originalname,
        type: type || 'condition_photo',
        url: req.file.path,
        uploaded_at: new Date(),
        uploaded_by: uploadedBy,
        description: description
      };

      asset.documents.push(document);
      await asset.save();

      // Record audit log
      await recordAuditLog(uploadedBy, 'ASSET_DOCUMENT_UPLOADED', {
        assetId: asset._id,
        assetName: asset.name,
        documentType: type,
        fileName: req.file.originalname
      });

      logger.info('Asset document uploaded successfully', {
        assetId: asset._id,
        documentType: type,
        uploadedBy
      });

      res.status(200).json({
        success: true,
        message: 'Asset document uploaded successfully',
        data: document
      });

    } catch (error) {
      logger.error('Error in uploadAssetDocuments', { error: error.message });
      next(error);
    }
  }

  /**
   * Initiate recovery process for damaged/missing asset
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next function
   */
  async initiateRecovery(req, res, next) {
    try {
      const { assetId } = req.params;
      const recoveryData = req.body;
      const initiatedBy = req.user.id;

      const result = await assetRecoveryService.initiateRecovery(assetId, recoveryData, initiatedBy);

      res.status(200).json({
        success: true,
        message: 'Recovery process initiated successfully',
        data: result
      });

    } catch (error) {
      logger.error('Error in initiateRecovery', { error: error.message });
      next(error);
    }
  }

  /**
   * Process recovery payment
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next function
   */
  async processRecoveryPayment(req, res, next) {
    try {
      const { assetId } = req.params;
      const paymentData = req.body;
      const processedBy = req.user.id;

      const result = await assetRecoveryService.processRecoveryPayment(assetId, paymentData, processedBy);

      res.status(200).json({
        success: true,
        message: 'Recovery payment processed successfully',
        data: result
      });

    } catch (error) {
      logger.error('Error in processRecoveryPayment', { error: error.message });
      next(error);
    }
  }

  /**
   * Cancel recovery process
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next function
   */
  async cancelRecovery(req, res, next) {
    try {
      const { assetId } = req.params;
      const { reason } = req.body;
      const cancelledBy = req.user.id;

      const result = await assetRecoveryService.cancelRecovery(assetId, reason, cancelledBy);

      res.status(200).json({
        success: true,
        message: 'Recovery process cancelled successfully',
        data: result
      });

    } catch (error) {
      logger.error('Error in cancelRecovery', { error: error.message });
      next(error);
    }
  }

  /**
   * Get recovery statistics
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next function
   */
  async getRecoveryStatistics(req, res, next) {
    try {
      const statistics = await assetRecoveryService.getRecoveryStatistics();

      res.status(200).json({
        success: true,
        message: 'Recovery statistics retrieved successfully',
        data: statistics
      });

    } catch (error) {
      logger.error('Error in getRecoveryStatistics', { error: error.message });
      next(error);
    }
  }
}

module.exports = new AssetRegisterController();

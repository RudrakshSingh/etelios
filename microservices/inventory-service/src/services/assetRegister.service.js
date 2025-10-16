const Asset = require('../models/Asset.model');
const User = require('../models/User.model');
const Store = require('../models/Store.model');
const logger = require('../config/logger');
const { recordAuditLog } = require('../utils/audit');
const { sendEmail } = require('../utils/email');
const { sendSMS } = require('../utils/sms');

/**
 * Production-ready Asset Register Service
 * Handles all asset register operations with comprehensive validation and error handling
 */

class AssetRegisterService {
  /**
   * Issue asset with complete register details
   * @param {string} assetId - Asset ID
   * @param {Object} registerData - Register data
   * @param {string} issuedBy - User ID who issued the asset
   * @returns {Promise<Object>} Issue result
   */
  async issueAsset(assetId, registerData, issuedBy) {
    try {
      // Validate input data
      this.validateIssueData(registerData);

      // Find and validate asset
      const asset = await Asset.findById(assetId);
      if (!asset) {
        throw new Error('Asset not found');
      }

      if (asset.status !== 'available') {
        throw new Error('Asset must be available to issue');
      }

      // Validate employee exists
      const employee = await User.findById(registerData.employee_id);
      if (!employee) {
        throw new Error('Employee not found');
      }

      if (employee.status !== 'active') {
        throw new Error('Employee must be active to receive assets');
      }

      // Validate store exists (if provided)
      if (registerData.store_id) {
        const store = await Store.findById(registerData.store_id);
        if (!store) {
          throw new Error('Store not found');
        }
      }

      // Validate reporting manager (if provided)
      if (registerData.reporting_manager_id) {
        const manager = await User.findById(registerData.reporting_manager_id);
        if (!manager) {
          throw new Error('Reporting manager not found');
        }
      }

      // Issue asset with register details
      await asset.issueAssetWithRegister(registerData, issuedBy);

      // Send notification to employee
      await this.sendAssetIssueNotification(employee, asset, registerData);

      // Record audit log
      await recordAuditLog(issuedBy, 'ASSET_ISSUED', {
        assetId: asset._id,
        assetName: asset.name,
        employeeId: registerData.employee_id,
        employeeName: registerData.employee_name
      });

      logger.info('Asset issued successfully', {
        assetId: asset._id,
        employeeId: registerData.employee_id,
        issuedBy
      });

      return {
        success: true,
        message: 'Asset issued successfully',
        data: asset
      };

    } catch (error) {
      logger.error('Error issuing asset', {
        assetId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Return asset with register details
   * @param {string} assetId - Asset ID
   * @param {Object} returnData - Return data
   * @param {string} receivedBy - User ID who received the asset
   * @returns {Promise<Object>} Return result
   */
  async returnAsset(assetId, returnData, receivedBy) {
    try {
      // Validate input data
      this.validateReturnData(returnData);

      // Find and validate asset
      const asset = await Asset.findById(assetId);
      if (!asset) {
        throw new Error('Asset not found');
      }

      if (asset.status !== 'assigned') {
        throw new Error('Asset must be assigned to return');
      }

      // Return asset with register details
      await asset.returnAssetWithRegister(returnData, receivedBy);

      // Get employee details for notification
      const employee = await User.findById(asset.assigned_to);
      if (employee) {
        await this.sendAssetReturnNotification(employee, asset, returnData);
      }

      // Record audit log
      await recordAuditLog(receivedBy, 'ASSET_RETURNED', {
        assetId: asset._id,
        assetName: asset.name,
        condition: returnData.condition_at_return,
        damageRemarks: returnData.damage_remarks
      });

      logger.info('Asset returned successfully', {
        assetId: asset._id,
        receivedBy
      });

      return {
        success: true,
        message: 'Asset returned successfully',
        data: asset
      };

    } catch (error) {
      logger.error('Error returning asset', {
        assetId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Acknowledge asset receipt
   * @param {string} assetId - Asset ID
   * @param {Object} acknowledgmentData - Acknowledgment data
   * @param {string} acknowledgedBy - User ID who acknowledged
   * @returns {Promise<Object>} Acknowledgment result
   */
  async acknowledgeAsset(assetId, acknowledgmentData, acknowledgedBy) {
    try {
      // Validate input data
      this.validateAcknowledgmentData(acknowledgmentData);

      // Find and validate asset
      const asset = await Asset.findById(assetId);
      if (!asset) {
        throw new Error('Asset not found');
      }

      if (asset.status !== 'assigned') {
        throw new Error('Asset must be assigned to acknowledge');
      }

      // Acknowledge asset
      await asset.acknowledgeAsset(acknowledgmentData);

      // Record audit log
      await recordAuditLog(acknowledgedBy, 'ASSET_ACKNOWLEDGED', {
        assetId: asset._id,
        assetName: asset.name
      });

      logger.info('Asset acknowledged successfully', {
        assetId: asset._id,
        acknowledgedBy
      });

      return {
        success: true,
        message: 'Asset acknowledged successfully',
        data: asset
      };

    } catch (error) {
      logger.error('Error acknowledging asset', {
        assetId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get employee asset register
   * @param {string} employeeId - Employee ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Employee asset register
   */
  async getEmployeeAssetRegister(employeeId, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const skip = (page - 1) * limit;

      // Validate employee exists
      const employee = await User.findById(employeeId);
      if (!employee) {
        throw new Error('Employee not found');
      }

      // Find assets assigned to employee
      const assets = await Asset.find({
        assigned_to: employeeId,
        status: 'assigned'
      })
      .populate('assigned_to', 'employee_id first_name last_name email')
      .populate('assigned_by', 'first_name last_name email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ assigned_date: -1 });

      const total = await Asset.countDocuments({
        assigned_to: employeeId,
        status: 'assigned'
      });

      return {
        success: true,
        data: {
          assets,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total
          }
        }
      };

    } catch (error) {
      logger.error('Error getting employee asset register', {
        employeeId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get all asset registers with filtering
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Asset registers
   */
  async getAllAssetRegisters(filters = {}) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        status, 
        category, 
        employeeId,
        search,
        dateFrom,
        dateTo 
      } = filters;

      const skip = (page - 1) * limit;
      const filter = {};

      // Apply filters
      if (status) filter.status = status;
      if (category) filter.category = category;
      if (employeeId) filter.assigned_to = employeeId;

      // Date range filter
      if (dateFrom || dateTo) {
        filter.assigned_date = {};
        if (dateFrom) filter.assigned_date.$gte = new Date(dateFrom);
        if (dateTo) filter.assigned_date.$lte = new Date(dateTo);
      }

      // Search filter
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { 'asset_register.employee_name': { $regex: search, $options: 'i' } },
          { 'asset_register.employee_code': { $regex: search, $options: 'i' } }
        ];
      }

      const assets = await Asset.find(filter)
        .populate('assigned_to', 'employee_id first_name last_name email')
        .populate('assigned_by', 'first_name last_name email')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ assigned_date: -1 });

      const total = await Asset.countDocuments(filter);

      return {
        success: true,
        data: {
          assets,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total
          }
        }
      };

    } catch (error) {
      logger.error('Error getting asset registers', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send asset issue notification
   */
  async sendAssetIssueNotification(employee, asset, registerData) {
    try {
      const subject = `Asset Issued - ${asset.name}`;
      const htmlContent = this.generateAssetIssueEmailTemplate(employee, asset, registerData);

      await sendEmail({
        to: employee.email,
        subject,
        html: htmlContent
      });

      // Send SMS if phone number available
      if (employee.phone) {
        const message = `Asset "${asset.name}" (${asset.asset_id}) has been issued to you. Please acknowledge receipt.`;
        await sendSMS({
          to: employee.phone,
          message
        });
      }

      logger.info('Asset issue notification sent', {
        employeeId: employee._id,
        assetId: asset._id
      });

    } catch (error) {
      logger.error('Error sending asset issue notification', {
        error: error.message
      });
      // Don't throw error - notification failure shouldn't stop the process
    }
  }

  /**
   * Send asset return notification
   */
  async sendAssetReturnNotification(employee, asset, returnData) {
    try {
      const subject = `Asset Returned - ${asset.name}`;
      const htmlContent = this.generateAssetReturnEmailTemplate(employee, asset, returnData);

      await sendEmail({
        to: employee.email,
        subject,
        html: htmlContent
      });

      logger.info('Asset return notification sent', {
        employeeId: employee._id,
        assetId: asset._id
      });

    } catch (error) {
      logger.error('Error sending asset return notification', {
        error: error.message
      });
    }
  }

  /**
   * Validate issue data
   */
  validateIssueData(data) {
    const required = ['employee_id', 'employee_name', 'employee_code', 'designation', 'store_department'];
    
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`${field} is required`);
      }
    }

    // Validate email format if provided
    if (data.employee_email && !this.isValidEmail(data.employee_email)) {
      throw new Error('Invalid email format');
    }

    // Validate phone format if provided
    if (data.employee_phone && !this.isValidPhone(data.employee_phone)) {
      throw new Error('Invalid phone format');
    }
  }

  /**
   * Validate return data
   */
  validateReturnData(data) {
    const required = ['return_reason', 'condition_at_return'];
    
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`${field} is required`);
      }
    }

    const validConditions = ['good', 'damaged', 'working', 'missing', 'excellent', 'fair', 'poor'];
    if (!validConditions.includes(data.condition_at_return)) {
      throw new Error('Invalid condition at return');
    }
  }

  /**
   * Validate acknowledgment data
   */
  validateAcknowledgmentData(data) {
    const required = ['employee_signature', 'hr_admin_signature'];
    
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`${field} is required`);
      }
    }
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone format
   */
  isValidPhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Generate asset issue email template
   */
  generateAssetIssueEmailTemplate(employee, asset, registerData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .content { padding: 20px; }
          .asset-details { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Asset Issued</h2>
          </div>
          <div class="content">
            <p>Dear ${employee.first_name} ${employee.last_name},</p>
            
            <p>The following asset has been issued to you:</p>
            
            <div class="asset-details">
              <h3>Asset Details:</h3>
              <ul>
                <li><strong>Asset Name:</strong> ${asset.name}</li>
                <li><strong>Asset ID:</strong> ${asset.asset_id}</li>
                <li><strong>Category:</strong> ${asset.category}</li>
                <li><strong>Brand:</strong> ${asset.brand}</li>
                <li><strong>Model:</strong> ${asset.model}</li>
                <li><strong>Serial Number:</strong> ${asset.serial_number}</li>
                <li><strong>Issue Date:</strong> ${new Date().toDateString()}</li>
                <li><strong>Condition:</strong> ${registerData.condition_at_issue}</li>
              </ul>
            </div>
            
            <p>Please acknowledge receipt of this asset by signing the acknowledgment form.</p>
            
            <p>If you have any questions, please contact the HR department.</p>
          </div>
          <div class="footer">
            <p>This is an automated notification from the HRMS system.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate asset return email template
   */
  generateAssetReturnEmailTemplate(employee, asset, returnData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #28a745; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .content { padding: 20px; }
          .return-details { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Asset Returned</h2>
          </div>
          <div class="content">
            <p>Dear ${employee.first_name} ${employee.last_name},</p>
            
            <p>The following asset has been returned:</p>
            
            <div class="return-details">
              <h3>Return Details:</h3>
              <ul>
                <li><strong>Asset Name:</strong> ${asset.name}</li>
                <li><strong>Asset ID:</strong> ${asset.asset_id}</li>
                <li><strong>Return Date:</strong> ${new Date().toDateString()}</li>
                <li><strong>Condition at Return:</strong> ${returnData.condition_at_return}</li>
                <li><strong>Return Reason:</strong> ${returnData.return_reason}</li>
                ${returnData.damage_remarks ? `<li><strong>Damage Remarks:</strong> ${returnData.damage_remarks}</li>` : ''}
              </ul>
            </div>
            
            <p>Thank you for returning the asset in ${returnData.condition_at_return} condition.</p>
          </div>
          <div class="footer">
            <p>This is an automated notification from the HRMS system.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new AssetRegisterService();

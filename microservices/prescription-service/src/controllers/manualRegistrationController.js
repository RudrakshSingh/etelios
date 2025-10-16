const manualRegistrationService = require('../services/manualRegistrationService');
const { validationResult } = require('express-validator');
const logger = require('../config/logger');

/**
 * @route POST /api/manual-register
 * @desc Start manual registration process
 * @access Private (Optometrist/Reception)
 */
exports.startManualRegistration = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { phone, name, email, dob, city, store_id, link_checkup_id } = req.body;
    const userId = req.user.id;

    // Send OTP
    const result = await manualRegistrationService.sendOTP(phone, userId);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        phone: phone.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2'), // Mask phone
        expires_in: result.expires_in
      }
    });
  } catch (error) {
    logger.error(`Error in startManualRegistration: ${error.message}`);
    next(error);
  }
};

/**
 * @route POST /api/manual-register/verify-otp
 * @desc Verify OTP and complete manual registration
 * @access Private (Optometrist/Reception)
 */
exports.verifyOTPAndRegister = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { phone, code, name, email, dob, city, store_id, link_checkup_id } = req.body;
    const userId = req.user.id;

    const customerData = {
      name,
      email,
      dob: dob ? new Date(dob) : undefined,
      city,
      store_id,
      link_checkup_id
    };

    const result = await manualRegistrationService.verifyOTPAndRegister(
      phone, 
      code, 
      customerData, 
      userId
    );

    res.status(200).json({
      success: true,
      message: result.is_existing ? 'Linked to existing customer' : 'New customer created',
      data: {
        customer_id: result.customer_id,
        qr_ref_id: result.qr_ref_id,
        is_existing: result.is_existing,
        customer: {
          name: result.customer.name,
          phone: result.customer.phone,
          email: result.customer.email,
          tier: result.customer.tier
        }
      }
    });
  } catch (error) {
    logger.error(`Error in verifyOTPAndRegister: ${error.message}`);
    next(error);
  }
};

/**
 * @route POST /api/customers/dedupe/preview
 * @desc Preview potential duplicate customers
 * @access Private (Optometrist/Reception)
 */
exports.previewDuplicates = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { phone, name, email } = req.body;

    const result = await manualRegistrationService.previewDuplicates(phone, name, email);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error(`Error in previewDuplicates: ${error.message}`);
    next(error);
  }
};

/**
 * @route POST /api/customers/merge
 * @desc Merge duplicate customers
 * @access Private (Manager/Admin)
 */
exports.mergeCustomers = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { primary_customer_id, duplicate_customer_id, keep_fields } = req.body;
    const userId = req.user.id;

    const result = await manualRegistrationService.mergeCustomers(
      primary_customer_id,
      duplicate_customer_id,
      keep_fields,
      userId
    );

    res.status(200).json({
      success: true,
      message: 'Customers merged successfully',
      data: result
    });
  } catch (error) {
    logger.error(`Error in mergeCustomers: ${error.message}`);
    next(error);
  }
};

/**
 * @route GET /api/manual-register/stats
 * @desc Get manual registration statistics
 * @access Private (Manager/Admin)
 */
exports.getManualRegistrationStats = async (req, res, next) => {
  try {
    const { store_id, from_date, to_date } = req.query;
    const userId = req.user.id;

    const fromDate = from_date ? new Date(from_date) : undefined;
    const toDate = to_date ? new Date(to_date) : undefined;

    const result = await manualRegistrationService.getManualRegistrationStats(
      store_id,
      fromDate,
      toDate
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error(`Error in getManualRegistrationStats: ${error.message}`);
    next(error);
  }
};

/**
 * @route GET /api/manual-register/failure-reasons
 * @desc Get common QR failure reasons for analytics
 * @access Private (Manager/Admin)
 */
exports.getFailureReasons = async (req, res, next) => {
  try {
    const { store_id, from_date, to_date } = req.query;

    const query = { source: 'MANUAL', failure_reason: { $exists: true } };
    
    if (store_id) query.store_id = store_id;
    if (from_date || to_date) {
      query.created_at = {};
      if (from_date) query.created_at.$gte = new Date(from_date);
      if (to_date) query.created_at.$lte = new Date(to_date);
    }

    const QRLead = require('../models/QRLead.model');
    const failureReasons = await QRLead.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$failure_reason',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        failure_reasons: failureReasons,
        total_failures: failureReasons.reduce((sum, reason) => sum + reason.count, 0)
      }
    });
  } catch (error) {
    logger.error(`Error in getFailureReasons: ${error.message}`);
    next(error);
  }
};

/**
 * @route POST /api/manual-register/retry-qr
 * @desc Retry QR scan after manual registration
 * @access Private (Optometrist/Reception)
 */
exports.retryQRScan = async (req, res, next) => {
  try {
    const { qr_ref_id, failure_reason } = req.body;
    const userId = req.user.id;

    const QRLead = require('../models/QRLead.model');
    const qrLead = await QRLead.findOne({ qr_ref_id });

    if (!qrLead) {
      return res.status(404).json({
        success: false,
        message: 'QR Lead not found'
      });
    }

    // Update failure reason if provided
    if (failure_reason) {
      qrLead.failure_reason = failure_reason;
      await qrLead.save();
    }

    res.status(200).json({
      success: true,
      message: 'QR scan retry logged',
      data: {
        qr_ref_id: qrLead.qr_ref_id,
        status: qrLead.status,
        customer_id: qrLead.linked_customer_id
      }
    });
  } catch (error) {
    logger.error(`Error in retryQRScan: ${error.message}`);
    next(error);
  }
};

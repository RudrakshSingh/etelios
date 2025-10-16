const express = require('express');
const { body, query, param } = require('express-validator');
const manualRegistrationController = require('../controllers/manualRegistrationController');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');

const router = express.Router();

// --- Manual Registration Routes ---

/**
 * @route POST /api/manual-register
 * @desc Start manual registration process
 * @access Private (Optometrist/Reception)
 */
router.post(
  '/',
  authenticate,
  requirePermission('customer:create'),
  [
    body('phone')
      .isMobilePhone('any')
      .withMessage('Please provide a valid phone number'),
    body('name')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Please provide a valid email address'),
    body('dob')
      .optional()
      .isISO8601()
      .withMessage('Please provide a valid date of birth'),
    body('city')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('City must be between 2 and 50 characters'),
    body('store_id')
      .isMongoId()
      .withMessage('Please provide a valid store ID'),
    body('link_checkup_id')
      .optional()
      .isMongoId()
      .withMessage('Please provide a valid checkup ID')
  ],
  manualRegistrationController.startManualRegistration
);

/**
 * @route POST /api/manual-register/verify-otp
 * @desc Verify OTP and complete manual registration
 * @access Private (Optometrist/Reception)
 */
router.post(
  '/verify-otp',
  authenticate,
  requirePermission('customer:create'),
  [
    body('phone')
      .isMobilePhone('any')
      .withMessage('Please provide a valid phone number'),
    body('code')
      .isLength({ min: 6, max: 6 })
      .isNumeric()
      .withMessage('OTP must be a 6-digit number'),
    body('name')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Please provide a valid email address'),
    body('dob')
      .optional()
      .isISO8601()
      .withMessage('Please provide a valid date of birth'),
    body('city')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('City must be between 2 and 50 characters'),
    body('store_id')
      .isMongoId()
      .withMessage('Please provide a valid store ID'),
    body('link_checkup_id')
      .optional()
      .isMongoId()
      .withMessage('Please provide a valid checkup ID')
  ],
  manualRegistrationController.verifyOTPAndRegister
);

/**
 * @route POST /api/customers/dedupe/preview
 * @desc Preview potential duplicate customers
 * @access Private (Optometrist/Reception)
 */
router.post(
  '/dedupe/preview',
  authenticate,
  requirePermission('customer:read'),
  [
    body('phone')
      .isMobilePhone('any')
      .withMessage('Please provide a valid phone number'),
    body('name')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Please provide a valid email address')
  ],
  manualRegistrationController.previewDuplicates
);

/**
 * @route POST /api/customers/merge
 * @desc Merge duplicate customers
 * @access Private (Manager/Admin)
 */
router.post(
  '/merge',
  authenticate,
  requirePermission('customer:merge'),
  [
    body('primary_customer_id')
      .isMongoId()
      .withMessage('Please provide a valid primary customer ID'),
    body('duplicate_customer_id')
      .isMongoId()
      .withMessage('Please provide a valid duplicate customer ID'),
    body('keep_fields')
      .isObject()
      .withMessage('Please provide keep_fields object'),
    body('keep_fields.email')
      .optional()
      .isIn(['primary', 'duplicate'])
      .withMessage('Email field preference must be primary or duplicate'),
    body('keep_fields.dob')
      .optional()
      .isIn(['primary', 'duplicate'])
      .withMessage('DOB field preference must be primary or duplicate'),
    body('keep_fields.addresses')
      .optional()
      .isIn(['primary', 'duplicate', 'merge'])
      .withMessage('Addresses field preference must be primary, duplicate, or merge')
  ],
  manualRegistrationController.mergeCustomers
);

/**
 * @route GET /api/manual-register/stats
 * @desc Get manual registration statistics
 * @access Private (Manager/Admin)
 */
router.get(
  '/stats',
  authenticate,
  requirePermission('analytics:read'),
  [
    query('store_id')
      .optional()
      .isMongoId()
      .withMessage('Please provide a valid store ID'),
    query('from_date')
      .optional()
      .isISO8601()
      .withMessage('Please provide a valid from date'),
    query('to_date')
      .optional()
      .isISO8601()
      .withMessage('Please provide a valid to date')
  ],
  manualRegistrationController.getManualRegistrationStats
);

/**
 * @route GET /api/manual-register/failure-reasons
 * @desc Get common QR failure reasons for analytics
 * @access Private (Manager/Admin)
 */
router.get(
  '/failure-reasons',
  authenticate,
  requirePermission('analytics:read'),
  [
    query('store_id')
      .optional()
      .isMongoId()
      .withMessage('Please provide a valid store ID'),
    query('from_date')
      .optional()
      .isISO8601()
      .withMessage('Please provide a valid from date'),
    query('to_date')
      .optional()
      .isISO8601()
      .withMessage('Please provide a valid to date')
  ],
  manualRegistrationController.getFailureReasons
);

/**
 * @route POST /api/manual-register/retry-qr
 * @desc Retry QR scan after manual registration
 * @access Private (Optometrist/Reception)
 */
router.post(
  '/retry-qr',
  authenticate,
  requirePermission('customer:update'),
  [
    body('qr_ref_id')
      .isLength({ min: 1 })
      .withMessage('Please provide a valid QR reference ID'),
    body('failure_reason')
      .optional()
      .isIn(['CAMERA', 'NETWORK', 'BROWSER_DENIED', 'OTHER'])
      .withMessage('Please provide a valid failure reason')
  ],
  manualRegistrationController.retryQRScan
);

module.exports = router;

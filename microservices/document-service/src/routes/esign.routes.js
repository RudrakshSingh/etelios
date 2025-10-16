const express = require('express');
const { body, param } = require('express-validator');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.middleware');
const {
  initiateSignature,
  handleDocuSignCallback,
  handleDigioCallback,
  handleAadhaarCallback,
  getSignatureStatus,
  cancelSignature,
  resendSignatureRequest
} = require('../controllers/esignController');

const router = express.Router();

// Validation schemas
const initiateSignatureValidation = [
  param('documentId')
    .isMongoId()
    .withMessage('Invalid document ID'),
  
  body('signature_method')
    .notEmpty()
    .withMessage('Signature method is required')
    .isIn(['checkbox', 'docusign', 'digio', 'aadhaar_esign'])
    .withMessage('Invalid signature method'),
  
  body('signature_metadata')
    .optional()
    .isObject()
    .withMessage('Signature metadata must be an object'),
  
  body('signature_metadata.aadhaar_number')
    .optional()
    .matches(/^[0-9]{12}$/)
    .withMessage('Aadhaar number must be 12 digits')
];

const documentIdValidation = [
  param('documentId')
    .isMongoId()
    .withMessage('Invalid document ID')
];

const envelopeIdValidation = [
  param('envelopeId')
    .notEmpty()
    .withMessage('Envelope ID is required')
];

const requestIdValidation = [
  param('requestId')
    .notEmpty()
    .withMessage('Request ID is required')
];

const callbackValidation = [
  body('event')
    .optional()
    .isIn(['completed', 'declined', 'voided'])
    .withMessage('Invalid event type'),
  
  body('status')
    .optional()
    .isIn(['completed', 'declined', 'expired'])
    .withMessage('Invalid status')
];

/**
 * @route   POST /api/esign/:documentId/initiate
 * @desc    Initiate e-signature process
 * @access  Private (Document owner or assigned signer)
 */
router.post(
  '/:documentId/initiate',
  authenticate,
  initiateSignatureValidation,
  validateRequest,
  initiateSignature
);

/**
 * @route   GET /api/esign/:documentId/status
 * @desc    Get signature status
 * @access  Private (Document owner, HR, Admin)
 */
router.get(
  '/:documentId/status',
  authenticate,
  documentIdValidation,
  validateRequest,
  getSignatureStatus
);

/**
 * @route   POST /api/esign/:documentId/cancel
 * @desc    Cancel signature process
 * @access  Private (Document owner, HR, Admin)
 */
router.post(
  '/:documentId/cancel',
  authenticate,
  documentIdValidation,
  validateRequest,
  cancelSignature
);

/**
 * @route   POST /api/esign/:documentId/resend
 * @desc    Resend signature request
 * @access  Private (HR, Admin, SuperAdmin)
 */
router.post(
  '/:documentId/resend',
  authenticate,
  requireRole(['hr', 'admin', 'superadmin']),
  documentIdValidation,
  validateRequest,
  resendSignatureRequest
);

/**
 * @route   POST /api/esign/callbacks/docusign/:envelopeId
 * @desc    Handle DocuSign callback
 * @access  Public (Webhook)
 */
router.post(
  '/callbacks/docusign/:envelopeId',
  envelopeIdValidation,
  callbackValidation,
  validateRequest,
  handleDocuSignCallback
);

/**
 * @route   POST /api/esign/callbacks/digio/:requestId
 * @desc    Handle Digio callback
 * @access  Public (Webhook)
 */
router.post(
  '/callbacks/digio/:requestId',
  requestIdValidation,
  callbackValidation,
  validateRequest,
  handleDigioCallback
);

/**
 * @route   POST /api/esign/callbacks/aadhaar/:requestId
 * @desc    Handle Aadhaar e-sign callback
 * @access  Public (Webhook)
 */
router.post(
  '/callbacks/aadhaar/:requestId',
  requestIdValidation,
  callbackValidation,
  validateRequest,
  handleAadhaarCallback
);

module.exports = router;

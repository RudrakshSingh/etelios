const express = require('express');
const multer = require('multer');
const { body, param, query } = require('express-validator');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { checkDocumentAccess } = require('../middleware/documentAccess.middleware');
const { validateRequest } = require('../middleware/validateRequest.middleware');
const {
  uploadDocument,
  getDocuments,
  getDocumentById,
  downloadDocument,
  updateDocument,
  deleteDocument,
  signDocument,
  getDocumentHistory,
  getPendingSignatures
} = require('../controllers/documentsController');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/jpg'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPG, and PNG files are allowed.'), false);
    }
  }
});

// Validation schemas
const uploadDocumentValidation = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  
  body('document_type')
    .notEmpty()
    .withMessage('Document type is required')
    .isIn(['employment_contract', 'offer_letter', 'appointment_letter', 'nda', 'posh_acknowledgment', 'company_handbook', 'promotion_letter', 'salary_letter', 'transfer_letter', 'exit_document', 'policy_document', 'other'])
    .withMessage('Invalid document type'),
  
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isIn(['employment', 'compliance', 'policies', 'letters', 'exit', 'other'])
    .withMessage('Invalid category'),
  
  body('employee_id')
    .notEmpty()
    .withMessage('Employee ID is required')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Employee ID must contain only uppercase letters and numbers'),
  
  body('signature_required')
    .optional()
    .isBoolean()
    .withMessage('Signature required must be a boolean'),
  
  body('compliance_required')
    .optional()
    .isBoolean()
    .withMessage('Compliance required must be a boolean'),
  
  body('compliance_type')
    .optional()
    .isIn(['posh', 'nda', 'confidentiality', 'data_protection', 'safety', 'other'])
    .withMessage('Invalid compliance type'),
  
  body('expiry_date')
    .optional()
    .isISO8601()
    .withMessage('Expiry date must be a valid date'),
  
  body('access_level')
    .optional()
    .isIn(['public', 'restricted', 'confidential', 'secret'])
    .withMessage('Invalid access level'),
  
  body('department_access')
    .optional()
    .isArray()
    .withMessage('Department access must be an array'),
  
  body('role_access')
    .optional()
    .isArray()
    .withMessage('Role access must be an array'),
  
  body('workflow_assignee')
    .optional()
    .isMongoId()
    .withMessage('Workflow assignee must be a valid user ID')
];

const updateDocumentValidation = [
  param('documentId')
    .isMongoId()
    .withMessage('Invalid document ID'),
  
  body('title')
    .optional()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  
  body('document_type')
    .optional()
    .isIn(['employment_contract', 'offer_letter', 'appointment_letter', 'nda', 'posh_acknowledgment', 'company_handbook', 'promotion_letter', 'salary_letter', 'transfer_letter', 'exit_document', 'policy_document', 'other'])
    .withMessage('Invalid document type'),
  
  body('category')
    .optional()
    .isIn(['employment', 'compliance', 'policies', 'letters', 'exit', 'other'])
    .withMessage('Invalid category'),
  
  body('signature_required')
    .optional()
    .isBoolean()
    .withMessage('Signature required must be a boolean'),
  
  body('compliance_required')
    .optional()
    .isBoolean()
    .withMessage('Compliance required must be a boolean'),
  
  body('compliance_type')
    .optional()
    .isIn(['posh', 'nda', 'confidentiality', 'data_protection', 'safety', 'other'])
    .withMessage('Invalid compliance type'),
  
  body('expiry_date')
    .optional()
    .isISO8601()
    .withMessage('Expiry date must be a valid date'),
  
  body('access_level')
    .optional()
    .isIn(['public', 'restricted', 'confidential', 'secret'])
    .withMessage('Invalid access level'),
  
  body('department_access')
    .optional()
    .isArray()
    .withMessage('Department access must be an array'),
  
  body('role_access')
    .optional()
    .isArray()
    .withMessage('Role access must be an array'),
  
  body('workflow_assignee')
    .optional()
    .isMongoId()
    .withMessage('Workflow assignee must be a valid user ID')
];

const signDocumentValidation = [
  param('documentId')
    .isMongoId()
    .withMessage('Invalid document ID'),
  
  body('signature_method')
    .optional()
    .isIn(['checkbox', 'docusign', 'digio', 'aadhaar_esign'])
    .withMessage('Invalid signature method'),
  
  body('signature_metadata')
    .optional()
    .isObject()
    .withMessage('Signature metadata must be an object')
];

const getDocumentsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('document_type')
    .optional()
    .isIn(['employment_contract', 'offer_letter', 'appointment_letter', 'nda', 'posh_acknowledgment', 'company_handbook', 'promotion_letter', 'salary_letter', 'transfer_letter', 'exit_document', 'policy_document', 'other'])
    .withMessage('Invalid document type'),
  
  query('category')
    .optional()
    .isIn(['employment', 'compliance', 'policies', 'letters', 'exit', 'other'])
    .withMessage('Invalid category'),
  
  query('status')
    .optional()
    .isIn(['draft', 'pending_signature', 'signed', 'active', 'expired', 'archived', 'superseded'])
    .withMessage('Invalid status'),
  
  query('compliance_required')
    .optional()
    .isBoolean()
    .withMessage('Compliance required must be a boolean'),
  
  query('signature_required')
    .optional()
    .isBoolean()
    .withMessage('Signature required must be a boolean'),
  
  query('sort_by')
    .optional()
    .isIn(['created_at', 'updated_at', 'title', 'document_type', 'status', 'expiry_date'])
    .withMessage('Invalid sort field'),
  
  query('sort_order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  
  query('date_from')
    .optional()
    .isISO8601()
    .withMessage('Date from must be a valid date'),
  
  query('date_to')
    .optional()
    .isISO8601()
    .withMessage('Date to must be a valid date')
];

const documentIdValidation = [
  param('documentId')
    .isMongoId()
    .withMessage('Invalid document ID')
];

const getDocumentHistoryValidation = [
  param('documentId')
    .isMongoId()
    .withMessage('Invalid document ID'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('action')
    .optional()
    .isIn(['create', 'update', 'delete', 'sign', 'download', 'view', 'archive'])
    .withMessage('Invalid action filter')
];

const getPendingSignaturesValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// Routes

/**
 * @route   POST /api/documents/upload
 * @desc    Upload a new document
 * @access  Private (HR, Admin, SuperAdmin)
 */
router.post(
  '/upload',
  authenticate,
  requireRole(['hr', 'admin', 'superadmin']),
  upload.single('file'),
  uploadDocumentValidation,
  validateRequest,
  uploadDocument
);

/**
 * @route   GET /api/documents
 * @desc    Get all documents with filtering and pagination
 * @access  Private (All roles)
 */
router.get(
  '/',
  authenticate,
  getDocumentsValidation,
  validateRequest,
  getDocuments
);

/**
 * @route   GET /api/documents/pending-signatures
 * @desc    Get pending signatures for current user
 * @access  Private (All roles)
 */
router.get(
  '/pending-signatures',
  authenticate,
  getPendingSignaturesValidation,
  validateRequest,
  getPendingSignatures
);

/**
 * @route   GET /api/documents/:documentId
 * @desc    Get document by ID
 * @access  Private (All roles with access control)
 */
router.get(
  '/:documentId',
  authenticate,
  documentIdValidation,
  validateRequest,
  checkDocumentAccess(),
  getDocumentById
);

/**
 * @route   GET /api/documents/:documentId/download
 * @desc    Download document
 * @access  Private (All roles with access control)
 */
router.get(
  '/:documentId/download',
  authenticate,
  documentIdValidation,
  validateRequest,
  checkDocumentAccess(),
  downloadDocument
);

/**
 * @route   PUT /api/documents/:documentId
 * @desc    Update document
 * @access  Private (HR, Admin, SuperAdmin, or document owner)
 */
router.put(
  '/:documentId',
  authenticate,
  updateDocumentValidation,
  validateRequest,
  checkDocumentAccess(),
  updateDocument
);

/**
 * @route   POST /api/documents/:documentId/sign
 * @desc    Sign document
 * @access  Private (Document owner or assigned signer)
 */
router.post(
  '/:documentId/sign',
  authenticate,
  signDocumentValidation,
  validateRequest,
  checkDocumentAccess(),
  signDocument
);

/**
 * @route   GET /api/documents/:documentId/history
 * @desc    Get document audit history
 * @access  Private (HR, Admin, SuperAdmin, or document owner)
 */
router.get(
  '/:documentId/history',
  authenticate,
  getDocumentHistoryValidation,
  validateRequest,
  checkDocumentAccess(),
  getDocumentHistory
);

/**
 * @route   DELETE /api/documents/:documentId
 * @desc    Delete document (soft delete)
 * @access  Private (HR, Admin, SuperAdmin)
 */
router.delete(
  '/:documentId',
  authenticate,
  requireRole(['hr', 'admin', 'superadmin']),
  documentIdValidation,
  validateRequest,
  checkDocumentAccess(),
  deleteDocument
);

module.exports = router;
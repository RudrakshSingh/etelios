const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const Joi = require('joi');

const {
  issueAsset,
  returnAsset,
  acknowledgeAsset,
  getEmployeeAssetRegister,
  getAllAssetRegisters,
  markRecoveryRequired,
  sendAlertsForUnreturnedAssets,
  getAssetsWithRecovery,
  generateAssetRegisterReport,
  uploadAssetDocuments,
  initiateRecovery,
  processRecoveryPayment,
  cancelRecovery,
  getRecoveryStatistics
} = require('../controllers/assetRegisterController');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'storage/documents/asset-register/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow images and PDFs
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files and PDFs are allowed'));
    }
  }
});

// Validation schemas
const issueAssetSchema = {
  body: Joi.object({
    employee_id: Joi.string().required(),
    employee_name: Joi.string().required(),
    employee_code: Joi.string().required(),
    designation: Joi.string().required(),
    store_department: Joi.string().required(),
    joining_date: Joi.date().required(),
    reporting_manager: Joi.string().required(),
    condition_at_issue: Joi.string().valid('new', 'used', 'excellent', 'good', 'fair').default('new'),
    uniform_size: Joi.string().when('category', { is: 'uniform', then: Joi.required(), otherwise: Joi.optional() }),
    id_card_number: Joi.string().when('category', { is: 'id_card', then: Joi.required(), otherwise: Joi.optional() }),
    imei_number: Joi.string().when('category', { is: 'phone', then: Joi.required(), otherwise: Joi.optional() }),
    serial_number_custom: Joi.string().when('category', { is: Joi.string().valid('laptop', 'desktop', 'tablet'), then: Joi.required(), otherwise: Joi.optional() }),
    tool_specification: Joi.string().when('category', { is: 'tool', then: Joi.required(), otherwise: Joi.optional() })
  })
};

const returnAssetSchema = {
  body: Joi.object({
    return_reason: Joi.string().required(),
    condition_at_return: Joi.string().valid('good', 'damaged', 'working', 'missing', 'excellent', 'fair', 'poor').required(),
    damage_remarks: Joi.string().optional()
  })
};

const acknowledgeAssetSchema = {
  body: Joi.object({
    employee_signature: Joi.string().required(),
    hr_admin_signature: Joi.string().required()
  })
};

const markRecoverySchema = {
  body: Joi.object({
    amount: Joi.number().min(0).required(),
    reason: Joi.string().required()
  })
};

const initiateRecoverySchema = {
  body: Joi.object({
    amount: Joi.number().min(0).required(),
    reason: Joi.string().required()
  })
};

const processRecoveryPaymentSchema = {
  body: Joi.object({
    payment_method: Joi.string().valid('salary_deduction', 'final_settlement', 'cash', 'bank_transfer').required(),
    payment_reference: Joi.string().required()
  })
};

const cancelRecoverySchema = {
  body: Joi.object({
    reason: Joi.string().required()
  })
};

const getAssetRegistersSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    status: Joi.string().valid('assigned', 'available', 'maintenance', 'retired', 'lost', 'damaged').optional(),
    category: Joi.string().valid('uniform', 'id_card', 'phone', 'laptop', 'desktop', 'tablet', 'monitor', 'keyboard', 'mouse', 'headphone', 'camera', 'printer', 'scanner', 'tool', 'other').optional(),
    employeeId: Joi.string().optional(),
    search: Joi.string().optional(),
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().optional()
  })
};

const generateReportSchema = {
  query: Joi.object({
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().optional(),
    category: Joi.string().valid('uniform', 'id_card', 'phone', 'laptop', 'desktop', 'tablet', 'monitor', 'keyboard', 'mouse', 'headphone', 'camera', 'printer', 'scanner', 'tool', 'other').optional(),
    status: Joi.string().valid('assigned', 'available', 'maintenance', 'retired', 'lost', 'damaged').optional(),
    format: Joi.string().valid('json', 'csv', 'pdf').default('json')
  })
};

const uploadDocumentSchema = {
  body: Joi.object({
    type: Joi.string().valid('condition_photo', 'receipt', 'warranty', 'other').default('condition_photo'),
    description: Joi.string().optional()
  })
};

// Routes

// Issue asset with register details
router.post('/:assetId/issue',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['asset:manage']),
  validateRequest(issueAssetSchema),
  issueAsset
);

// Return asset with register details
router.post('/:assetId/return',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['asset:manage']),
  validateRequest(returnAssetSchema),
  returnAsset
);

// Acknowledge asset receipt
router.post('/:assetId/acknowledge',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['asset:manage']),
  validateRequest(acknowledgeAssetSchema),
  acknowledgeAsset
);

// Get employee asset register
router.get('/employee/:employeeId',
  authenticate,
  requireRole([], ['asset:read']),
  getEmployeeAssetRegister
);

// Get all asset registers
router.get('/',
  authenticate,
  requireRole([], ['asset:read']),
  validateRequest(getAssetRegistersSchema),
  getAllAssetRegisters
);

// Mark recovery required
router.post('/:assetId/recovery',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['asset:manage']),
  validateRequest(markRecoverySchema),
  markRecoveryRequired
);

// Send alerts for unreturned assets
router.post('/alerts/send',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['asset:manage']),
  sendAlertsForUnreturnedAssets
);

// Get assets with recovery required
router.get('/recovery',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['asset:read']),
  getAssetsWithRecovery
);

// Generate asset register report
router.get('/report',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['asset:read']),
  validateRequest(generateReportSchema),
  generateAssetRegisterReport
);

// Upload asset documents
router.post('/:assetId/documents',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['asset:manage']),
  upload.single('document'),
  validateRequest(uploadDocumentSchema),
  uploadAssetDocuments
);

// Recovery workflow routes
router.post('/:assetId/recovery/initiate',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['asset:manage']),
  validateRequest(initiateRecoverySchema),
  initiateRecovery
);

router.post('/:assetId/recovery/payment',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['asset:manage']),
  validateRequest(processRecoveryPaymentSchema),
  processRecoveryPayment
);

router.post('/:assetId/recovery/cancel',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['asset:manage']),
  validateRequest(cancelRecoverySchema),
  cancelRecovery
);

router.get('/recovery/statistics',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['asset:read']),
  getRecoveryStatistics
);

module.exports = router;

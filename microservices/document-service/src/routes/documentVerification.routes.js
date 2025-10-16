const express = require('express');
const router = express.Router();
const documentVerificationController = require('../controllers/documentVerificationController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const Joi = require('joi');

// Apply authentication to all routes
router.use(authenticate);

// Validation schemas
const rejectDocumentVerificationSchema = Joi.object({
  rejectionReason: Joi.string().required().min(10).max(500),
  verificationNotes: Joi.string().optional().max(1000)
});

const getRejectedDocumentsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  documentType: Joi.string().optional(),
  employeeId: Joi.string().optional()
});

// Document verification rejection routes
router.post('/documents/:documentId/reject',
  requireRole(['hr', 'admin', 'manager', 'compliance']),
  requirePermission('documents:verify'),
  validateRequest(rejectDocumentVerificationSchema),
  documentVerificationController.rejectDocumentVerification
);

router.post('/employee-documents/:documentId/reject',
  requireRole(['hr', 'admin', 'manager', 'compliance']),
  requirePermission('documents:verify'),
  validateRequest(rejectDocumentVerificationSchema),
  documentVerificationController.rejectEmployeeDocumentVerification
);

// Get rejected documents
router.get('/documents/rejected',
  requireRole(['hr', 'admin', 'manager', 'compliance']),
  requirePermission('documents:read'),
  validateRequest(getRejectedDocumentsSchema),
  documentVerificationController.getRejectedDocuments
);

router.get('/employee-documents/rejected',
  requireRole(['hr', 'admin', 'manager', 'compliance']),
  requirePermission('documents:read'),
  validateRequest(getRejectedDocumentsSchema),
  documentVerificationController.getRejectedEmployeeDocuments
);

module.exports = router;

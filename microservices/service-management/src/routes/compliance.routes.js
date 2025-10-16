const express = require('express');
const { param, query } = require('express-validator');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.middleware');
const {
  getComplianceDashboard,
  getComplianceTrends,
  getCriticalIssues,
  getDepartmentCompliance,
  getEmployeeCompliance,
  checkEmployeeCompliance,
  exportComplianceReport,
  getComplianceStatistics,
  getComplianceAlerts
} = require('../controllers/complianceController');

const router = express.Router();

// Validation schemas
const departmentValidation = [
  param('department')
    .notEmpty()
    .withMessage('Department is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Department must be between 2 and 50 characters')
];

const employeeIdValidation = [
  param('employeeId')
    .notEmpty()
    .withMessage('Employee ID is required')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Employee ID must contain only uppercase letters and numbers')
];

const complianceFiltersValidation = [
  query('department')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Department must be between 2 and 50 characters'),
  
  query('compliance_type')
    .optional()
    .isIn(['posh', 'nda', 'confidentiality', 'data_protection', 'safety', 'other'])
    .withMessage('Invalid compliance type'),
  
  query('date_from')
    .optional()
    .isISO8601()
    .withMessage('Date from must be a valid date'),
  
  query('date_to')
    .optional()
    .isISO8601()
    .withMessage('Date to must be a valid date')
];

const trendsValidation = [
  query('months')
    .optional()
    .isInt({ min: 1, max: 24 })
    .withMessage('Months must be between 1 and 24')
];

const exportValidation = [
  query('format')
    .optional()
    .isIn(['excel', 'pdf'])
    .withMessage('Format must be excel or pdf'),
  
  query('department')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Department must be between 2 and 50 characters'),
  
  query('compliance_type')
    .optional()
    .isIn(['posh', 'nda', 'confidentiality', 'data_protection', 'safety', 'other'])
    .withMessage('Invalid compliance type'),
  
  query('date_from')
    .optional()
    .isISO8601()
    .withMessage('Date from must be a valid date'),
  
  query('date_to')
    .optional()
    .isISO8601()
    .withMessage('Date to must be a valid date')
];

const statisticsValidation = [
  query('period')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Period must be between 1 and 365 days')
];

/**
 * @route   GET /api/compliance/dashboard
 * @desc    Get compliance dashboard
 * @access  Private (HR, Admin, SuperAdmin)
 */
router.get(
  '/dashboard',
  authenticate,
  requireRole(['hr', 'admin', 'superadmin']),
  complianceFiltersValidation,
  validateRequest,
  getComplianceDashboard
);

/**
 * @route   GET /api/compliance/trends
 * @desc    Get compliance trends
 * @access  Private (HR, Admin, SuperAdmin)
 */
router.get(
  '/trends',
  authenticate,
  requireRole(['hr', 'admin', 'superadmin']),
  trendsValidation,
  validateRequest,
  getComplianceTrends
);

/**
 * @route   GET /api/compliance/critical-issues
 * @desc    Get critical compliance issues
 * @access  Private (HR, Admin, SuperAdmin)
 */
router.get(
  '/critical-issues',
  authenticate,
  requireRole(['hr', 'admin', 'superadmin']),
  validateRequest,
  getCriticalIssues
);

/**
 * @route   GET /api/compliance/alerts
 * @desc    Get compliance alerts
 * @access  Private (HR, Admin, SuperAdmin)
 */
router.get(
  '/alerts',
  authenticate,
  requireRole(['hr', 'admin', 'superadmin']),
  validateRequest,
  getComplianceAlerts
);

/**
 * @route   GET /api/compliance/statistics
 * @desc    Get compliance statistics
 * @access  Private (HR, Admin, SuperAdmin)
 */
router.get(
  '/statistics',
  authenticate,
  requireRole(['hr', 'admin', 'superadmin']),
  statisticsValidation,
  validateRequest,
  getComplianceStatistics
);

/**
 * @route   GET /api/compliance/department/:department
 * @desc    Get department compliance report
 * @access  Private (HR, Admin, SuperAdmin)
 */
router.get(
  '/department/:department',
  authenticate,
  requireRole(['hr', 'admin', 'superadmin']),
  departmentValidation,
  validateRequest,
  getDepartmentCompliance
);

/**
 * @route   GET /api/compliance/employee/:employeeId
 * @desc    Get employee compliance report
 * @access  Private (HR, Admin, SuperAdmin, Employee - own data only)
 */
router.get(
  '/employee/:employeeId',
  authenticate,
  employeeIdValidation,
  validateRequest,
  getEmployeeCompliance
);

/**
 * @route   GET /api/compliance/employee/:employeeId/check
 * @desc    Check employee compliance status
 * @access  Private (HR, Admin, SuperAdmin, Employee - own data only)
 */
router.get(
  '/employee/:employeeId/check',
  authenticate,
  employeeIdValidation,
  validateRequest,
  checkEmployeeCompliance
);

/**
 * @route   GET /api/compliance/export
 * @desc    Export compliance report
 * @access  Private (HR, Admin, SuperAdmin)
 */
router.get(
  '/export',
  authenticate,
  requireRole(['hr', 'admin', 'superadmin']),
  exportValidation,
  validateRequest,
  exportComplianceReport
);

module.exports = router;

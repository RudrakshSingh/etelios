const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const Joi = require('joi');

const {
  generateAttendanceReport,
  generateEmployeeReport,
  generateAssetReport,
  generateStorePerformanceReport
} = require('../controllers/reportsController');

// Validation schemas
const attendanceReportSchema = {
  query: Joi.object({
    startDate: Joi.date().required(),
    endDate: Joi.date().required(),
    storeId: Joi.string().optional(),
    format: Joi.string().valid('json', 'csv', 'pdf').default('json')
  })
};

const employeeReportSchema = {
  query: Joi.object({
    storeId: Joi.string().optional(),
    department: Joi.string().optional(),
    format: Joi.string().valid('json', 'csv', 'pdf').default('json')
  })
};

const assetReportSchema = {
  query: Joi.object({
    storeId: Joi.string().optional(),
    format: Joi.string().valid('json', 'csv', 'pdf').default('json')
  })
};

const storePerformanceReportSchema = {
  query: Joi.object({
    startDate: Joi.date().required(),
    endDate: Joi.date().required(),
    format: Joi.string().valid('json', 'csv', 'pdf').default('json')
  })
};

// Routes
router.get('/attendance',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager'], ['report:generate']),
  validateRequest(attendanceReportSchema),
  generateAttendanceReport
);

router.get('/employees',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['report:generate']),
  validateRequest(employeeReportSchema),
  generateEmployeeReport
);

router.get('/assets',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['report:generate']),
  validateRequest(assetReportSchema),
  generateAssetReport
);

router.get('/store-performance',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager'], ['report:generate']),
  validateRequest(storePerformanceReportSchema),
  generateStorePerformanceReport
);

module.exports = router;
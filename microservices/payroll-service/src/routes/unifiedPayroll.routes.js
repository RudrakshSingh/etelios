const express = require('express');
const router = express.Router();
const unifiedPayrollController = require('../controllers/unifiedPayrollController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');

// Middleware to protect routes
router.use(authenticate);

// Employee Master Management
router.post(
  '/employee-master',
  requireRole(['admin', 'hr', 'accountant']),
  requirePermission('write_employee_master'),
  unifiedPayrollController.createEmployeeMaster
);

router.get(
  '/employee-master/:employeeCode',
  requireRole(['admin', 'hr', 'manager', 'employee', 'accountant']),
  requirePermission('read_employee_master'),
  unifiedPayrollController.getEmployeeMaster
);

// Attendance Management
router.post(
  '/attendance',
  requireRole(['admin', 'hr', 'manager']),
  requirePermission('write_attendance'),
  unifiedPayrollController.submitAttendanceRecord
);

router.put(
  '/attendance/:id/approve',
  requireRole(['admin', 'hr']),
  requirePermission('approve_attendance'),
  unifiedPayrollController.approveAttendanceRecord
);

// Payroll Processing
router.post(
  '/employee/:employeeCode',
  requireRole(['admin', 'hr', 'accountant']),
  requirePermission('write_payroll'),
  unifiedPayrollController.processEmployeePayroll
);

router.post(
  '/monthly',
  requireRole(['admin', 'hr', 'accountant']),
  requirePermission('write_payroll'),
  unifiedPayrollController.processMonthlyPayroll
);

router.get(
  '/employee/:employeeCode/:month/:year',
  requireRole(['admin', 'hr', 'manager', 'employee', 'accountant']),
  requirePermission('read_payroll'),
  unifiedPayrollController.getEmployeePayroll
);

router.get(
  '/summary/:month/:year',
  requireRole(['admin', 'hr', 'accountant']),
  requirePermission('read_payroll_summary'),
  unifiedPayrollController.getPayrollSummary
);

router.post(
  '/lock/:month/:year',
  requireRole(['admin', 'hr', 'accountant']),
  requirePermission('lock_payroll'),
  unifiedPayrollController.lockMonthlyPayroll
);

router.get(
  '/analytics/:month/:year',
  requireRole(['admin', 'hr', 'accountant']),
  requirePermission('read_analytics'),
  unifiedPayrollController.getPerformanceAnalytics
);

module.exports = router;

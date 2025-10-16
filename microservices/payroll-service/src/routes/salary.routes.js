const express = require('express');
const router = express.Router();
const {
  calculateSalary,
  getCurrentSalary,
  getSalaryHistory,
  updateSalary,
  getPayrollSummary,
  bulkCalculateSalaries
} = require('../controllers/salaryController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');

// Calculate salary for an employee
router.post('/calculate', authenticate, requireRole(['admin', 'superadmin', 'hr']), calculateSalary);

// Get current salary for an employee
router.get('/employee/:employeeId', authenticate, getCurrentSalary);

// Get salary history for an employee
router.get('/employee/:employeeId/history', authenticate, getSalaryHistory);

// Update salary for an employee
router.put('/employee/:employeeId', authenticate, requireRole(['admin', 'superadmin', 'hr']), updateSalary);

// Get payroll summary for all employees
router.get('/payroll-summary', authenticate, requireRole(['admin', 'superadmin', 'hr']), getPayrollSummary);

// Bulk calculate salaries for multiple employees
router.post('/bulk-calculate', authenticate, requireRole(['admin', 'superadmin', 'hr']), bulkCalculateSalaries);

module.exports = router;

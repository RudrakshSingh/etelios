const express = require('express');
const router = express.Router();
const {
  getHRAnalytics,
  getEmployeeStats,
  getAttendanceAnalytics,
  getPerformanceMetrics,
  getComplianceAnalytics,
  generateInsights,
  createDashboard,
  getDashboard,
  exportAnalytics,
  getConfigurationStatus
} = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');

// Analytics Routes
router.get('/hr-analytics', authenticate, requireRole(['admin', 'hr']), getHRAnalytics);
router.get('/employee-stats', authenticate, requireRole(['admin', 'hr']), getEmployeeStats);
router.get('/attendance-analytics', authenticate, requireRole(['admin', 'hr']), getAttendanceAnalytics);
router.get('/performance-metrics', authenticate, requireRole(['admin', 'hr']), getPerformanceMetrics);
router.get('/compliance-analytics', authenticate, requireRole(['admin', 'hr']), getComplianceAnalytics);

// AI Insights
router.get('/insights', authenticate, requireRole(['admin', 'hr']), generateInsights);

// Dashboard Management
router.post('/dashboard', authenticate, requireRole(['admin']), createDashboard);
router.get('/dashboard/:dashboardId', authenticate, requireRole(['admin', 'hr']), getDashboard);

// Export Analytics
router.get('/export', authenticate, requireRole(['admin', 'hr']), exportAnalytics);

// Configuration
router.get('/config', authenticate, requireRole(['admin']), getConfigurationStatus);

module.exports = router;

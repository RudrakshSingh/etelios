const express = require('express');
const router = express.Router();
const {
  getAllPermissions,
  getDepartmentPermissions,
  getUserPermissions,
  updateUserPermissions,
  getAllUsersWithPermissions,
  resetUserPermissions
} = require('../controllers/permissionController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');

// Get all available permissions
router.get('/permissions', authenticate, requireRole(['superadmin', 'admin']), getAllPermissions);

// Get department-specific default permissions
router.get('/permissions/department/:department', authenticate, requireRole(['superadmin', 'admin']), getDepartmentPermissions);

// Get user's current permissions
router.get('/user/:userId', authenticate, requireRole(['superadmin', 'admin']), getUserPermissions);

// Update user permissions (Admin only)
router.put('/user/:userId', authenticate, requireRole(['superadmin', 'admin']), updateUserPermissions);

// Get all users with their permissions (Admin only)
router.get('/users', authenticate, requireRole(['superadmin', 'admin']), getAllUsersWithPermissions);

// Reset user permissions to department default
router.post('/user/:userId/reset', authenticate, requireRole(['superadmin', 'admin']), resetUserPermissions);

module.exports = router;

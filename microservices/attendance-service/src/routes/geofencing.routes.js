const express = require('express');
const router = express.Router();
const {
  checkGeofencingStatus,
  updateGeofencingSettings,
  getGeofencingSettings,
  getGeofencingUsers
} = require('../controllers/geofencingController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');

// Check geofencing status (Sales & Store Managers)
router.post('/check', authenticate, requirePermission(['geofencing_access']), checkGeofencingStatus);

// Get user's geofencing settings
router.get('/settings', authenticate, getGeofencingSettings);

// Update geofencing settings (Admin only)
router.put('/settings/:userId', authenticate, requireRole(['superadmin', 'admin']), updateGeofencingSettings);

// Get all users with geofencing enabled (Admin only)
router.get('/users', authenticate, requireRole(['superadmin', 'admin']), getGeofencingUsers);

module.exports = router;

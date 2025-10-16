const express = require('express');
const router = express.Router();
const manualRegisterController = require('../controllers/manualRegisterController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');

// Apply authentication to all routes
router.use(authenticate);

// Manual Registration Management
router.get('/registrations', requirePermission('view_manual_registrations'), manualRegisterController.getRegistrations);
router.post('/registrations', requirePermission('manage_manual_registrations'), manualRegisterController.createRegistration);
router.get('/registrations/:id', requirePermission('view_manual_registrations'), manualRegisterController.getRegistration);
router.put('/registrations/:id', requirePermission('manage_manual_registrations'), manualRegisterController.updateRegistration);
router.delete('/registrations/:id', requirePermission('manage_manual_registrations'), manualRegisterController.deleteRegistration);

// Reports
router.get('/reports/summary', requirePermission('view_reports'), manualRegisterController.getSummaryReport);

module.exports = router;

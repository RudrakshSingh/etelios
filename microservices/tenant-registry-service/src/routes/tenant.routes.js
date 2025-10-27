const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenant.controller');
const { tenantRateLimit } = require('../middleware/tenant.middleware');

// Apply rate limiting
router.use(tenantRateLimit(1000, 60000)); // 1000 requests per minute

// Tenant routes
router.post('/', tenantController.createTenant);
router.get('/', tenantController.listTenants);
router.get('/:tenantId', tenantController.getTenant);
router.put('/:tenantId', tenantController.updateTenant);
router.delete('/:tenantId', tenantController.deleteTenant);
router.get('/:tenantId/analytics', tenantController.getTenantAnalytics);
router.put('/:tenantId/usage', tenantController.updateTenantUsage);

module.exports = router;

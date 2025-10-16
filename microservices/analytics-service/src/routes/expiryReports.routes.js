const express = require('express');
const router = express.Router();
const expiryReportsController = require('../controllers/expiryReports.controller');
const { authenticate } = require('../middleware/auth.middleware');
const rateLimit = require('express-rate-limit');

// Rate limiting for expiry reports
const expiryReportsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many expiry report requests from this IP, please try again later.'
});

// Apply authentication middleware to all routes
router.use(authenticate);
router.use(expiryReportsRateLimit);

// Expiry Reports Routes
router.get('/near-expiry', expiryReportsController.getNearExpiryReport);
router.get('/batch-wise-stock', expiryReportsController.getBatchWiseStockReport);
router.get('/fefo-compliance', expiryReportsController.getFEFOComplianceReport);
router.get('/heatmap', expiryReportsController.getExpiryHeatmap);
router.get('/loss-due-to-expiry', expiryReportsController.getLossDueToExpiryReport);
router.get('/dashboard', expiryReportsController.getExpiryDashboard);

module.exports = router;

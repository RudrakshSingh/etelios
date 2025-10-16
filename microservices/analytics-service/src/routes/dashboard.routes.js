const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const Joi = require('joi');

const {
  getDashboard,
  getDashboardData,
  getAllDashboards,
  updateDashboard
} = require('../controllers/dashboardController');

// Validation schemas
const updateDashboardSchema = {
  body: Joi.object({
    name: Joi.string().optional(),
    layout: Joi.string().valid('grid', 'sidebar', 'tabs', 'cards').optional(),
    widgets: Joi.array().items(
      Joi.object({
        widget_id: Joi.string().required(),
        widget_type: Joi.string().valid('chart', 'table', 'metric', 'list', 'calendar', 'map', 'progress', 'gauge').required(),
        title: Joi.string().required(),
        position: Joi.object({
          x: Joi.number().required(),
          y: Joi.number().required(),
          width: Joi.number().required(),
          height: Joi.number().required()
        }).required(),
        permissions: Joi.array().items(Joi.string()).required(),
        data_source: Joi.string().valid('attendance', 'employees', 'assets', 'transfers', 'documents', 'stores', 'reports', 'audit_logs', 'system_metrics', 'compliance').required(),
        refresh_interval: Joi.number().optional(),
        is_visible: Joi.boolean().optional(),
        is_collapsible: Joi.boolean().optional()
      })
    ).optional(),
    theme: Joi.object({
      primary_color: Joi.string().optional(),
      secondary_color: Joi.string().optional(),
      background_color: Joi.string().optional()
    }).optional()
  })
};

// Routes

/**
 * @route GET /api/dashboard
 * @desc Get dashboard layout and widgets for user's role
 * @access Private (All authenticated users)
 */
router.get('/',
  authenticate,
  requirePermission(['view_dashboard']),
  getDashboard
);

/**
 * @route GET /api/dashboard/data/:widgetId
 * @desc Get specific widget data
 * @access Private (All authenticated users with widget permissions)
 */
router.get('/data/:widgetId',
  authenticate,
  getDashboardData
);

/**
 * @route GET /api/dashboard/all
 * @desc Get all dashboards (Admin/SuperAdmin only)
 * @access Private (Admin/SuperAdmin only)
 */
router.get('/all',
  authenticate,
  requireRole(['admin', 'superadmin']),
  getAllDashboards
);

/**
 * @route PUT /api/dashboard/:role
 * @desc Update dashboard layout for specific role
 * @access Private (Admin/SuperAdmin only)
 */
router.put('/:role',
  authenticate,
  requireRole(['admin', 'superadmin']),
  requirePermission(['manage_dashboard']),
  validateRequest(updateDashboardSchema),
  updateDashboard
);

module.exports = router;

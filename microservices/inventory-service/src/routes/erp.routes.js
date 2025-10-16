const express = require('express');
const router = express.Router();
const erpController = require('../controllers/erpController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');

// All ERP routes require authentication
router.use(authenticate);

// Aging Management Routes
router.get(
  '/aging/dashboard/:storeId',
  requireRole(['admin', 'manager', 'store_manager', 'accountant']),
  requirePermission('view_aging_dashboard'),
  erpController.getAgingDashboard
);

router.post(
  '/aging/report/:storeId',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('generate_aging_report'),
  erpController.generateAgingReport
);

router.get(
  '/aging/reports/:storeId',
  requireRole(['admin', 'manager', 'store_manager', 'accountant']),
  requirePermission('view_aging_reports'),
  erpController.getAgingReports
);

router.post(
  '/aging/auto-rotation',
  requireRole(['admin']),
  requirePermission('process_auto_rotation'),
  erpController.processAutomaticRotation
);

router.post(
  '/aging/calculate',
  requireRole(['admin']),
  requirePermission('calculate_aging'),
  erpController.calculateAging
);

// Transfer Management Routes
router.get(
  '/transfers/recommendations/:storeId',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('view_transfer_recommendations'),
  erpController.getTransferRecommendations
);

router.post(
  '/transfers',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('create_transfer_order'),
  erpController.createTransferOrder
);

router.get(
  '/transfers',
  requireRole(['admin', 'manager', 'store_manager', 'accountant']),
  requirePermission('view_transfer_orders'),
  erpController.getTransferOrders
);

router.put(
  '/transfers/:transferId/approve',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('approve_transfer_order'),
  erpController.approveTransferOrder
);

// GST Calculation Routes
router.post(
  '/gst/calculate',
  requireRole(['admin', 'manager', 'sales', 'accountant']),
  requirePermission('calculate_gst'),
  erpController.calculateGST
);

router.get(
  '/hsn/:hsnCode',
  requireRole(['admin', 'manager', 'sales', 'accountant']),
  requirePermission('view_hsn_details'),
  erpController.getHSNDetails
);

// Inventory Management Routes
router.get(
  '/inventory/aging-summary',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('view_inventory_aging'),
  erpController.getInventoryAgingSummary
);

router.get(
  '/inventory/slow-moving',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('view_slow_moving_items'),
  erpController.getSlowMovingItems
);

router.get(
  '/inventory/dead-stock',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('view_dead_stock_items'),
  erpController.getDeadStockItems
);

module.exports = router;

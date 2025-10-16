const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');

// Apply authentication to all routes
router.use(authenticate);

// Vendor Management Routes
router.post('/vendors', 
  requireRole(['admin', 'accountant', 'store_manager']),
  requirePermission('manage_vendors'),
  purchaseController.createVendor
);

router.get('/vendors', 
  requireRole(['admin', 'accountant', 'store_manager', 'hr']),
  requirePermission('view_vendors'),
  purchaseController.getVendors
);

router.get('/vendors/:id', 
  requireRole(['admin', 'accountant', 'store_manager', 'hr']),
  requirePermission('view_vendors'),
  purchaseController.getVendorById
);

router.put('/vendors/:id', 
  requireRole(['admin', 'accountant']),
  requirePermission('manage_vendors'),
  purchaseController.updateVendor
);

// Purchase Order Management Routes
router.post('/purchase/orders', 
  requireRole(['admin', 'accountant', 'store_manager']),
  requirePermission('manage_purchase_orders'),
  purchaseController.createPurchaseOrder
);

router.get('/purchase/orders', 
  requireRole(['admin', 'accountant', 'store_manager', 'hr']),
  requirePermission('view_purchase_orders'),
  purchaseController.getPurchaseOrders
);

router.patch('/purchase/orders/:id/status', 
  requireRole(['admin', 'accountant', 'store_manager']),
  requirePermission('manage_purchase_orders'),
  purchaseController.updatePOStatus
);

// GRN Management Routes
router.post('/purchase/grn', 
  requireRole(['admin', 'accountant', 'store_manager']),
  requirePermission('manage_grn'),
  purchaseController.createGRN
);

router.get('/purchase/grn', 
  requireRole(['admin', 'accountant', 'store_manager', 'hr']),
  requirePermission('view_grn'),
  purchaseController.getGRNs
);

// Purchase Invoice Management Routes
router.post('/purchase/invoices', 
  requireRole(['admin', 'accountant']),
  requirePermission('manage_purchase_invoices'),
  purchaseController.createPurchaseInvoice
);

router.get('/purchase/invoices', 
  requireRole(['admin', 'accountant', 'store_manager']),
  requirePermission('view_purchase_invoices'),
  purchaseController.getPurchaseInvoices
);

// Vendor Payment Management Routes
router.post('/purchase/payments', 
  requireRole(['admin', 'accountant']),
  requirePermission('manage_vendor_payments'),
  purchaseController.createVendorPayment
);

router.get('/purchase/payments', 
  requireRole(['admin', 'accountant', 'store_manager']),
  requirePermission('view_vendor_payments'),
  purchaseController.getVendorPayments
);

// Purchase Return Management Routes
router.post('/purchase/returns', 
  requireRole(['admin', 'accountant', 'store_manager']),
  requirePermission('manage_purchase_returns'),
  purchaseController.createPurchaseReturn
);

router.get('/purchase/returns', 
  requireRole(['admin', 'accountant', 'store_manager']),
  requirePermission('view_purchase_returns'),
  purchaseController.getPurchaseReturns
);

// Reorder Rules Management Routes
router.post('/reorder-rules', 
  requireRole(['admin', 'accountant', 'store_manager']),
  requirePermission('manage_reorder_rules'),
  purchaseController.createReorderRule
);

router.get('/reorder-rules', 
  requireRole(['admin', 'accountant', 'store_manager', 'hr']),
  requirePermission('view_reorder_rules'),
  purchaseController.getReorderRules
);

// PO Suggestions Routes
router.get('/purchase/suggestions', 
  requireRole(['admin', 'accountant', 'store_manager']),
  requirePermission('view_po_suggestions'),
  purchaseController.getPOSuggestions
);

router.post('/purchase/suggestions/generate', 
  requireRole(['admin', 'accountant', 'store_manager']),
  requirePermission('generate_po_suggestions'),
  purchaseController.generatePOSuggestions
);

// Vendor Performance Routes
router.get('/vendors/performance', 
  requireRole(['admin', 'accountant', 'store_manager']),
  requirePermission('view_vendor_performance'),
  purchaseController.getVendorPerformance
);

// Purchase Dashboard Route
router.get('/dashboard', 
  requireRole(['admin', 'accountant', 'store_manager']),
  requirePermission('view_purchase_dashboard'),
  purchaseController.getPurchaseDashboard
);

module.exports = router;

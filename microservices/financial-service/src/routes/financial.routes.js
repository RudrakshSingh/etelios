const express = require('express');
const router = express.Router();
const financialController = require('../controllers/financialController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');

// All financial routes require authentication
router.use(authenticate);

// P&L Management Routes
router.post(
  '/pandl',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('manage_pandl'),
  financialController.createOrUpdatePandL
);

router.get(
  '/pandl',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('view_pandl'),
  financialController.getPandL
);

router.get(
  '/pandl/summary',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('view_pandl'),
  financialController.getPandLSummary
);

// Expense Management Routes
router.post(
  '/expenses',
  requireRole(['admin', 'manager', 'store_manager', 'accountant']),
  requirePermission('manage_expenses'),
  financialController.createExpense
);

router.get(
  '/expenses',
  requireRole(['admin', 'manager', 'store_manager', 'accountant']),
  requirePermission('view_expenses'),
  financialController.getExpenses
);

// Ledger Management Routes
router.post(
  '/ledger',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('manage_ledger'),
  financialController.createLedgerEntry
);

router.get(
  '/ledger',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('view_ledger'),
  financialController.getLedgerEntries
);

router.get(
  '/trial-balance',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('view_trial_balance'),
  financialController.getTrialBalance
);

router.get(
  '/account-balance',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('view_account_balance'),
  financialController.getAccountBalance
);

// TDS Management Routes
router.post(
  '/tds',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('manage_tds'),
  financialController.createTDSEntry
);

router.get(
  '/tds',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('view_tds'),
  financialController.getTDSEntries
);

router.get(
  '/tds/summary',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('view_tds_summary'),
  financialController.getTDSSummary
);

// Financial Dashboard
router.get(
  '/dashboard',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('view_financial_dashboard'),
  financialController.getFinancialDashboard
);

module.exports = router;

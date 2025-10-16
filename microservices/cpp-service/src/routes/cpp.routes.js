const express = require('express');
const router = express.Router();
const cppController = require('../controllers/cppController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');

// Apply authentication to all routes
router.use(authenticate);

// CPP Policy Management Routes
router.post('/policies', 
  requireRole(['admin']),
  requirePermission('manage_cpp_policies'),
  cppController.createCPPPolicy
);

router.get('/policies', 
  requireRole(['admin', 'store_manager', 'accountant']),
  requirePermission('view_cpp_policies'),
  cppController.getCPPPolicies
);

router.get('/policies/active', 
  requireRole(['admin', 'store_manager', 'accountant', 'employee']),
  requirePermission('view_cpp_policies'),
  cppController.getActiveCPPPolicy
);

// CPP Enrollment Management Routes
router.post('/enroll', 
  requireRole(['admin', 'store_manager', 'employee']),
  requirePermission('manage_cpp_enrollments'),
  cppController.createCPPEnrollment
);

router.get('/enrollments', 
  requireRole(['admin', 'store_manager', 'accountant']),
  requirePermission('view_cpp_enrollments'),
  cppController.getCPPEnrollments
);

router.get('/enrollments/:id', 
  requireRole(['admin', 'store_manager', 'accountant']),
  requirePermission('view_cpp_enrollments'),
  cppController.getCPPEnrollmentById
);

// CPP Claim Management Routes
router.post('/claims', 
  requireRole(['admin', 'store_manager', 'employee']),
  requirePermission('create_cpp_claims'),
  cppController.createCPPClaim
);

router.get('/claims', 
  requireRole(['admin', 'store_manager', 'accountant']),
  requirePermission('view_cpp_claims'),
  cppController.getCPPClaims
);

router.get('/claims/:id', 
  requireRole(['admin', 'store_manager', 'accountant']),
  requirePermission('view_cpp_claims'),
  cppController.getCPPClaimById
);

router.patch('/claims/:id/assess', 
  requireRole(['admin', 'store_manager']),
  requirePermission('assess_cpp_claims'),
  cppController.assessCPPClaim
);

router.post('/claims/:id/checkout', 
  requireRole(['admin', 'store_manager']),
  requirePermission('fulfill_cpp_claims'),
  cppController.checkoutCPPClaim
);

router.patch('/claims/:id/status', 
  requireRole(['admin', 'store_manager']),
  requirePermission('manage_cpp_claims'),
  cppController.updateCPPClaimStatus
);

// Helper APIs
router.post('/price/simulate', 
  requireRole(['admin', 'store_manager', 'employee']),
  requirePermission('view_cpp_pricing'),
  cppController.simulateCPPPrice
);

router.post('/eligibility/check', 
  requireRole(['admin', 'store_manager', 'employee']),
  requirePermission('check_cpp_eligibility'),
  cppController.checkEligibility
);

// Reports and Analytics Routes
router.get('/analytics', 
  requireRole(['admin', 'store_manager', 'accountant']),
  requirePermission('view_cpp_analytics'),
  cppController.getCPPAnalytics
);

router.get('/dashboard', 
  requireRole(['admin', 'store_manager', 'accountant']),
  requirePermission('view_cpp_dashboard'),
  cppController.getCPPDashboard
);

module.exports = router;

const express = require('express');
const router = express.Router();
const crmController = require('../controllers/crmController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');

// Apply authentication to all routes
router.use(authenticate);

// Customer 360° View
router.get('/customers/:id/360', requirePermission('view_customers'), crmController.getCustomer360);

// Customer Management
router.get('/customers', requirePermission('view_customers'), crmController.getCustomers);
router.post('/customers', requirePermission('manage_customers'), crmController.createCustomer);
router.get('/customers/:id', requirePermission('view_customers'), crmController.getCustomer);
router.patch('/customers/:id', requirePermission('manage_customers'), crmController.updateCustomer);
router.delete('/customers/:id', requirePermission('manage_customers'), crmController.deleteCustomer);

// Lead Management
router.get('/leads', requirePermission('view_leads'), crmController.getLeads);
router.post('/leads', requirePermission('manage_leads'), crmController.createLead);
router.get('/leads/:id', requirePermission('view_leads'), crmController.getLead);
router.patch('/leads/:id', requirePermission('manage_leads'), crmController.updateLead);
router.delete('/leads/:id', requirePermission('manage_leads'), crmController.deleteLead);

// Interaction Management
router.get('/interactions', requirePermission('view_interactions'), crmController.getInteractions);
router.post('/interactions', requirePermission('manage_interactions'), crmController.createInteraction);
router.get('/interactions/:id', requirePermission('view_interactions'), crmController.getInteraction);
router.patch('/interactions/:id', requirePermission('manage_interactions'), crmController.updateInteraction);
router.delete('/interactions/:id', requirePermission('manage_interactions'), crmController.deleteInteraction);

// Family Management
router.post('/families', requirePermission('manage_customers'), crmController.createFamily);
router.post('/families/:family_id/members', requirePermission('manage_customers'), crmController.addFamilyMember);

// Communication
router.post('/send', requirePermission('send_messages'), crmController.sendMessage);

// Loyalty Management
router.get('/loyalty/policy/current', requirePermission('view_loyalty'), crmController.getCurrentLoyaltyRule);
router.post('/loyalty/earn', requirePermission('manage_loyalty'), crmController.earnLoyaltyPoints);
router.post('/loyalty/burn', requirePermission('manage_loyalty'), crmController.burnLoyaltyPoints);

// Wallet Management
router.post('/wallet/credit', requirePermission('manage_wallet'), crmController.creditWallet);
router.post('/wallet/debit', requirePermission('manage_wallet'), crmController.debitWallet);

// Subscription Management
router.post('/subscriptions', requirePermission('manage_subscriptions'), crmController.createSubscription);
router.post('/subscriptions/redeem', requirePermission('manage_subscriptions'), crmController.redeemSubscription);

// Analytics
router.get('/customers/:id/analytics', requirePermission('view_analytics'), crmController.getCustomerAnalytics);

module.exports = router;

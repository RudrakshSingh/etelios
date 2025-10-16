const express = require('express');
const router = express.Router();
const engagementController = require('../controllers/engagementController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');

// Apply authentication to all routes
router.use(authenticate);

// Contact Management Routes
router.post('/contacts', 
  requireRole(['admin', 'store_manager', 'employee']),
  requirePermission('manage_customers'),
  engagementController.createContact
);

router.get('/contacts', 
  requireRole(['admin', 'store_manager', 'employee']),
  requirePermission('view_customers'),
  engagementController.getContacts
);

router.patch('/contacts/:customer_id/consents', 
  requireRole(['admin', 'store_manager', 'employee']),
  requirePermission('manage_customers'),
  engagementController.updateContactConsents
);

// Appointment Management Routes
router.post('/appointments', 
  requireRole(['admin', 'store_manager', 'employee']),
  requirePermission('manage_appointments'),
  engagementController.createAppointment
);

router.get('/appointments', 
  requireRole(['admin', 'store_manager', 'employee']),
  requirePermission('view_appointments'),
  engagementController.getAppointments
);

// Order Management Routes
router.post('/orders', 
  requireRole(['admin', 'store_manager', 'employee']),
  requirePermission('create_sales_orders'),
  engagementController.createOrder
);

router.patch('/orders/:order_id/status', 
  requireRole(['admin', 'store_manager', 'employee']),
  requirePermission('update_sales_orders'),
  engagementController.updateOrderStatus
);

// Prescription Management Routes
router.post('/prescriptions', 
  requireRole(['admin', 'store_manager', 'employee']),
  requirePermission('manage_prescriptions'),
  engagementController.createPrescription
);

// Contact Lens Plan Management Routes
router.post('/contact-lens-plans', 
  requireRole(['admin', 'store_manager', 'employee']),
  requirePermission('manage_contact_lens_plans'),
  engagementController.createContactLensPlan
);

// Campaign Management Routes
router.post('/campaigns', 
  requireRole(['admin', 'marketing']),
  requirePermission('manage_campaigns'),
  engagementController.createCampaign
);

router.get('/campaigns', 
  requireRole(['admin', 'marketing', 'store_manager']),
  requirePermission('view_campaigns'),
  engagementController.getCampaigns
);

// Template Management Routes
router.post('/templates', 
  requireRole(['admin', 'marketing']),
  requirePermission('manage_templates'),
  engagementController.createTemplate
);

router.get('/templates', 
  requireRole(['admin', 'marketing', 'store_manager']),
  requirePermission('view_templates'),
  engagementController.getTemplates
);

// Automation Rules Routes
router.post('/automation/rules', 
  requireRole(['admin']),
  requirePermission('manage_automation_rules'),
  engagementController.createAutomationRule
);

router.get('/automation/rules', 
  requireRole(['admin', 'marketing']),
  requirePermission('view_automation_rules'),
  engagementController.getAutomationRules
);

// Task Management Routes
router.post('/tasks', 
  requireRole(['admin', 'store_manager', 'employee']),
  requirePermission('create_tasks'),
  engagementController.createTask
);

router.get('/tasks', 
  requireRole(['admin', 'store_manager', 'employee']),
  requirePermission('view_tasks'),
  engagementController.getTasks
);

router.patch('/tasks/:task_id', 
  requireRole(['admin', 'store_manager', 'employee']),
  requirePermission('update_tasks'),
  engagementController.updateTask
);

// Automation Processing Routes
router.post('/automation/run', 
  requireRole(['admin']),
  requirePermission('run_automation'),
  engagementController.runAutomation
);

// Message Sending Routes
router.post('/send', 
  requireRole(['admin', 'store_manager', 'employee']),
  requirePermission('send_messages'),
  engagementController.sendMessage
);

// Feedback Submission Routes
router.post('/feedback/submit', 
  requireRole(['admin', 'store_manager', 'employee']),
  requirePermission('submit_feedback'),
  engagementController.submitFeedback
);

// Analytics Routes
router.get('/analytics', 
  requireRole(['admin', 'marketing', 'store_manager']),
  requirePermission('view_engagement_analytics'),
  engagementController.getEngagementAnalytics
);

// Message Logs Routes
router.get('/logs', 
  requireRole(['admin', 'marketing', 'store_manager']),
  requirePermission('view_message_logs'),
  engagementController.getMessageLogs
);

module.exports = router;

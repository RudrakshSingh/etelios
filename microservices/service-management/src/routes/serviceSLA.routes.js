const express = require('express');
const router = express.Router();
const serviceSLAController = require('../controllers/serviceSLAController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');

// Apply authentication to all routes
router.use(authenticate);

// Ticket Management Routes
router.post('/tickets', 
  requireRole(['admin', 'store_manager', 'hr', 'employee']),
  requirePermission('create_tickets'),
  serviceSLAController.createTicket
);

router.get('/tickets', 
  requireRole(['admin', 'store_manager', 'hr', 'employee']),
  requirePermission('view_tickets'),
  serviceSLAController.getTickets
);

router.get('/tickets/:id', 
  requireRole(['admin', 'store_manager', 'hr', 'employee']),
  requirePermission('view_tickets'),
  serviceSLAController.getTicketById
);

router.patch('/tickets/:id/assign', 
  requireRole(['admin', 'store_manager', 'hr']),
  requirePermission('assign_tickets'),
  serviceSLAController.assignTicket
);

router.patch('/tickets/:id/status', 
  requireRole(['admin', 'store_manager', 'hr', 'employee']),
  requirePermission('update_ticket_status'),
  serviceSLAController.updateTicketStatus
);

router.patch('/tickets/:id/pause', 
  requireRole(['admin', 'store_manager', 'hr', 'employee']),
  requirePermission('pause_tickets'),
  serviceSLAController.pauseTicket
);

router.patch('/tickets/:id/resume', 
  requireRole(['admin', 'store_manager', 'hr', 'employee']),
  requirePermission('resume_tickets'),
  serviceSLAController.resumeTicket
);

// SLA Management Routes
router.post('/sla/compliance-check', 
  requireRole(['admin', 'store_manager']),
  requirePermission('manage_sla'),
  serviceSLAController.checkSLACompliance
);

router.post('/sla/recompute/:id', 
  requireRole(['admin']),
  requirePermission('manage_sla'),
  serviceSLAController.recomputeSLA
);

// SLA Policy Management Routes
router.post('/sla/policies', 
  requireRole(['admin']),
  requirePermission('manage_sla_policies'),
  serviceSLAController.createSLAPolicy
);

router.get('/sla/policies', 
  requireRole(['admin', 'store_manager', 'hr']),
  requirePermission('view_sla_policies'),
  serviceSLAController.getSLAPolicies
);

router.put('/sla/policies/:id', 
  requireRole(['admin']),
  requirePermission('manage_sla_policies'),
  serviceSLAController.updateSLAPolicy
);

// Escalation Matrix Management Routes
router.post('/escalation/matrices', 
  requireRole(['admin']),
  requirePermission('manage_escalation_matrix'),
  serviceSLAController.createEscalationMatrix
);

router.get('/escalation/matrices', 
  requireRole(['admin', 'store_manager']),
  requirePermission('view_escalation_matrix'),
  serviceSLAController.getEscalationMatrices
);

router.put('/escalation/matrices/:id', 
  requireRole(['admin']),
  requirePermission('manage_escalation_matrix'),
  serviceSLAController.updateEscalationMatrix
);

// Reports and Analytics Routes
router.get('/reports/sla', 
  requireRole(['admin', 'store_manager', 'hr']),
  requirePermission('view_sla_reports'),
  serviceSLAController.getSLAComplianceReport
);

router.get('/reports/analytics', 
  requireRole(['admin', 'store_manager', 'hr']),
  requirePermission('view_ticket_analytics'),
  serviceSLAController.getTicketAnalytics
);

router.get('/reports/red-alert', 
  requireRole(['admin', 'store_manager']),
  requirePermission('view_red_alert_dashboard'),
  serviceSLAController.getRedAlertDashboard
);

// Notification Management Routes
router.post('/notify/ticket/:id', 
  requireRole(['admin', 'store_manager', 'hr', 'employee']),
  requirePermission('send_ticket_notifications'),
  serviceSLAController.sendTicketNotification
);

// Service Dashboard Route
router.get('/dashboard', 
  requireRole(['admin', 'store_manager', 'hr', 'employee']),
  requirePermission('view_service_dashboard'),
  serviceSLAController.getServiceDashboard
);

module.exports = router;

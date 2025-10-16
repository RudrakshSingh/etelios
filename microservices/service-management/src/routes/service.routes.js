const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');

// Apply authentication to all routes
router.use(authenticate);

// Ticket Management
router.get('/tickets', requirePermission('view_tickets'), serviceController.getTickets);
router.post('/tickets', requirePermission('manage_tickets'), serviceController.createTicket);
router.get('/tickets/:id', requirePermission('view_tickets'), serviceController.getTicket);
router.put('/tickets/:id', requirePermission('manage_tickets'), serviceController.updateTicket);
router.delete('/tickets/:id', requirePermission('manage_tickets'), serviceController.deleteTicket);

// SLA Management
router.get('/sla', requirePermission('view_sla'), serviceController.getSLAs);
router.post('/sla', requirePermission('manage_sla'), serviceController.createSLA);
router.get('/sla/:id', requirePermission('view_sla'), serviceController.getSLA);
router.put('/sla/:id', requirePermission('manage_sla'), serviceController.updateSLA);
router.delete('/sla/:id', requirePermission('manage_sla'), serviceController.deleteSLA);

// Reports
router.get('/reports/tickets', requirePermission('view_reports'), serviceController.getTicketReport);
router.get('/reports/sla', requirePermission('view_reports'), serviceController.getSLAReport);
router.get('/reports/performance', requirePermission('view_reports'), serviceController.getPerformanceReport);
router.get('/reports/response-times', requirePermission('view_reports'), serviceController.getResponseTimeReport);
router.get('/reports/resolution-rates', requirePermission('view_reports'), serviceController.getResolutionRateReport);
router.get('/reports/customer-satisfaction', requirePermission('view_reports'), serviceController.getCustomerSatisfactionReport);
router.get('/reports/team-performance', requirePermission('view_reports'), serviceController.getTeamPerformanceReport);
router.get('/reports/escalations', requirePermission('view_reports'), serviceController.getEscalationReport);
router.get('/reports/trends', requirePermission('view_reports'), serviceController.getTrendReport);
router.get('/reports/analytics', requirePermission('view_reports'), serviceController.getAnalyticsReport);

module.exports = router;

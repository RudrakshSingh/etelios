const serviceService = require('../services/serviceService');
const logger = require('../config/logger');

class ServiceController {
  // Ticket Management
  async getTickets(req, res) {
    try {
      const tickets = await serviceService.getTickets(req.query);
      res.json({
        success: true,
        data: tickets
      });
    } catch (error) {
      logger.error('Error getting tickets', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async createTicket(req, res) {
    try {
      const ticketData = { ...req.body, created_by: req.user.userId };
      const ticket = await serviceService.createTicket(ticketData);
      res.status(201).json({
        success: true,
        data: ticket
      });
    } catch (error) {
      logger.error('Error creating ticket', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getTicket(req, res) {
    try {
      const { id } = req.params;
      const ticket = await serviceService.getTicket(id);
      res.json({
        success: true,
        data: ticket
      });
    } catch (error) {
      logger.error('Error getting ticket', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async updateTicket(req, res) {
    try {
      const { id } = req.params;
      const ticket = await serviceService.updateTicket(id, req.body);
      res.json({
        success: true,
        data: ticket
      });
    } catch (error) {
      logger.error('Error updating ticket', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async deleteTicket(req, res) {
    try {
      const { id } = req.params;
      await serviceService.deleteTicket(id);
      res.json({
        success: true,
        message: 'Ticket deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting ticket', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // SLA Management
  async getSLAs(req, res) {
    try {
      const slas = await serviceService.getSLAs(req.query);
      res.json({
        success: true,
        data: slas
      });
    } catch (error) {
      logger.error('Error getting SLAs', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async createSLA(req, res) {
    try {
      const slaData = { ...req.body, created_by: req.user.userId };
      const sla = await serviceService.createSLA(slaData);
      res.status(201).json({
        success: true,
        data: sla
      });
    } catch (error) {
      logger.error('Error creating SLA', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getSLA(req, res) {
    try {
      const { id } = req.params;
      const sla = await serviceService.getSLA(id);
      res.json({
        success: true,
        data: sla
      });
    } catch (error) {
      logger.error('Error getting SLA', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async updateSLA(req, res) {
    try {
      const { id } = req.params;
      const sla = await serviceService.updateSLA(id, req.body);
      res.json({
        success: true,
        data: sla
      });
    } catch (error) {
      logger.error('Error updating SLA', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async deleteSLA(req, res) {
    try {
      const { id } = req.params;
      await serviceService.deleteSLA(id);
      res.json({
        success: true,
        message: 'SLA deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting SLA', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Reports
  async getTicketReport(req, res) {
    try {
      const report = await serviceService.getTicketReport(req.query);
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Error getting ticket report', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getSLAReport(req, res) {
    try {
      const report = await serviceService.getSLAReport(req.query);
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Error getting SLA report', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getPerformanceReport(req, res) {
    try {
      const report = await serviceService.getPerformanceReport(req.query);
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Error getting performance report', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getResponseTimeReport(req, res) {
    try {
      const report = await serviceService.getResponseTimeReport(req.query);
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Error getting response time report', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getResolutionRateReport(req, res) {
    try {
      const report = await serviceService.getResolutionRateReport(req.query);
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Error getting resolution rate report', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getCustomerSatisfactionReport(req, res) {
    try {
      const report = await serviceService.getCustomerSatisfactionReport(req.query);
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Error getting customer satisfaction report', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getTeamPerformanceReport(req, res) {
    try {
      const report = await serviceService.getTeamPerformanceReport(req.query);
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Error getting team performance report', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getEscalationReport(req, res) {
    try {
      const report = await serviceService.getEscalationReport(req.query);
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Error getting escalation report', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getTrendReport(req, res) {
    try {
      const report = await serviceService.getTrendReport(req.query);
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Error getting trend report', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getAnalyticsReport(req, res) {
    try {
      const report = await serviceService.getAnalyticsReport(req.query);
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Error getting analytics report', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new ServiceController();

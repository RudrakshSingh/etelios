const serviceSLAService = require('../services/serviceSLAService');

class ServiceSLAController {
  // Ticket Management
  async createTicket(req, res) {
    try {
      const ticketData = {
        ...req.body,
        created_by: req.user.id
      };
      const result = await serviceSLAService.createTicket(ticketData);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getTickets(req, res) {
    try {
      const result = await serviceSLAService.getTickets(req.query);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getTicketById(req, res) {
    try {
      const result = await serviceSLAService.getTicketById(req.params.id);
      res.status(200).json(result);
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  async assignTicket(req, res) {
    try {
      const { assignee_id } = req.body;
      const result = await serviceSLAService.assignTicket(
        req.params.id, 
        assignee_id, 
        req.user.id
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async updateTicketStatus(req, res) {
    try {
      const { status, reason } = req.body;
      const result = await serviceSLAService.updateTicketStatus(
        req.params.id, 
        status, 
        req.user.id, 
        reason
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async pauseTicket(req, res) {
    try {
      const { reason } = req.body;
      const result = await serviceSLAService.pauseTicket(
        req.params.id, 
        req.user.id, 
        reason
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async resumeTicket(req, res) {
    try {
      const { reason } = req.body;
      const result = await serviceSLAService.resumeTicket(
        req.params.id, 
        req.user.id, 
        reason
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // SLA Management
  async checkSLACompliance(req, res) {
    try {
      const result = await serviceSLAService.checkSLACompliance();
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async recomputeSLA(req, res) {
    try {
      const result = await serviceSLAService.recomputeSLA(req.params.id);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // SLA Policy Management
  async createSLAPolicy(req, res) {
    try {
      const policyData = {
        ...req.body,
        created_by: req.user.id
      };
      const result = await serviceSLAService.createSLAPolicy(policyData);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getSLAPolicies(req, res) {
    try {
      const result = await serviceSLAService.getSLAPolicies(req.query);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async updateSLAPolicy(req, res) {
    try {
      const result = await serviceSLAService.updateSLAPolicy(req.params.id, req.body);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Escalation Matrix Management
  async createEscalationMatrix(req, res) {
    try {
      const matrixData = {
        ...req.body,
        created_by: req.user.id
      };
      const result = await serviceSLAService.createEscalationMatrix(matrixData);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getEscalationMatrices(req, res) {
    try {
      const result = await serviceSLAService.getEscalationMatrices(req.query);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async updateEscalationMatrix(req, res) {
    try {
      const result = await serviceSLAService.updateEscalationMatrix(req.params.id, req.body);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Reports and Analytics
  async getSLAComplianceReport(req, res) {
    try {
      const { from_date, to_date, ...filters } = req.query;
      const result = await serviceSLAService.getSLAComplianceReport(
        new Date(from_date), 
        new Date(to_date), 
        filters
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getTicketAnalytics(req, res) {
    try {
      const result = await serviceSLAService.getTicketAnalytics(req.query);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Red Alert Dashboard
  async getRedAlertDashboard(req, res) {
    try {
      const result = await serviceSLAService.getRedAlertDashboard(req.query);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Notification Management
  async sendTicketNotification(req, res) {
    try {
      const { message, channel } = req.body;
      const result = await serviceSLAService.sendTicketNotification(
        req.params.id, 
        message, 
        channel
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Service Dashboard
  async getServiceDashboard(req, res) {
    try {
      const result = await serviceSLAService.getServiceDashboard(req.query);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new ServiceSLAController();

const cppService = require('../services/cppService');

class CPPController {
  // CPP Policy Management
  async createCPPPolicy(req, res) {
    try {
      const policyData = {
        ...req.body,
        created_by: req.user.id
      };
      const result = await cppService.createCPPPolicy(policyData);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getCPPPolicies(req, res) {
    try {
      const result = await cppService.getCPPPolicies(req.query);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getActiveCPPPolicy(req, res) {
    try {
      const result = await cppService.getActiveCPPPolicy();
      res.status(200).json(result);
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  // CPP Enrollment Management
  async createCPPEnrollment(req, res) {
    try {
      const enrollmentData = {
        ...req.body,
        created_by: req.user.id
      };
      const result = await cppService.createCPPEnrollment(enrollmentData);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getCPPEnrollments(req, res) {
    try {
      const result = await cppService.getCPPEnrollments(req.query);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getCPPEnrollmentById(req, res) {
    try {
      const result = await cppService.getCPPEnrollmentById(req.params.id);
      res.status(200).json(result);
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  // CPP Claim Management
  async createCPPClaim(req, res) {
    try {
      const claimData = {
        ...req.body,
        created_by: req.user.id
      };
      const result = await cppService.createCPPClaim(claimData);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getCPPClaims(req, res) {
    try {
      const result = await cppService.getCPPClaims(req.query);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getCPPClaimById(req, res) {
    try {
      const result = await cppService.getCPPClaimById(req.params.id);
      res.status(200).json(result);
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  async assessCPPClaim(req, res) {
    try {
      const { approved, replacement, notes, rejection_reason } = req.body;
      const assessmentData = {
        approved,
        replacement,
        notes,
        rejection_reason
      };
      const result = await cppService.assessCPPClaim(req.params.id, assessmentData, req.user.id);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async checkoutCPPClaim(req, res) {
    try {
      const { payment_method, taxes } = req.body;
      const checkoutData = {
        payment_method,
        taxes
      };
      const result = await cppService.checkoutCPPClaim(req.params.id, checkoutData, req.user.id);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async updateCPPClaimStatus(req, res) {
    try {
      const { status, reason } = req.body;
      const result = await cppService.updateCPPClaimStatus(req.params.id, status, req.user.id, reason);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Helper APIs
  async simulateCPPPrice(req, res) {
    try {
      const result = await cppService.simulateCPPPrice(req.body);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async checkEligibility(req, res) {
    try {
      const { invoice_no, sku, customer_id } = req.body;
      const result = await cppService.checkEligibilityByInvoice(invoice_no, sku, customer_id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Reports and Analytics
  async getCPPAnalytics(req, res) {
    try {
      const result = await cppService.getCPPAnalytics(req.query);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // CPP Dashboard
  async getCPPDashboard(req, res) {
    try {
      const dashboard = await cppService.getCPPDashboard(req.query);
      res.status(200).json(dashboard);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new CPPController();

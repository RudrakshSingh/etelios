const purchaseService = require('../services/purchaseService');

class PurchaseController {
  // Vendor Management
  async createVendor(req, res) {
    try {
      const result = await purchaseService.createVendor(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getVendors(req, res) {
    try {
      const result = await purchaseService.getVendors(req.query);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getVendorById(req, res) {
    try {
      const result = await purchaseService.getVendorById(req.params.id);
      res.status(200).json(result);
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  async updateVendor(req, res) {
    try {
      const result = await purchaseService.updateVendor(req.params.id, req.body);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Purchase Order Management
  async createPurchaseOrder(req, res) {
    try {
      const poData = {
        ...req.body,
        created_by: req.user.id
      };
      const result = await purchaseService.createPurchaseOrder(poData);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getPurchaseOrders(req, res) {
    try {
      const result = await purchaseService.getPurchaseOrders(req.query);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async updatePOStatus(req, res) {
    try {
      const { status } = req.body;
      const result = await purchaseService.updatePOStatus(
        req.params.id, 
        status, 
        req.user.id
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // GRN Management
  async createGRN(req, res) {
    try {
      const grnData = {
        ...req.body,
        created_by: req.user.id
      };
      const result = await purchaseService.createGRN(grnData);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getGRNs(req, res) {
    try {
      const result = await purchaseService.getGRNs(req.query);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Purchase Invoice Management
  async createPurchaseInvoice(req, res) {
    try {
      const invoiceData = {
        ...req.body,
        created_by: req.user.id
      };
      const result = await purchaseService.createPurchaseInvoice(invoiceData);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getPurchaseInvoices(req, res) {
    try {
      const result = await purchaseService.getPurchaseInvoices(req.query);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Vendor Payment Management
  async createVendorPayment(req, res) {
    try {
      const paymentData = {
        ...req.body,
        created_by: req.user.id
      };
      const result = await purchaseService.createVendorPayment(paymentData);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getVendorPayments(req, res) {
    try {
      const result = await purchaseService.getVendorPayments(req.query);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Purchase Return Management
  async createPurchaseReturn(req, res) {
    try {
      const returnData = {
        ...req.body,
        created_by: req.user.id
      };
      const result = await purchaseService.createPurchaseReturn(returnData);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getPurchaseReturns(req, res) {
    try {
      const result = await purchaseService.getPurchaseReturns(req.query);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Reorder Rules Management
  async createReorderRule(req, res) {
    try {
      const ruleData = {
        ...req.body,
        created_by: req.user.id
      };
      const result = await purchaseService.createReorderRule(ruleData);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getReorderRules(req, res) {
    try {
      const result = await purchaseService.getReorderRules(req.query);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // PO Suggestions
  async generatePOSuggestions(req, res) {
    try {
      const { store_id } = req.query;
      const result = await purchaseService.generatePOSuggestions(store_id);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getPOSuggestions(req, res) {
    try {
      const result = await purchaseService.getPOSuggestions(req.query.store_id);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Vendor Performance
  async getVendorPerformance(req, res) {
    try {
      const { vendor_id, from_date, to_date } = req.query;
      const result = await purchaseService.getVendorPerformance(
        vendor_id, 
        new Date(from_date), 
        new Date(to_date)
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Purchase Dashboard
  async getPurchaseDashboard(req, res) {
    try {
      const dashboard = await purchaseService.getPurchaseDashboard(req.query);
      res.status(200).json(dashboard);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new PurchaseController();

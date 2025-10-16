const PrescriptionService = require('../services/prescriptionService');
const logger = require('../config/logger');

class PrescriptionController {
  
  /**
   * Create a new prescription
   */
  static async createPrescription(req, res) {
    try {
      const prescriptionData = req.body;
      const userId = req.user.id;

      // Validate required fields
      const requiredFields = ['customer_id', 'store_id', 'optometrist_id', 'type', 'visit_reason'];
      const missingFields = requiredFields.filter(field => !prescriptionData[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`
        });
      }

      const prescription = await PrescriptionService.createPrescription(prescriptionData, userId);
      
      res.status(201).json({
        success: true,
        message: 'Prescription created successfully',
        data: prescription
      });
    } catch (error) {
      logger.error('Error creating prescription', { error: error.message, body: req.body });
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create prescription'
      });
    }
  }

  /**
   * Get prescription by ID
   */
  static async getPrescriptionById(req, res) {
    try {
      const { rxId } = req.params;
      const prescription = await PrescriptionService.getPrescriptionById(rxId);
      
      res.json({
        success: true,
        data: prescription
      });
    } catch (error) {
      logger.error('Error getting prescription by ID', { error: error.message, rxId: req.params.rxId });
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get prescription'
      });
    }
  }

  /**
   * Update prescription (only if DRAFT)
   */
  static async updatePrescription(req, res) {
    try {
      const { rxId } = req.params;
      const updateData = req.body;
      const userId = req.user.id;

      // Check if prescription exists and is in DRAFT status
      const prescription = await PrescriptionService.getPrescriptionById(rxId);
      if (prescription.status !== 'DRAFT') {
        return res.status(400).json({
          success: false,
          message: 'Only DRAFT prescriptions can be updated'
        });
      }

      // Update prescription
      const updatedPrescription = await PrescriptionService.updatePrescription(rxId, updateData, userId);
      
      res.json({
        success: true,
        message: 'Prescription updated successfully',
        data: updatedPrescription
      });
    } catch (error) {
      logger.error('Error updating prescription', { error: error.message, rxId: req.params.rxId });
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update prescription'
      });
    }
  }

  /**
   * Sign prescription
   */
  static async signPrescription(req, res) {
    try {
      const { rxId } = req.params;
      const { signature_data } = req.body;
      const optometristId = req.user.id;

      const prescription = await PrescriptionService.signPrescription(rxId, optometristId, signature_data);
      
      res.json({
        success: true,
        message: 'Prescription signed successfully',
        data: prescription
      });
    } catch (error) {
      logger.error('Error signing prescription', { error: error.message, rxId: req.params.rxId });
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to sign prescription'
      });
    }
  }

  /**
   * Get prescriptions by customer
   */
  static async getPrescriptionsByCustomer(req, res) {
    try {
      const { customerId } = req.params;
      const filters = req.query;

      const prescriptions = await PrescriptionService.getPrescriptionsByCustomer(customerId, filters);
      
      res.json({
        success: true,
        data: prescriptions
      });
    } catch (error) {
      logger.error('Error getting prescriptions by customer', { error: error.message, customerId: req.params.customerId });
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get prescriptions'
      });
    }
  }

  /**
   * Create checkup record
   */
  static async createCheckup(req, res) {
    try {
      const checkupData = req.body;
      const checkup = await PrescriptionService.createCheckup(checkupData);
      
      res.status(201).json({
        success: true,
        message: 'Checkup created successfully',
        data: checkup
      });
    } catch (error) {
      logger.error('Error creating checkup', { error: error.message, body: req.body });
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create checkup'
      });
    }
  }

  /**
   * Get checkups by customer
   */
  static async getCheckupsByCustomer(req, res) {
    try {
      const { customerId } = req.params;
      const filters = req.query;

      const checkups = await PrescriptionService.getCheckupsByCustomer(customerId, filters);
      
      res.json({
        success: true,
        data: checkups
      });
    } catch (error) {
      logger.error('Error getting checkups by customer', { error: error.message, customerId: req.params.customerId });
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get checkups'
      });
    }
  }

  /**
   * Create QR lead
   */
  static async createQRLead(req, res) {
    try {
      const leadData = req.body;
      const qrLead = await PrescriptionService.createQRLead(leadData);
      
      res.status(201).json({
        success: true,
        message: 'QR lead created successfully',
        data: qrLead
      });
    } catch (error) {
      logger.error('Error creating QR lead', { error: error.message, body: req.body });
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create QR lead'
      });
    }
  }

  /**
   * Get QR lead by reference ID
   */
  static async getQRLeadByRef(req, res) {
    try {
      const { qrRefId } = req.params;
      const qrLead = await PrescriptionService.getQRLeadByRef(qrRefId);
      
      res.json({
        success: true,
        data: qrLead
      });
    } catch (error) {
      logger.error('Error getting QR lead by ref', { error: error.message, qrRefId: req.params.qrRefId });
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get QR lead'
      });
    }
  }

  /**
   * Link QR lead to customer
   */
  static async linkQRLeadToCustomer(req, res) {
    try {
      const { qrRefId } = req.params;
      const { customerId } = req.body;

      const qrLead = await PrescriptionService.linkQRLeadToCustomer(qrRefId, customerId);
      
      res.json({
        success: true,
        message: 'QR lead linked to customer successfully',
        data: qrLead
      });
    } catch (error) {
      logger.error('Error linking QR lead to customer', { error: error.message, qrRefId: req.params.qrRefId });
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to link QR lead to customer'
      });
    }
  }

  /**
   * Get RxLinks for customer (for POS/E-commerce)
   */
  static async getRxLinksForCustomer(req, res) {
    try {
      const { customerId } = req.params;
      const { scope = 'POS' } = req.query;

      const rxLinks = await PrescriptionService.getRxLinksForCustomer(customerId, scope);
      
      res.json({
        success: true,
        data: rxLinks
      });
    } catch (error) {
      logger.error('Error getting RxLinks for customer', { error: error.message, customerId: req.params.customerId });
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get RxLinks'
      });
    }
  }

  /**
   * Redeem RxLink (for POS/E-commerce)
   */
  static async redeemRxLink(req, res) {
    try {
      const { rxLinkId } = req.params;
      const orderData = req.body;

      const result = await PrescriptionService.redeemRxLink(rxLinkId, orderData);
      
      res.json({
        success: true,
        message: 'RxLink redeemed successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error redeeming RxLink', { error: error.message, rxLinkId: req.params.rxLinkId });
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to redeem RxLink'
      });
    }
  }

  /**
   * Perform clinical calculation
   */
  static async performClinicalCalculation(req, res) {
    try {
      const { calculationType } = req.params;
      const parameters = req.body;

      const result = await PrescriptionService.performClinicalCalculation(calculationType, parameters);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error performing clinical calculation', { error: error.message, calculationType: req.params.calculationType });
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to perform clinical calculation'
      });
    }
  }

  /**
   * Get customer prescription history (for customer portal)
   */
  static async getCustomerPrescriptionHistory(req, res) {
    try {
      const customerId = req.user.customerId || req.params.customerId;
      const prescriptions = await PrescriptionService.getPrescriptionsByCustomer(customerId);
      
      // Get checkups for the same customer
      const checkups = await PrescriptionService.getCheckupsByCustomer(customerId);
      
      // Combine and sort by date
      const history = [...prescriptions, ...checkups].sort((a, b) => 
        new Date(b.rx_date || b.checkup_date) - new Date(a.rx_date || a.checkup_date)
      );
      
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      logger.error('Error getting customer prescription history', { error: error.message, customerId: req.params.customerId });
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get prescription history'
      });
    }
  }

  /**
   * Get customer recommendations based on latest prescription
   */
  static async getCustomerRecommendations(req, res) {
    try {
      const customerId = req.user.customerId || req.params.customerId;
      const prescriptions = await PrescriptionService.getPrescriptionsByCustomer(customerId, { status: 'SIGNED' });
      
      if (prescriptions.length === 0) {
        return res.json({
          success: true,
          data: {
            recommendations: [],
            message: 'No prescriptions found for recommendations'
          }
        });
      }

      const latestPrescription = prescriptions[0];
      const recommendations = [];

      // Generate recommendations based on prescription
      if (latestPrescription.type === 'SPECTACLE') {
        recommendations.push({
          type: 'LENS_MATERIAL',
          suggestion: 'Consider high-index lenses for better comfort',
          reason: 'High prescription detected'
        });
        
        if (latestPrescription.details?.lens_recommendation?.coatings) {
          recommendations.push({
            type: 'LENS_COATINGS',
            suggestion: 'Anti-reflective coating recommended',
            reason: 'Reduces glare and improves vision'
          });
        }
      } else if (latestPrescription.type === 'CONTACT_LENS') {
        recommendations.push({
          type: 'CONTACT_LENS_CARE',
          suggestion: 'Use recommended care solution',
          reason: 'Maintains lens comfort and hygiene'
        });
      }

      res.json({
        success: true,
        data: {
          recommendations,
          latest_prescription: latestPrescription
        }
      });
    } catch (error) {
      logger.error('Error getting customer recommendations', { error: error.message, customerId: req.params.customerId });
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get recommendations'
      });
    }
  }
}

module.exports = PrescriptionController;

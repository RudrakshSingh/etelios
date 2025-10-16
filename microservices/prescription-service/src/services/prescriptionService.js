const { Prescription, SpectacleRxDetails, ContactLensRxDetails } = require('../models/Prescription.model');
const Optometrist = require('../models/Optometrist.model');
const Checkup = require('../models/Checkup.model');
const RxLink = require('../models/RxLink.model');
const QRLead = require('../models/QRLead.model');
const Customer = require('../models/Customer.model');
const ClinicalCalculations = require('./clinicalCalculations');
const logger = require('../config/logger');

class PrescriptionService {
  
  /**
   * Create a new prescription
   */
  static async createPrescription(prescriptionData, userId) {
    try {
      const {
        customer_id,
        store_id,
        optometrist_id,
        type,
        visit_reason,
        spectacle,
        contact_lens,
        notes_clinical,
        suggestions_for_customer,
        attachments
      } = prescriptionData;

      // Generate prescription ID
      const rx_id = await this.generatePrescriptionId(type);
      
      // Calculate validity period
      const valid_until = this.calculateValidityPeriod(type);

      // Create main prescription
      const prescription = new Prescription({
        rx_id,
        customer_id,
        store_id,
        optometrist_id,
        type,
        visit_reason,
        valid_until,
        notes_clinical,
        suggestions_for_customer,
        attachments,
        audit_log: [{
          action: 'CREATED',
          performed_by: userId,
          details: 'Prescription created',
          timestamp: new Date()
        }]
      });

      await prescription.save();

      // Create type-specific details
      if (type === 'SPECTACLE' && spectacle) {
        await this.createSpectacleDetails(prescription._id, spectacle);
      } else if (type === 'CONTACT_LENS' && contact_lens) {
        await this.createContactLensDetails(prescription._id, contact_lens);
      }

      logger.info('Prescription created successfully', { 
        rx_id, customer_id, type, optometrist_id 
      });

      return await this.getPrescriptionById(prescription._id);
    } catch (error) {
      logger.error('Error creating prescription', { error: error.message, prescriptionData });
      throw new Error('Failed to create prescription');
    }
  }

  /**
   * Create spectacle prescription details
   */
  static async createSpectacleDetails(rxId, spectacleData) {
    try {
      const {
        distance,
        near,
        intermediate,
        add_power,
        pd,
        heights,
        prism,
        wrap_angle,
        pantoscopic_tilt,
        vertex_distance,
        lens_recommendation
      } = spectacleData;

      // Calculate near and intermediate if add power is provided
      let calculatedNear, calculatedIntermediate;
      if (add_power && distance) {
        const nearCalc = ClinicalCalculations.calculateNearAddition(distance, add_power);
        calculatedNear = nearCalc.near;
        calculatedIntermediate = nearCalc.intermediate;
      }

      const spectacleDetails = new SpectacleRxDetails({
        rx_id: rxId,
        distance,
        near: near || calculatedNear,
        intermediate: intermediate || calculatedIntermediate,
        add_power,
        pd,
        heights,
        prism,
        wrap_angle,
        pantoscopic_tilt,
        vertex_distance,
        lens_recommendation
      });

      await spectacleDetails.save();
      return spectacleDetails;
    } catch (error) {
      logger.error('Error creating spectacle details', { error: error.message, spectacleData });
      throw new Error('Failed to create spectacle details');
    }
  }

  /**
   * Create contact lens prescription details
   */
  static async createContactLensDetails(rxId, contactLensData) {
    try {
      const contactLensDetails = new ContactLensRxDetails({
        rx_id: rxId,
        ...contactLensData
      });

      await contactLensDetails.save();
      return contactLensDetails;
    } catch (error) {
      logger.error('Error creating contact lens details', { error: error.message, contactLensData });
      throw new Error('Failed to create contact lens details');
    }
  }

  /**
   * Sign a prescription (make it immutable)
   */
  static async signPrescription(rxId, optometristId, signatureData) {
    try {
      const prescription = await Prescription.findById(rxId);
      if (!prescription) {
        throw new Error('Prescription not found');
      }

      if (prescription.status !== 'DRAFT') {
        throw new Error('Only DRAFT prescriptions can be signed');
      }

      // Update prescription status
      prescription.status = 'SIGNED';
      prescription.updated_at = new Date();
      prescription.audit_log.push({
        action: 'SIGNED',
        performed_by: optometristId,
        details: 'Prescription signed by optometrist',
        timestamp: new Date()
      });

      await prescription.save();

      // Create RxLink for commerce use
      await this.createRxLink(prescription);

      logger.info('Prescription signed successfully', { rx_id: prescription.rx_id, optometrist_id: optometristId });
      return prescription;
    } catch (error) {
      logger.error('Error signing prescription', { error: error.message, rxId, optometristId });
      throw new Error('Failed to sign prescription');
    }
  }

  /**
   * Create RxLink for commerce integration
   */
  static async createRxLink(prescription) {
    try {
      const rxLink = new RxLink({
        rx_link_id: `RXL-${Date.now()}`,
        customer_id: prescription.customer_id,
        rx_id: prescription._id,
        scope: 'POS', // Default to POS, can be updated
        allowed_products: prescription.type === 'SPECTACLE' 
          ? ['SPECTACLE_LENS', 'FRAME'] 
          : ['CONTACT_LENS'],
        expiry: prescription.valid_until,
        created_by: prescription.optometrist_id
      });

      await rxLink.save();
      return rxLink;
    } catch (error) {
      logger.error('Error creating RxLink', { error: error.message, prescription });
      throw new Error('Failed to create RxLink');
    }
  }

  /**
   * Get prescription by ID with full details
   */
  static async getPrescriptionById(prescriptionId) {
    try {
      const prescription = await Prescription.findById(prescriptionId)
        .populate('customer_id', 'name phone email')
        .populate('store_id', 'name address')
        .populate('optometrist_id', 'name reg_no');

      if (!prescription) {
        throw new Error('Prescription not found');
      }

      // Get type-specific details
      let details = null;
      if (prescription.type === 'SPECTACLE') {
        details = await SpectacleRxDetails.findOne({ rx_id: prescriptionId });
      } else if (prescription.type === 'CONTACT_LENS') {
        details = await ContactLensRxDetails.findOne({ rx_id: prescriptionId });
      }

      return {
        ...prescription.toObject(),
        details
      };
    } catch (error) {
      logger.error('Error getting prescription by ID', { error: error.message, prescriptionId });
      throw new Error('Failed to get prescription');
    }
  }

  /**
   * Get prescriptions by customer
   */
  static async getPrescriptionsByCustomer(customerId, filters = {}) {
    try {
      const query = { customer_id: customerId };
      
      if (filters.type) query.type = filters.type;
      if (filters.status) query.status = filters.status;
      if (filters.from) query.rx_date = { $gte: new Date(filters.from) };
      if (filters.to) query.rx_date = { ...query.rx_date, $lte: new Date(filters.to) };

      const prescriptions = await Prescription.find(query)
        .populate('store_id', 'name address')
        .populate('optometrist_id', 'name reg_no')
        .sort({ rx_date: -1 });

      return prescriptions;
    } catch (error) {
      logger.error('Error getting prescriptions by customer', { error: error.message, customerId, filters });
      throw new Error('Failed to get prescriptions');
    }
  }

  /**
   * Create a checkup record
   */
  static async createCheckup(checkupData) {
    try {
      const checkup_id = await this.generateCheckupId();
      
      const checkup = new Checkup({
        checkup_id,
        ...checkupData
      });

      await checkup.save();
      
      logger.info('Checkup created successfully', { checkup_id, customer_id: checkupData.customer_id });
      return checkup;
    } catch (error) {
      logger.error('Error creating checkup', { error: error.message, checkupData });
      throw new Error('Failed to create checkup');
    }
  }

  /**
   * Create QR lead for free eye test
   */
  static async createQRLead(leadData) {
    try {
      const qr_ref_id = await this.generateQRRefId();
      
      const qrLead = new QRLead({
        qr_ref_id,
        ...leadData
      });

      await qrLead.save();
      
      logger.info('QR lead created successfully', { qr_ref_id, phone: leadData.phone });
      return qrLead;
    } catch (error) {
      logger.error('Error creating QR lead', { error: error.message, leadData });
      throw new Error('Failed to create QR lead');
    }
  }

  /**
   * Link QR lead to customer
   */
  static async linkQRLeadToCustomer(qrRefId, customerId) {
    try {
      const qrLead = await QRLead.findOne({ qr_ref_id: qrRefId });
      if (!qrLead) {
        throw new Error('QR lead not found');
      }

      qrLead.linked_customer_id = customerId;
      qrLead.status = 'CONVERTED';
      qrLead.updated_at = new Date();

      await qrLead.save();
      
      logger.info('QR lead linked to customer', { qr_ref_id: qrRefId, customer_id: customerId });
      return qrLead;
    } catch (error) {
      logger.error('Error linking QR lead to customer', { error: error.message, qrRefId, customerId });
      throw new Error('Failed to link QR lead to customer');
    }
  }

  /**
   * Get RxLinks for customer (for POS/E-commerce)
   */
  static async getRxLinksForCustomer(customerId, scope = 'POS') {
    try {
      const rxLinks = await RxLink.find({
        customer_id: customerId,
        scope,
        is_active: true,
        expiry: { $gt: new Date() }
      })
      .populate('rx_id')
      .sort({ created_at: -1 });

      return rxLinks;
    } catch (error) {
      logger.error('Error getting RxLinks for customer', { error: error.message, customerId, scope });
      throw new Error('Failed to get RxLinks');
    }
  }

  /**
   * Redeem RxLink (create snapshot for order)
   */
  static async redeemRxLink(rxLinkId, orderData) {
    try {
      const rxLink = await RxLink.findById(rxLinkId);
      if (!rxLink) {
        throw new Error('RxLink not found');
      }

      if (!rxLink.is_active || rxLink.expiry < new Date()) {
        throw new Error('RxLink is expired or inactive');
      }

      if (rxLink.usage_count >= rxLink.max_usage) {
        throw new Error('RxLink usage limit exceeded');
      }

      // Increment usage count
      rxLink.usage_count += 1;
      rxLink.updated_at = new Date();
      await rxLink.save();

      // Get prescription details for snapshot
      const prescription = await this.getPrescriptionById(rxLink.rx_id);

      logger.info('RxLink redeemed successfully', { rx_link_id: rxLink.rx_link_id, order_data: orderData });
      
      return {
        rxLink,
        prescription,
        snapshot: {
          rx_id: prescription.rx_id,
          type: prescription.type,
          valid_until: prescription.valid_until,
          details: prescription.details,
          redeemed_at: new Date(),
          order_reference: orderData.orderId
        }
      };
    } catch (error) {
      logger.error('Error redeeming RxLink', { error: error.message, rxLinkId, orderData });
      throw new Error('Failed to redeem RxLink');
    }
  }

  /**
   * Generate prescription ID
   */
  static async generatePrescriptionId(type) {
    const prefix = type === 'SPECTACLE' ? 'SRX' : 'CRX';
    const count = await Prescription.countDocuments({ type });
    return `${prefix}-${String(count + 1).padStart(6, '0')}`;
  }

  /**
   * Generate checkup ID
   */
  static async generateCheckupId() {
    const count = await Checkup.countDocuments();
    return `CHK-${String(count + 1).padStart(6, '0')}`;
  }

  /**
   * Generate QR reference ID
   */
  static async generateQRRefId() {
    const count = await QRLead.countDocuments();
    return `QR-${String(count + 1).padStart(8, '0')}`;
  }

  /**
   * Calculate validity period based on prescription type
   */
  static calculateValidityPeriod(type) {
    const now = new Date();
    const validityMonths = type === 'CONTACT_LENS' ? 12 : 12; // Both 12 months by default
    return new Date(now.getFullYear(), now.getMonth() + validityMonths, now.getDate());
  }

  /**
   * Get clinical calculation results
   */
  static async performClinicalCalculation(calculationType, parameters) {
    try {
      switch (calculationType) {
        case 'near_addition':
          return ClinicalCalculations.calculateNearAddition(
            parameters.distanceSet, 
            parameters.addPower, 
            parameters.intermediateFactor
          );
        
        case 'transpose':
          return ClinicalCalculations.transposeCylinder(
            parameters.sph, 
            parameters.cyl, 
            parameters.axis, 
            parameters.mode
          );
        
        case 'vertex_compensation':
          return ClinicalCalculations.calculateVertexCompensation(
            parameters.sph, 
            parameters.cyl, 
            parameters.axis, 
            parameters.vertexChange
          );
        
        case 'contact_lens_mapping':
          return ClinicalCalculations.mapToContactLens(
            parameters.spectacleRx, 
            parameters.brand, 
            parameters.series, 
            parameters.vertexDistance
          );
        
        default:
          throw new Error('Invalid calculation type');
      }
    } catch (error) {
      logger.error('Error performing clinical calculation', { error: error.message, calculationType, parameters });
      throw new Error('Failed to perform clinical calculation');
    }
  }
}

module.exports = PrescriptionService;

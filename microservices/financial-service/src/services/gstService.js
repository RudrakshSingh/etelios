const HSN = require('../models/HSN.model');
const GSTRate = require('../models/GSTRate.model');
const State = require('../models/State.model');
const logger = require('../config/logger');

class GSTService {
  /**
   * Calculate GST for a line item
   */
  async calculateGST(lineItem) {
    try {
      const {
        product_variant_id,
        hsn_code,
        taxable_value,
        ship_from_state,
        ship_to_state,
        customer_type = 'B2C',
        exemption_flags = []
      } = lineItem;

      // Get HSN details
      const hsnDetails = await HSN.findOne({ code: hsn_code, is_active: true });
      if (!hsnDetails) {
        throw new Error(`HSN code ${hsn_code} not found`);
      }

      // Get applicable GST rate
      const gstRate = await this.getApplicableGSTRate(hsn_code);
      if (!gstRate) {
        throw new Error(`No GST rate found for HSN ${hsn_code}`);
      }

      // Determine if INTRA or INTER state
      const isIntraState = ship_from_state === ship_to_state;
      
      // Calculate tax components
      const taxCalculation = this.calculateTaxComponents(
        taxable_value,
        gstRate.rate_pct,
        gstRate.cess_pct,
        isIntraState
      );

      // Apply exemptions if any
      if (exemption_flags.length > 0) {
        taxCalculation = this.applyExemptions(taxCalculation, exemption_flags);
      }

      return {
        hsn_code,
        taxable_value,
        gst_rate: gstRate.rate_pct,
        cess_rate: gstRate.cess_pct,
        is_intra_state: isIntraState,
        cgst: taxCalculation.cgst,
        sgst: taxCalculation.sgst,
        igst: taxCalculation.igst,
        cess: taxCalculation.cess,
        total_tax: taxCalculation.total_tax,
        total_amount: taxCalculation.total_amount
      };
    } catch (error) {
      logger.error('Error calculating GST:', error);
      throw error;
    }
  }

  /**
   * Get applicable GST rate for HSN code
   */
  async getApplicableGSTRate(hsnCode) {
    try {
      const today = new Date();
      
      const gstRate = await GSTRate.findOne({
        _id: { $in: await this.getHSNRateMapping(hsnCode) },
        effective_from: { $lte: today },
        $or: [
          { effective_to: { $gte: today } },
          { effective_to: null }
        ],
        is_active: true
      }).sort({ effective_from: -1 });

      return gstRate;
    } catch (error) {
      logger.error('Error getting GST rate:', error);
      throw error;
    }
  }

  /**
   * Get HSN rate mapping
   */
  async getHSNRateMapping(hsnCode) {
    try {
      const hsn = await HSN.findOne({ code: hsnCode, is_active: true });
      if (!hsn) {
        throw new Error(`HSN code ${hsnCode} not found`);
      }
      
      return hsn.default_gst_rate_id;
    } catch (error) {
      logger.error('Error getting HSN rate mapping:', error);
      throw error;
    }
  }

  /**
   * Calculate tax components
   */
  calculateTaxComponents(taxableValue, ratePct, cessPct, isIntraState) {
    const baseTax = (taxableValue * ratePct) / 100;
    const cess = (taxableValue * cessPct) / 100;
    
    let cgst = 0, sgst = 0, igst = 0;
    
    if (isIntraState) {
      // INTRA state - split into CGST and SGST
      cgst = baseTax / 2;
      sgst = baseTax / 2;
    } else {
      // INTER state - IGST
      igst = baseTax;
    }
    
    const totalTax = cgst + sgst + igst + cess;
    const totalAmount = taxableValue + totalTax;
    
    return {
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      igst: Math.round(igst * 100) / 100,
      cess: Math.round(cess * 100) / 100,
      total_tax: Math.round(totalTax * 100) / 100,
      total_amount: Math.round(totalAmount * 100) / 100
    };
  }

  /**
   * Apply exemptions to tax calculation
   */
  applyExemptions(taxCalculation, exemptionFlags) {
    // Reset all taxes if exempt
    if (exemptionFlags.includes('EXEMPT')) {
      taxCalculation.cgst = 0;
      taxCalculation.sgst = 0;
      taxCalculation.igst = 0;
      taxCalculation.cess = 0;
      taxCalculation.total_tax = 0;
      taxCalculation.total_amount = taxCalculation.taxable_value;
    }
    
    return taxCalculation;
  }

  /**
   * Calculate GST for multiple line items
   */
  async calculateBulkGST(lineItems, shipFromState, shipToState, customerType = 'B2C') {
    try {
      const results = [];
      let totalTaxableValue = 0;
      let totalCGST = 0;
      let totalSGST = 0;
      let totalIGST = 0;
      let totalCess = 0;
      let totalTax = 0;
      let totalAmount = 0;

      for (const item of lineItems) {
        const gstCalculation = await this.calculateGST({
          ...item,
          ship_from_state: shipFromState,
          ship_to_state: shipToState,
          customer_type: customerType
        });

        results.push(gstCalculation);
        
        totalTaxableValue += gstCalculation.taxable_value;
        totalCGST += gstCalculation.cgst;
        totalSGST += gstCalculation.sgst;
        totalIGST += gstCalculation.igst;
        totalCess += gstCalculation.cess;
        totalTax += gstCalculation.total_tax;
        totalAmount += gstCalculation.total_amount;
      }

      return {
        line_items: results,
        summary: {
          total_taxable_value: Math.round(totalTaxableValue * 100) / 100,
          total_cgst: Math.round(totalCGST * 100) / 100,
          total_sgst: Math.round(totalSGST * 100) / 100,
          total_igst: Math.round(totalIGST * 100) / 100,
          total_cess: Math.round(totalCess * 100) / 100,
          total_tax: Math.round(totalTax * 100) / 100,
          total_amount: Math.round(totalAmount * 100) / 100
        }
      };
    } catch (error) {
      logger.error('Error calculating bulk GST:', error);
      throw error;
    }
  }

  /**
   * Get GST rate history for HSN
   */
  async getGSTRateHistory(hsnCode) {
    try {
      const hsn = await HSN.findOne({ code: hsnCode, is_active: true });
      if (!hsn) {
        throw new Error(`HSN code ${hsnCode} not found`);
      }

      const rateHistory = await GSTRate.find({
        _id: hsn.default_gst_rate_id
      }).sort({ effective_from: -1 });

      return rateHistory;
    } catch (error) {
      logger.error('Error getting GST rate history:', error);
      throw error;
    }
  }

  /**
   * Update GST rate for HSN
   */
  async updateGSTRate(hsnCode, newRatePct, effectiveFrom, updatedBy) {
    try {
      const hsn = await HSN.findOne({ code: hsnCode, is_active: true });
      if (!hsn) {
        throw new Error(`HSN code ${hsnCode} not found`);
      }

      // End current rate
      await GSTRate.updateOne(
        { _id: hsn.default_gst_rate_id },
        { 
          effective_to: new Date(effectiveFrom.getTime() - 24 * 60 * 60 * 1000), // Day before new rate
          updated_at: new Date()
        }
      );

      // Create new rate
      const newRate = new GSTRate({
        name: `Rate for HSN ${hsnCode}`,
        rate_pct: newRatePct,
        cess_pct: 0,
        effective_from: effectiveFrom,
        is_active: true
      });

      await newRate.save();

      // Update HSN with new rate
      hsn.default_gst_rate_id = newRate._id;
      await hsn.save();

      logger.info(`GST rate updated for HSN ${hsnCode}: ${newRatePct}% effective from ${effectiveFrom}`);
      return newRate;
    } catch (error) {
      logger.error('Error updating GST rate:', error);
      throw error;
    }
  }

  /**
   * Get state-wise tax configuration
   */
  async getStateTaxConfig(stateCode) {
    try {
      const state = await State.findOne({ code: stateCode, is_active: true });
      if (!state) {
        throw new Error(`State ${stateCode} not found`);
      }

      // This would typically come from a tax configuration table
      // For now, return standard configuration
      return {
        state_code: stateCode,
        state_name: state.name,
        cgst_rate: 0, // Will be calculated based on GST rate
        sgst_rate: 0, // Will be calculated based on GST rate
        igst_rate: 0  // Will be calculated based on GST rate
      };
    } catch (error) {
      logger.error('Error getting state tax config:', error);
      throw error;
    }
  }

  /**
   * Validate HSN code
   */
  async validateHSNCode(hsnCode) {
    try {
      const hsn = await HSN.findOne({ code: hsnCode, is_active: true });
      return {
        is_valid: !!hsn,
        hsn_details: hsn
      };
    } catch (error) {
      logger.error('Error validating HSN code:', error);
      throw error;
    }
  }
}

module.exports = new GSTService();

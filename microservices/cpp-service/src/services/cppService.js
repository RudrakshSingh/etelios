const CPPPolicy = require('../models/CPPPolicy.model');
const CPPEnrollment = require('../models/CPPEnrollment.model');
const CPPClaim = require('../models/CPPClaim.model');
const Customer = require('../models/Customer.model');
const SalesOrder = require('../models/SalesOrder.model');
const Inventory = require('../models/Inventory.model');

class CPPService {
  // CPP Policy Management
  async createCPPPolicy(policyData) {
    try {
      const policy = new CPPPolicy(policyData);
      await policy.save();
      return { success: true, data: policy };
    } catch (error) {
      throw new Error(`Failed to create CPP policy: ${error.message}`);
    }
  }

  async getCPPPolicies(filters = {}) {
    try {
      const policies = await CPPPolicy.find(filters);
      return { success: true, data: policies };
    } catch (error) {
      throw new Error(`Failed to get CPP policies: ${error.message}`);
    }
  }

  async getActiveCPPPolicy() {
    try {
      const policy = await CPPPolicy.findOne({ is_active: true });
      if (!policy) {
        throw new Error('No active CPP policy found');
      }
      return { success: true, data: policy };
    } catch (error) {
      throw new Error(`Failed to get active CPP policy: ${error.message}`);
    }
  }

  // CPP Enrollment Management
  async createCPPEnrollment(enrollmentData) {
    try {
      // Get active policy
      const policyResult = await this.getActiveCPPPolicy();
      const policy = policyResult.data;

      // Calculate CPP prices for each line
      const processedLines = enrollmentData.lines.map(line => {
        const cppPrice = this.calculateCPPPrice(line, policy);
        return {
          ...line,
          cpp_price: cppPrice,
          eligible_mrp: line.mrp,
          cpp_divisor: this.getDivisorForProduct(line, policy)
        };
      });

      const enrollment = new CPPEnrollment({
        ...enrollmentData,
        lines: processedLines,
        expiry_at: new Date(enrollmentData.invoice_date.getTime() + (policy.validity_days * 24 * 60 * 60 * 1000))
      });

      await enrollment.save();
      return { success: true, data: enrollment };
    } catch (error) {
      throw new Error(`Failed to create CPP enrollment: ${error.message}`);
    }
  }

  async getCPPEnrollments(filters = {}) {
    try {
      const enrollments = await CPPEnrollment.find(filters)
        .populate('customer_id', 'name email phone')
        .populate('store_id', 'name address')
        .populate('created_by', 'name email');
      return { success: true, data: enrollments };
    } catch (error) {
      throw new Error(`Failed to get CPP enrollments: ${error.message}`);
    }
  }

  async getCPPEnrollmentById(enrollmentId) {
    try {
      const enrollment = await CPPEnrollment.findById(enrollmentId)
        .populate('customer_id', 'name email phone')
        .populate('store_id', 'name address')
        .populate('created_by', 'name email');
      
      if (!enrollment) {
        throw new Error('CPP enrollment not found');
      }
      return { success: true, data: enrollment };
    } catch (error) {
      throw new Error(`Failed to get CPP enrollment: ${error.message}`);
    }
  }

  // CPP Claim Management
  async createCPPClaim(claimData) {
    try {
      // Validate eligibility
      const eligibility = await this.checkEligibility(claimData.enrollment_id, claimData.line_id, claimData.customer_id);
      if (!eligibility.eligible) {
        throw new Error(`Claim not eligible: ${eligibility.reason}`);
      }

      const claim = new CPPClaim(claimData);
      await claim.save();

      // Update enrollment claim count
      await this.updateEnrollmentClaimCount(claimData.enrollment_id, claimData.line_id);

      return { success: true, data: claim };
    } catch (error) {
      throw new Error(`Failed to create CPP claim: ${error.message}`);
    }
  }

  async getCPPClaims(filters = {}) {
    try {
      const claims = await CPPClaim.find(filters)
        .populate('customer_id', 'name email phone')
        .populate('store_id', 'name address')
        .populate('created_by', 'name email')
        .populate('approved_by', 'name email')
        .populate('fulfilled_by', 'name email');
      return { success: true, data: claims };
    } catch (error) {
      throw new Error(`Failed to get CPP claims: ${error.message}`);
    }
  }

  async getCPPClaimById(claimId) {
    try {
      const claim = await CPPClaim.findById(claimId)
        .populate('customer_id', 'name email phone')
        .populate('store_id', 'name address')
        .populate('created_by', 'name email')
        .populate('approved_by', 'name email')
        .populate('fulfilled_by', 'name email');
      
      if (!claim) {
        throw new Error('CPP claim not found');
      }
      return { success: true, data: claim };
    } catch (error) {
      throw new Error(`Failed to get CPP claim: ${error.message}`);
    }
  }

  async assessCPPClaim(claimId, assessmentData, userId) {
    try {
      const claim = await CPPClaim.findById(claimId);
      if (!claim) {
        throw new Error('CPP claim not found');
      }

      // Calculate CPP price and upcharge
      const assessment = this.calculateClaimAssessment(claim, assessmentData);
      
      claim.assessment = assessment;
      claim.replacement = assessmentData.replacement;
      claim.status = assessmentData.approved ? 'APPROVED' : 'REJECTED';
      claim.rejection_reason = assessmentData.approved ? null : assessmentData.rejection_reason;
      claim.approved_by = userId;

      // Add to audit log
      claim.audit_log.push({
        user_id: userId,
        action: 'ASSESSED',
        from_status: 'PENDING',
        to_status: claim.status,
        notes: assessmentData.notes || 'Claim assessment completed',
        metadata: { assessment }
      });

      await claim.save();
      return { success: true, data: claim };
    } catch (error) {
      throw new Error(`Failed to assess CPP claim: ${error.message}`);
    }
  }

  async checkoutCPPClaim(claimId, checkoutData, userId) {
    try {
      const claim = await CPPClaim.findById(claimId);
      if (!claim) {
        throw new Error('CPP claim not found');
      }

      if (claim.status !== 'APPROVED') {
        throw new Error('Only approved claims can be checked out');
      }

      // Generate CPP invoice
      const invoiceData = this.generateCPPInvoice(claim, checkoutData);
      
      claim.billing = invoiceData;
      claim.status = 'FULFILLED';
      claim.fulfilled_by = userId;

      // Add to audit log
      claim.audit_log.push({
        user_id: userId,
        action: 'CHECKOUT',
        from_status: 'APPROVED',
        to_status: 'FULFILLED',
        notes: 'CPP claim fulfilled and invoiced',
        metadata: { invoice_data: invoiceData }
      });

      await claim.save();
      return { success: true, data: claim };
    } catch (error) {
      throw new Error(`Failed to checkout CPP claim: ${error.message}`);
    }
  }

  async updateCPPClaimStatus(claimId, status, userId, reason = '') {
    try {
      const claim = await CPPClaim.findById(claimId);
      if (!claim) {
        throw new Error('CPP claim not found');
      }

      const oldStatus = claim.status;
      claim.status = status;
      claim.rejection_reason = status === 'REJECTED' ? reason : null;

      // Add to audit log
      claim.audit_log.push({
        user_id: userId,
        action: 'STATUS_CHANGED',
        from_status: oldStatus,
        to_status: status,
        notes: reason || `Status changed from ${oldStatus} to ${status}`,
        metadata: { reason }
      });

      await claim.save();
      return { success: true, data: claim };
    } catch (error) {
      throw new Error(`Failed to update CPP claim status: ${error.message}`);
    }
  }

  // Helper Methods
  calculateCPPPrice(line, policy) {
    let divisor;
    
    if (line.product_type === 'lens') {
      divisor = policy.lens_rule.divisor;
    } else {
      const brandRule = policy.brand_rules.find(rule => rule.brand_type === line.brand_type);
      divisor = brandRule ? brandRule.divisor : 3.0; // Default to in-house
    }

    const cppPrice = line.mrp / divisor;
    return this.roundPrice(cppPrice, policy.rounding_mode);
  }

  getDivisorForProduct(line, policy) {
    if (line.product_type === 'lens') {
      return policy.lens_rule.divisor;
    } else {
      const brandRule = policy.brand_rules.find(rule => rule.brand_type === line.brand_type);
      return brandRule ? brandRule.divisor : 3.0;
    }
  }

  roundPrice(price, mode) {
    switch (mode) {
      case 'HALF_UP':
        return Math.round(price);
      case 'HALF_DOWN':
        return Math.floor(price + 0.5);
      case 'ROUND_UP':
        return Math.ceil(price);
      case 'ROUND_DOWN':
        return Math.floor(price);
      default:
        return Math.round(price);
    }
  }

  async checkEligibility(enrollmentId, lineId, customerId) {
    try {
      const enrollment = await CPPEnrollment.findById(enrollmentId);
      if (!enrollment) {
        return { eligible: false, reason: 'Enrollment not found' };
      }

      // Check if enrollment is active and not expired
      if (enrollment.status !== 'ACTIVE') {
        return { eligible: false, reason: 'Enrollment not active' };
      }

      if (new Date() > enrollment.expiry_at) {
        return { eligible: false, reason: 'Enrollment expired' };
      }

      // Check customer match
      if (enrollment.customer_id.toString() !== customerId.toString()) {
        return { eligible: false, reason: 'Customer mismatch' };
      }

      // Check line eligibility
      const line = enrollment.lines.find(l => l.line_id === lineId);
      if (!line) {
        return { eligible: false, reason: 'Line not found in enrollment' };
      }

      if (!line.is_claimable) {
        return { eligible: false, reason: 'Line not claimable' };
      }

      // Check if already claimed
      const existingClaim = await CPPClaim.findOne({
        enrollment_id: enrollmentId,
        line_id: lineId,
        status: { $in: ['PENDING', 'APPROVED', 'FULFILLED'] }
      });

      if (existingClaim) {
        return { eligible: false, reason: 'Line already claimed' };
      }

      return { eligible: true, reason: 'Eligible for claim' };
    } catch (error) {
      return { eligible: false, reason: 'Error checking eligibility' };
    }
  }

  async updateEnrollmentClaimCount(enrollmentId, lineId) {
    try {
      await CPPEnrollment.updateOne(
        { _id: enrollmentId, 'lines.line_id': lineId },
        { 
          $inc: { 'lines.$.claim_count': 1 },
          $set: { 'lines.$.is_claimable': false }
        }
      );
    } catch (error) {
      console.error('Failed to update enrollment claim count:', error);
    }
  }

  calculateClaimAssessment(claim, assessmentData) {
    const enrollment = claim.enrollment_id; // This should be populated
    const line = enrollment.lines.find(l => l.line_id === claim.line_id);
    
    const cppPrice = line.cpp_price;
    const newMrp = assessmentData.replacement.new_mrp;
    const eligibleMrp = line.eligible_mrp;
    
    const upcharge = Math.max(0, newMrp - eligibleMrp);
    const totalPayable = cppPrice + upcharge;

    return {
      approved_mrp: newMrp,
      divisor_used: line.cpp_divisor,
      cpp_price: cppPrice,
      eligible_payable: cppPrice,
      upcharge_difference: upcharge,
      taxes: {
        cgst: 0, // Calculate based on tax rules
        sgst: 0,
        igst: 0,
        cess: 0
      }
    };
  }

  generateCPPInvoice(claim, checkoutData) {
    const assessment = claim.assessment;
    const totalPayable = assessment.cpp_price + assessment.upcharge_difference + 
                        assessment.taxes.cgst + assessment.taxes.sgst + 
                        assessment.taxes.igst + assessment.taxes.cess;

    return {
      cpp_invoice_no: `CPP-${Date.now()}`,
      cpp_price: assessment.cpp_price,
      upcharge: assessment.upcharge_difference,
      tax_breakup: assessment.taxes,
      total_payable: totalPayable
    };
  }

  // Price Simulation
  async simulateCPPPrice(simulationData) {
    try {
      const policy = await this.getActiveCPPPolicy();
      const cppPrice = this.calculateCPPPrice(simulationData, policy.data);
      
      return {
        success: true,
        data: {
          product_type: simulationData.product_type,
          brand_type: simulationData.brand_type,
          mrp: simulationData.mrp,
          cpp_price: cppPrice,
          divisor_used: this.getDivisorForProduct(simulationData, policy.data)
        }
      };
    } catch (error) {
      throw new Error(`Failed to simulate CPP price: ${error.message}`);
    }
  }

  // Eligibility Check
  async checkEligibilityByInvoice(invoiceNo, sku, customerId) {
    try {
      const enrollment = await CPPEnrollment.findOne({
        invoice_no: invoiceNo,
        customer_id: customerId,
        status: 'ACTIVE'
      });

      if (!enrollment) {
        return { eligible: false, reason: 'No active enrollment found' };
      }

      const line = enrollment.lines.find(l => l.sku === sku);
      if (!line) {
        return { eligible: false, reason: 'SKU not found in enrollment' };
      }

      return await this.checkEligibility(enrollment._id, line.line_id, customerId);
    } catch (error) {
      return { eligible: false, reason: 'Error checking eligibility' };
    }
  }

  // Reports and Analytics
  async getCPPAnalytics(filters = {}) {
    try {
      const analytics = await CPPClaim.aggregate([
        { $match: filters },
        {
          $group: {
            _id: null,
            total_claims: { $sum: 1 },
            approved_claims: {
              $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0] }
            },
            fulfilled_claims: {
              $sum: { $cond: [{ $eq: ['$status', 'FULFILLED'] }, 1, 0] }
            },
            total_cpp_revenue: { $sum: '$billing.cpp_price' },
            total_upcharge: { $sum: '$billing.upcharge' },
            avg_cpp_price: { $avg: '$billing.cpp_price' }
          }
        }
      ]);

      return { success: true, data: analytics[0] || {} };
    } catch (error) {
      throw new Error(`Failed to get CPP analytics: ${error.message}`);
    }
  }
}

module.exports = new CPPService();

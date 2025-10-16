const Customer = require('../models/Customer.model');
const QRLead = require('../models/QRLead.model');
const User = require('../models/User.model');
const Store = require('../models/Store.model');
const { sendSMS } = require('./messageService');
const { auditLogger } = require('../middleware/security.middleware');
const logger = require('../config/logger');
const crypto = require('crypto');

// OTP storage (in production, use Redis)
const otpStorage = new Map();
const OTP_EXPIRY = 10 * 60 * 1000; // 10 minutes
const OTP_RATE_LIMIT = 3; // 3 attempts per 10 minutes

/**
 * Generate and send OTP for phone verification
 * @param {string} phone - Phone number
 * @param {string} userId - User ID requesting OTP
 * @returns {Promise<object>} - OTP details
 */
async function sendOTP(phone, userId) {
  try {
    // Check rate limit
    const rateLimitKey = `otp_${phone}`;
    const attempts = otpStorage.get(rateLimitKey) || { count: 0, lastAttempt: 0 };
    
    if (attempts.count >= OTP_RATE_LIMIT && (Date.now() - attempts.lastAttempt) < 10 * 60 * 1000) {
      throw new Error('OTP rate limit exceeded. Please try again later.');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + OTP_EXPIRY;

    // Store OTP
    otpStorage.set(phone, { otp, expiry, attempts: 0 });
    
    // Update rate limit
    otpStorage.set(rateLimitKey, { 
      count: attempts.count + 1, 
      lastAttempt: Date.now() 
    });

    // Send SMS (in production, use actual SMS service)
    const message = `Your Etelios verification code is ${otp}. Valid for 10 minutes.`;
    await sendSMS(phone, message);

    auditLogger(userId, 'otp:send', 'OTP sent for manual registration', { phone });
    logger.info(`OTP sent to ${phone} for manual registration`);

    return {
      success: true,
      message: 'OTP sent successfully',
      expires_in: OTP_EXPIRY / 1000 // seconds
    };
  } catch (error) {
    logger.error(`Error sending OTP to ${phone}: ${error.message}`);
    throw new Error(`Failed to send OTP: ${error.message}`);
  }
}

/**
 * Verify OTP and complete manual registration
 * @param {string} phone - Phone number
 * @param {string} code - OTP code
 * @param {object} customerData - Customer data
 * @param {string} userId - User ID
 * @returns {Promise<object>} - Registration result
 */
async function verifyOTPAndRegister(phone, code, customerData, userId) {
  try {
    // Verify OTP
    const storedOTP = otpStorage.get(phone);
    if (!storedOTP) {
      throw new Error('OTP not found or expired');
    }

    if (storedOTP.attempts >= 3) {
      throw new Error('Maximum OTP attempts exceeded');
    }

    if (storedOTP.expiry < Date.now()) {
      otpStorage.delete(phone);
      throw new Error('OTP expired');
    }

    if (storedOTP.otp !== code) {
      storedOTP.attempts += 1;
      otpStorage.set(phone, storedOTP);
      throw new Error('Invalid OTP');
    }

    // OTP verified, proceed with registration
    otpStorage.delete(phone);

    const { name, email, dob, city, store_id, link_checkup_id } = customerData;

    // Check for existing customer
    let existingCustomer = await Customer.findOne({ phone });
    
    if (existingCustomer) {
      // Customer exists, create QRLead and link
      const qrLead = new QRLead({
        phone,
        name: name || existingCustomer.name,
        email: email || existingCustomer.email,
        dob: dob || existingCustomer.dob,
        city: city || existingCustomer.addresses[0]?.city,
        store_id,
        source: 'MANUAL',
        status: link_checkup_id ? 'ATTENDED' : 'NEW',
        linked_customer_id: existingCustomer._id,
        linked_checkup_id,
        phone_verified: true,
        verified_at: new Date(),
        created_by: userId
      });

      await qrLead.save();

      // Update customer phone verification status
      existingCustomer.phone_verified = true;
      await existingCustomer.save();

      auditLogger(userId, 'manual_register:existing', 'Manual registration linked to existing customer', { 
        customer_id: existingCustomer.customer_id,
        qr_ref_id: qrLead.qr_ref_id 
      });

      return {
        success: true,
        customer_id: existingCustomer.customer_id,
        qr_ref_id: qrLead.qr_ref_id,
        is_existing: true,
        customer: existingCustomer
      };
    }

    // Create new customer
    const customer = new Customer({
      name,
      email,
      phone,
      dob,
      addresses: [{
        type: 'home',
        line1: city || 'Not provided',
        city: city || 'Not provided',
        state: 'Not provided',
        pincode: '000000',
        country: 'India',
        is_primary: true
      }],
      primary_store_id: store_id,
      created_source: 'MANUAL',
      phone_verified: true,
      tags: ['new']
    });

    await customer.save();

    // Create QRLead
    const qrLead = new QRLead({
      phone,
      name,
      email,
      dob,
      city,
      store_id,
      source: 'MANUAL',
      status: link_checkup_id ? 'ATTENDED' : 'NEW',
      linked_customer_id: customer._id,
      linked_checkup_id,
      phone_verified: true,
      verified_at: new Date(),
      created_by: userId
    });

    await qrLead.save();

    auditLogger(userId, 'manual_register:new', 'New customer created via manual registration', { 
      customer_id: customer.customer_id,
      qr_ref_id: qrLead.qr_ref_id 
    });

    logger.info(`New customer created via manual registration: ${customer.customer_id}`);

    return {
      success: true,
      customer_id: customer.customer_id,
      qr_ref_id: qrLead.qr_ref_id,
      is_existing: false,
      customer
    };
  } catch (error) {
    logger.error(`Error in manual registration: ${error.message}`);
    throw new Error(`Manual registration failed: ${error.message}`);
  }
}

/**
 * Preview potential duplicate customers
 * @param {string} phone - Phone number
 * @param {string} name - Customer name
 * @param {string} email - Customer email
 * @returns {Promise<object>} - Duplicate preview
 */
async function previewDuplicates(phone, name, email) {
  try {
    const matches = [];
    
    // Search by phone
    const phoneMatch = await Customer.findOne({ phone });
    if (phoneMatch) {
      matches.push({
        customer_id: phoneMatch.customer_id,
        name: phoneMatch.name,
        phone: phoneMatch.phone,
        email: phoneMatch.email,
        confidence: 100,
        reason: 'Exact phone match'
      });
    }

    // Search by name similarity (if provided)
    if (name && name.length > 2) {
      const nameMatches = await Customer.find({
        name: { $regex: new RegExp(name, 'i') },
        phone: { $ne: phone }
      }).limit(5);

      nameMatches.forEach(match => {
        const similarity = calculateNameSimilarity(name, match.name);
        if (similarity > 70) {
          matches.push({
            customer_id: match.customer_id,
            name: match.name,
            phone: match.phone,
            email: match.email,
            confidence: similarity,
            reason: 'Name similarity'
          });
        }
      });
    }

    // Search by email (if provided)
    if (email) {
      const emailMatch = await Customer.findOne({ email });
      if (emailMatch && emailMatch.phone !== phone) {
        matches.push({
          customer_id: emailMatch.customer_id,
          name: emailMatch.name,
          phone: emailMatch.phone,
          email: emailMatch.email,
          confidence: 90,
          reason: 'Email match'
        });
      }
    }

    return {
      success: true,
      matches: matches.sort((a, b) => b.confidence - a.confidence),
      total_matches: matches.length
    };
  } catch (error) {
    logger.error(`Error previewing duplicates: ${error.message}`);
    throw new Error(`Failed to preview duplicates: ${error.message}`);
  }
}

/**
 * Merge duplicate customers
 * @param {string} primaryCustomerId - Primary customer ID
 * @param {string} duplicateCustomerId - Duplicate customer ID
 * @param {object} keepFields - Fields to keep from duplicate
 * @param {string} userId - User ID performing merge
 * @returns {Promise<object>} - Merge result
 */
async function mergeCustomers(primaryCustomerId, duplicateCustomerId, keepFields, userId) {
  try {
    const primaryCustomer = await Customer.findById(primaryCustomerId);
    const duplicateCustomer = await Customer.findById(duplicateCustomerId);

    if (!primaryCustomer || !duplicateCustomer) {
      throw new Error('One or both customers not found');
    }

    // Merge fields as specified
    if (keepFields.email === 'duplicate' && duplicateCustomer.email) {
      primaryCustomer.email = duplicateCustomer.email;
    }
    if (keepFields.dob === 'duplicate' && duplicateCustomer.dob) {
      primaryCustomer.dob = duplicateCustomer.dob;
    }
    if (keepFields.addresses === 'duplicate' && duplicateCustomer.addresses.length > 0) {
      primaryCustomer.addresses = [...primaryCustomer.addresses, ...duplicateCustomer.addresses];
    }

    // Update loyalty points and wallet balance
    primaryCustomer.loyalty_points += duplicateCustomer.loyalty_points || 0;
    primaryCustomer.wallet_balance += duplicateCustomer.wallet_balance || 0;

    // Mark duplicate as merged
    duplicateCustomer.duplicate_of_customer_id = primaryCustomer._id;
    duplicateCustomer.is_active = false;

    // Update all related records
    await Promise.all([
      // Update QRLeads
      QRLead.updateMany(
        { linked_customer_id: duplicateCustomerId },
        { 
          linked_customer_id: primaryCustomerId,
          replaced_by_ref: primaryCustomer.customer_id 
        }
      ),
      // Update Prescriptions
      require('../models/Prescription.model').Prescription.updateMany(
        { customer_id: duplicateCustomerId },
        { customer_id: primaryCustomerId }
      ),
      // Update Checkups
      require('../models/Checkup.model').updateMany(
        { customer_id: duplicateCustomerId },
        { customer_id: primaryCustomerId }
      ),
      // Update Orders (if exists)
      // Order.updateMany({ customer_id: duplicateCustomerId }, { customer_id: primaryCustomerId }),
      // Update Loyalty Transactions (if exists)
      // LoyaltyTxn.updateMany({ customer_id: duplicateCustomerId }, { customer_id: primaryCustomerId })
    ]);

    await primaryCustomer.save();
    await duplicateCustomer.save();

    auditLogger(userId, 'customer:merge', 'Customers merged', {
      primary_customer_id: primaryCustomer.customer_id,
      duplicate_customer_id: duplicateCustomer.customer_id,
      merged_fields: keepFields
    });

    logger.info(`Customers merged: ${duplicateCustomer.customer_id} -> ${primaryCustomer.customer_id}`);

    return {
      success: true,
      primary_customer_id: primaryCustomer.customer_id,
      merged_customer_id: duplicateCustomer.customer_id,
      message: 'Customers merged successfully'
    };
  } catch (error) {
    logger.error(`Error merging customers: ${error.message}`);
    throw new Error(`Failed to merge customers: ${error.message}`);
  }
}

/**
 * Calculate name similarity percentage
 * @param {string} name1 - First name
 * @param {string} name2 - Second name
 * @returns {number} - Similarity percentage
 */
function calculateNameSimilarity(name1, name2) {
  const s1 = name1.toLowerCase().trim();
  const s2 = name2.toLowerCase().trim();
  
  if (s1 === s2) return 100;
  
  // Simple Levenshtein distance calculation
  const matrix = [];
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  return Math.round(((maxLength - distance) / maxLength) * 100);
}

/**
 * Get manual registration statistics
 * @param {string} storeId - Store ID (optional)
 * @param {Date} fromDate - Start date (optional)
 * @param {Date} toDate - End date (optional)
 * @returns {Promise<object>} - Statistics
 */
async function getManualRegistrationStats(storeId, fromDate, toDate) {
  try {
    const query = { source: 'MANUAL' };
    
    if (storeId) query.store_id = storeId;
    if (fromDate || toDate) {
      query.created_at = {};
      if (fromDate) query.created_at.$gte = fromDate;
      if (toDate) query.created_at.$lte = toDate;
    }

    const totalManualRegistrations = await QRLead.countDocuments(query);
    const verifiedRegistrations = await QRLead.countDocuments({ ...query, phone_verified: true });
    const linkedToCheckups = await QRLead.countDocuments({ ...query, linked_checkup_id: { $exists: true } });
    const convertedRegistrations = await QRLead.countDocuments({ ...query, status: 'CONVERTED' });

    return {
      success: true,
      stats: {
        total_manual_registrations: totalManualRegistrations,
        verified_registrations: verifiedRegistrations,
        linked_to_checkups: linkedToCheckups,
        converted_registrations: convertedRegistrations,
        verification_rate: totalManualRegistrations > 0 ? (verifiedRegistrations / totalManualRegistrations * 100).toFixed(2) : 0,
        conversion_rate: totalManualRegistrations > 0 ? (convertedRegistrations / totalManualRegistrations * 100).toFixed(2) : 0
      }
    };
  } catch (error) {
    logger.error(`Error getting manual registration stats: ${error.message}`);
    throw new Error(`Failed to get statistics: ${error.message}`);
  }
}

module.exports = {
  sendOTP,
  verifyOTPAndRegister,
  previewDuplicates,
  mergeCustomers,
  getManualRegistrationStats
};

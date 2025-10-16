const Coupon = require('../models/Coupon.model');
const CouponCode = require('../models/CouponCode.model');
const CouponRedemption = require('../models/CouponRedemption.model');
const discountEngine = require('./discountEngine');
const logger = require('../config/logger');

class DiscountService {
  /**
   * Create a new coupon
   */
  async createCoupon(couponData, userId) {
    try {
      const coupon = new Coupon(couponData);
      await coupon.save();
      
      // Add audit entry
      await coupon.addAuditEntry('CREATED', userId, couponData, 'Coupon created');
      
      logger.info('Coupon created successfully', { 
        coupon_id: coupon.coupon_id, 
        name: coupon.name,
        type: coupon.type,
        created_by: userId
      });
      
      return coupon;
    } catch (error) {
      logger.error('Error creating coupon:', error);
      throw error;
    }
  }

  /**
   * Update a coupon
   */
  async updateCoupon(couponId, updateData, userId) {
    try {
      const coupon = await Coupon.findOne({ coupon_id: couponId });
      if (!coupon) {
        throw new Error('Coupon not found');
      }

      const oldData = coupon.toObject();
      Object.assign(coupon, updateData);
      await coupon.save();
      
      // Add audit entry
      await coupon.addAuditEntry('UPDATED', userId, { old: oldData, new: updateData }, 'Coupon updated');
      
      logger.info('Coupon updated successfully', { 
        coupon_id: coupon.coupon_id,
        updated_by: userId
      });
      
      return coupon;
    } catch (error) {
      logger.error('Error updating coupon:', error);
      throw error;
    }
  }

  /**
   * Activate a coupon
   */
  async activateCoupon(couponId, userId) {
    try {
      const coupon = await Coupon.findOne({ coupon_id: couponId });
      if (!coupon) {
        throw new Error('Coupon not found');
      }

      coupon.status = 'ACTIVE';
      await coupon.save();
      
      await coupon.addAuditEntry('ACTIVATED', userId, {}, 'Coupon activated');
      
      logger.info('Coupon activated', { coupon_id: couponId, activated_by: userId });
      return coupon;
    } catch (error) {
      logger.error('Error activating coupon:', error);
      throw error;
    }
  }

  /**
   * Pause a coupon
   */
  async pauseCoupon(couponId, userId, reason) {
    try {
      const coupon = await Coupon.findOne({ coupon_id: couponId });
      if (!coupon) {
        throw new Error('Coupon not found');
      }

      coupon.status = 'PAUSED';
      await coupon.save();
      
      await coupon.addAuditEntry('PAUSED', userId, { reason }, 'Coupon paused');
      
      logger.info('Coupon paused', { coupon_id: couponId, paused_by: userId, reason });
      return coupon;
    } catch (error) {
      logger.error('Error pausing coupon:', error);
      throw error;
    }
  }

  /**
   * Archive a coupon
   */
  async archiveCoupon(couponId, userId, reason) {
    try {
      const coupon = await Coupon.findOne({ coupon_id: couponId });
      if (!coupon) {
        throw new Error('Coupon not found');
      }

      coupon.status = 'ARCHIVED';
      await coupon.save();
      
      await coupon.addAuditEntry('ARCHIVED', userId, { reason }, 'Coupon archived');
      
      logger.info('Coupon archived', { coupon_id: couponId, archived_by: userId, reason });
      return coupon;
    } catch (error) {
      logger.error('Error archiving coupon:', error);
      throw error;
    }
  }

  /**
   * Generate bulk coupon codes
   */
  async generateBulkCodes(couponId, count, options = {}, userId) {
    try {
      const coupon = await Coupon.findOne({ coupon_id: couponId });
      if (!coupon) {
        throw new Error('Coupon not found');
      }

      const { prefix = '', length = 8, distribution = 'BULK', batchId } = options;
      const codes = CouponCode.generateBulkCodes(couponId, count, {
        prefix,
        length,
        distribution,
        batchId: batchId || `BATCH-${Date.now()}`
      });

      // Insert codes in batches
      const batchSize = 100;
      for (let i = 0; i < codes.length; i += batchSize) {
        const batch = codes.slice(i, i + batchSize);
        await CouponCode.insertMany(batch);
      }

      logger.info('Bulk codes generated', { 
        coupon_id: couponId, 
        count, 
        batch_id: codes[0]?.batch_id,
        generated_by: userId
      });

      return {
        success: true,
        count: codes.length,
        batch_id: codes[0]?.batch_id,
        codes: codes.map(c => c.code)
      };
    } catch (error) {
      logger.error('Error generating bulk codes:', error);
      throw error;
    }
  }

  /**
   * Assign unique codes to customers
   */
  async assignCodesToCustomers(couponId, customerIds, userId) {
    try {
      const coupon = await Coupon.findOne({ coupon_id: couponId });
      if (!coupon) {
        throw new Error('Coupon not found');
      }

      const assignedCodes = [];
      
      for (const customerId of customerIds) {
        const code = CouponCode.generateCode(8, 'U');
        const couponCode = new CouponCode({
          code_id: `CODE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          coupon_id: couponId,
          code,
          distribution: 'UNIQUE',
          assigned_to_customer_id: customerId,
          status: 'ISSUED',
          metadata: {
            created_by: userId,
            distribution_channel: 'MANUAL_ASSIGNMENT'
          }
        });

        await couponCode.save();
        assignedCodes.push({
          code_id: couponCode.code_id,
          code: couponCode.code,
          customer_id: customerId
        });
      }

      logger.info('Codes assigned to customers', { 
        coupon_id: couponId, 
        customer_count: customerIds.length,
        assigned_by: userId
      });

      return {
        success: true,
        assigned_codes: assignedCodes
      };
    } catch (error) {
      logger.error('Error assigning codes to customers:', error);
      throw error;
    }
  }

  /**
   * Get coupon analytics
   */
  async getCouponAnalytics(couponId, dateRange = {}) {
    try {
      const coupon = await Coupon.findOne({ coupon_id: couponId });
      if (!coupon) {
        throw new Error('Coupon not found');
      }

      const filters = { coupon_id: couponId };
      if (dateRange.start) filters.created_at = { $gte: dateRange.start };
      if (dateRange.end) filters.created_at = { ...filters.created_at, $lte: dateRange.end };

      const stats = await CouponRedemption.getRedemptionStats(filters);
      const redemptions = await CouponRedemption.getRedemptionsByCoupon(couponId, dateRange);

      // Calculate additional metrics
      const totalCodes = await CouponCode.countDocuments({ coupon_id: couponId });
      const activeCodes = await CouponCode.countDocuments({ 
        coupon_id: couponId, 
        status: 'ISSUED' 
      });
      const redeemedCodes = await CouponCode.countDocuments({ 
        coupon_id: couponId, 
        status: 'REDEEMED' 
      });

      const analytics = {
        coupon_info: {
          coupon_id: coupon.coupon_id,
          name: coupon.name,
          type: coupon.type,
          status: coupon.status,
          validity: coupon.validity
        },
        code_stats: {
          total_codes: totalCodes,
          active_codes: activeCodes,
          redeemed_codes: redeemedCodes,
          redemption_rate: totalCodes > 0 ? (redeemedCodes / totalCodes * 100).toFixed(2) : 0
        },
        redemption_stats: stats[0] || {
          total_redemptions: 0,
          total_discount_amount: 0,
          total_pre_discount_amount: 0,
          avg_discount_percentage: 0
        },
        recent_redemptions: redemptions.slice(0, 10)
      };

      return analytics;
    } catch (error) {
      logger.error('Error getting coupon analytics:', error);
      throw error;
    }
  }

  /**
   * Get all coupons with filters
   */
  async getCoupons(filters = {}) {
    try {
      const query = {};
      
      if (filters.status) query.status = filters.status;
      if (filters.type) query.type = filters.type;
      if (filters.campaign) query['metadata.campaign'] = new RegExp(filters.campaign, 'i');
      if (filters.created_by) query['metadata.created_by'] = filters.created_by;

      const coupons = await Coupon.find(query)
        .sort({ created_at: -1 })
        .limit(filters.limit || 50)
        .skip(filters.skip || 0);

      return coupons;
    } catch (error) {
      logger.error('Error getting coupons:', error);
      throw error;
    }
  }

  /**
   * Get coupon codes
   */
  async getCouponCodes(couponId, filters = {}) {
    try {
      const query = { coupon_id: couponId };
      
      if (filters.status) query.status = filters.status;
      if (filters.distribution) query.distribution = filters.distribution;
      if (filters.batch_id) query.batch_id = filters.batch_id;

      const codes = await CouponCode.find(query)
        .sort({ created_at: -1 })
        .limit(filters.limit || 100)
        .skip(filters.skip || 0);

      return codes;
    } catch (error) {
      logger.error('Error getting coupon codes:', error);
      throw error;
    }
  }

  /**
   * Revoke coupon codes
   */
  async revokeCodes(couponId, codeIds, userId, reason) {
    try {
      const updateResult = await CouponCode.updateMany(
        { 
          coupon_id: couponId, 
          code_id: { $in: codeIds },
          status: 'ISSUED'
        },
        { 
          $set: { status: 'REVOKED' },
          $push: { 
            audit: {
              action: 'REVOKED',
              user_id: userId,
              timestamp: new Date(),
              details: { reason }
            }
          }
        }
      );

      logger.info('Codes revoked', { 
        coupon_id: couponId, 
        revoked_count: updateResult.modifiedCount,
        revoked_by: userId,
        reason
      });

      return {
        success: true,
        revoked_count: updateResult.modifiedCount
      };
    } catch (error) {
      logger.error('Error revoking codes:', error);
      throw error;
    }
  }

  /**
   * Send coupon codes via distribution channels
   */
  async sendCouponCodes(couponId, distributionData, userId) {
    try {
      const { channel, segment_query, template_id, codes } = distributionData;
      
      // This would integrate with your messaging service
      // For now, we'll just log the distribution request
      
      logger.info('Coupon codes distribution requested', {
        coupon_id: couponId,
        channel,
        segment_query,
        template_id,
        codes_count: codes?.length || 0,
        requested_by: userId
      });

      // TODO: Implement actual distribution logic
      // - SMS/WhatsApp/Email integration
      // - Segment targeting
      // - Template rendering
      // - Delivery tracking

      return {
        success: true,
        message: 'Distribution request queued',
        distribution_id: `DIST-${Date.now()}`
      };
    } catch (error) {
      logger.error('Error sending coupon codes:', error);
      throw error;
    }
  }

  /**
   * Get customer redemption history
   */
  async getCustomerRedemptions(customerId, limit = 10) {
    try {
      const redemptions = await CouponRedemption.getCustomerRedemptions(customerId, limit);
      return redemptions;
    } catch (error) {
      logger.error('Error getting customer redemptions:', error);
      throw error;
    }
  }

  /**
   * Get store redemption analytics
   */
  async getStoreRedemptions(storeId, dateRange = {}) {
    try {
      const redemptions = await CouponRedemption.getStoreRedemptions(storeId, dateRange);
      return redemptions;
    } catch (error) {
      logger.error('Error getting store redemptions:', error);
      throw error;
    }
  }

  /**
   * Cancel a redemption
   */
  async cancelRedemption(orderId, userId, reason) {
    try {
      const result = await discountEngine.cancelRedemption(orderId, userId, reason);
      logger.info('Redemption cancelled', { order_id: orderId, cancelled_by: userId, reason });
      return result;
    } catch (error) {
      logger.error('Error cancelling redemption:', error);
      throw error;
    }
  }

  /**
   * Refund a redemption
   */
  async refundRedemption(orderId, refundId, refundAmount, reason, userId) {
    try {
      const result = await discountEngine.refundRedemption(orderId, refundId, refundAmount, reason, userId);
      logger.info('Redemption refunded', { 
        order_id: orderId, 
        refund_id: refundId, 
        refund_amount: refundAmount,
        refunded_by: userId, 
        reason 
      });
      return result;
    } catch (error) {
      logger.error('Error refunding redemption:', error);
      throw error;
    }
  }
}

module.exports = new DiscountService();

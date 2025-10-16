const discountService = require('../services/discountService');
const discountEngine = require('../services/discountEngine');
const logger = require('../config/logger');

class DiscountController {
  /**
   * Create a new coupon
   */
  async createCoupon(req, res) {
    try {
      const couponData = req.body;
      const userId = req.user.id;

      // Generate coupon ID if not provided
      if (!couponData.coupon_id) {
        couponData.coupon_id = `CPN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      }

      const coupon = await discountService.createCoupon(couponData, userId);
      
      res.status(201).json({
        success: true,
        message: 'Coupon created successfully',
        data: coupon
      });
    } catch (error) {
      logger.error('Error creating coupon:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create coupon',
        error: error.message
      });
    }
  }

  /**
   * Update a coupon
   */
  async updateCoupon(req, res) {
    try {
      const { coupon_id } = req.params;
      const updateData = req.body;
      const userId = req.user.id;

      const coupon = await discountService.updateCoupon(coupon_id, updateData, userId);
      
      res.json({
        success: true,
        message: 'Coupon updated successfully',
        data: coupon
      });
    } catch (error) {
      logger.error('Error updating coupon:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update coupon',
        error: error.message
      });
    }
  }

  /**
   * Activate a coupon
   */
  async activateCoupon(req, res) {
    try {
      const { coupon_id } = req.params;
      const userId = req.user.id;

      const coupon = await discountService.activateCoupon(coupon_id, userId);
      
      res.json({
        success: true,
        message: 'Coupon activated successfully',
        data: coupon
      });
    } catch (error) {
      logger.error('Error activating coupon:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to activate coupon',
        error: error.message
      });
    }
  }

  /**
   * Pause a coupon
   */
  async pauseCoupon(req, res) {
    try {
      const { coupon_id } = req.params;
      const { reason } = req.body;
      const userId = req.user.id;

      const coupon = await discountService.pauseCoupon(coupon_id, userId, reason);
      
      res.json({
        success: true,
        message: 'Coupon paused successfully',
        data: coupon
      });
    } catch (error) {
      logger.error('Error pausing coupon:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to pause coupon',
        error: error.message
      });
    }
  }

  /**
   * Archive a coupon
   */
  async archiveCoupon(req, res) {
    try {
      const { coupon_id } = req.params;
      const { reason } = req.body;
      const userId = req.user.id;

      const coupon = await discountService.archiveCoupon(coupon_id, userId, reason);
      
      res.json({
        success: true,
        message: 'Coupon archived successfully',
        data: coupon
      });
    } catch (error) {
      logger.error('Error archiving coupon:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to archive coupon',
        error: error.message
      });
    }
  }

  /**
   * Get all coupons
   */
  async getCoupons(req, res) {
    try {
      const filters = req.query;
      const coupons = await discountService.getCoupons(filters);
      
      res.json({
        success: true,
        data: coupons,
        count: coupons.length
      });
    } catch (error) {
      logger.error('Error getting coupons:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to get coupons',
        error: error.message
      });
    }
  }

  /**
   * Get coupon by ID
   */
  async getCouponById(req, res) {
    try {
      const { coupon_id } = req.params;
      const Coupon = require('../models/Coupon.model');
      
      const coupon = await Coupon.findOne({ coupon_id });
      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found'
        });
      }
      
      res.json({
        success: true,
        data: coupon
      });
    } catch (error) {
      logger.error('Error getting coupon:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to get coupon',
        error: error.message
      });
    }
  }

  /**
   * Generate bulk coupon codes
   */
  async generateBulkCodes(req, res) {
    try {
      const { coupon_id } = req.params;
      const { count, prefix, length, distribution, batch_id } = req.body;
      const userId = req.user.id;

      const result = await discountService.generateBulkCodes(
        coupon_id, 
        count, 
        { prefix, length, distribution, batchId: batch_id }, 
        userId
      );
      
      res.json({
        success: true,
        message: 'Bulk codes generated successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error generating bulk codes:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to generate bulk codes',
        error: error.message
      });
    }
  }

  /**
   * Assign codes to customers
   */
  async assignCodesToCustomers(req, res) {
    try {
      const { coupon_id } = req.params;
      const { customer_ids } = req.body;
      const userId = req.user.id;

      const result = await discountService.assignCodesToCustomers(
        coupon_id, 
        customer_ids, 
        userId
      );
      
      res.json({
        success: true,
        message: 'Codes assigned to customers successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error assigning codes to customers:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to assign codes to customers',
        error: error.message
      });
    }
  }

  /**
   * Get coupon codes
   */
  async getCouponCodes(req, res) {
    try {
      const { coupon_id } = req.params;
      const filters = req.query;

      const codes = await discountService.getCouponCodes(coupon_id, filters);
      
      res.json({
        success: true,
        data: codes,
        count: codes.length
      });
    } catch (error) {
      logger.error('Error getting coupon codes:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to get coupon codes',
        error: error.message
      });
    }
  }

  /**
   * Revoke coupon codes
   */
  async revokeCodes(req, res) {
    try {
      const { coupon_id } = req.params;
      const { code_ids, reason } = req.body;
      const userId = req.user.id;

      const result = await discountService.revokeCodes(coupon_id, code_ids, userId, reason);
      
      res.json({
        success: true,
        message: 'Codes revoked successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error revoking codes:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to revoke codes',
        error: error.message
      });
    }
  }

  /**
   * Send coupon codes
   */
  async sendCouponCodes(req, res) {
    try {
      const { coupon_id } = req.params;
      const distributionData = req.body;
      const userId = req.user.id;

      const result = await discountService.sendCouponCodes(
        coupon_id, 
        distributionData, 
        userId
      );
      
      res.json({
        success: true,
        message: 'Coupon codes distribution initiated',
        data: result
      });
    } catch (error) {
      logger.error('Error sending coupon codes:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to send coupon codes',
        error: error.message
      });
    }
  }

  /**
   * Get coupon analytics
   */
  async getCouponAnalytics(req, res) {
    try {
      const { coupon_id } = req.params;
      const { from, to } = req.query;
      
      const dateRange = {};
      if (from) dateRange.start = new Date(from);
      if (to) dateRange.end = new Date(to);

      const analytics = await discountService.getCouponAnalytics(coupon_id, dateRange);
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Error getting coupon analytics:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to get coupon analytics',
        error: error.message
      });
    }
  }

  /**
   * Validate coupon code
   */
  async validateCoupon(req, res) {
    try {
      const validationRequest = req.body;
      
      const result = await discountEngine.validateCoupon(validationRequest);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error validating coupon:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to validate coupon',
        error: error.message
      });
    }
  }

  /**
   * Apply coupon code
   */
  async applyCoupon(req, res) {
    try {
      const applicationRequest = req.body;
      
      const result = await discountEngine.applyCoupon(applicationRequest);
      
      res.json({
        success: true,
        message: 'Coupon applied successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error applying coupon:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to apply coupon',
        error: error.message
      });
    }
  }

  /**
   * Cancel coupon redemption
   */
  async cancelRedemption(req, res) {
    try {
      const { order_id } = req.params;
      const { reason } = req.body;
      const userId = req.user.id;

      const result = await discountService.cancelRedemption(order_id, userId, reason);
      
      res.json({
        success: true,
        message: 'Redemption cancelled successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error cancelling redemption:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to cancel redemption',
        error: error.message
      });
    }
  }

  /**
   * Refund coupon redemption
   */
  async refundRedemption(req, res) {
    try {
      const { order_id } = req.params;
      const { refund_id, refund_amount, reason } = req.body;
      const userId = req.user.id;

      const result = await discountService.refundRedemption(
        order_id, 
        refund_id, 
        refund_amount, 
        reason, 
        userId
      );
      
      res.json({
        success: true,
        message: 'Redemption refunded successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error refunding redemption:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to refund redemption',
        error: error.message
      });
    }
  }

  /**
   * Get customer redemptions
   */
  async getCustomerRedemptions(req, res) {
    try {
      const { customer_id } = req.params;
      const { limit = 10 } = req.query;

      const redemptions = await discountService.getCustomerRedemptions(
        customer_id, 
        parseInt(limit)
      );
      
      res.json({
        success: true,
        data: redemptions,
        count: redemptions.length
      });
    } catch (error) {
      logger.error('Error getting customer redemptions:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to get customer redemptions',
        error: error.message
      });
    }
  }

  /**
   * Get store redemptions
   */
  async getStoreRedemptions(req, res) {
    try {
      const { store_id } = req.params;
      const { from, to } = req.query;
      
      const dateRange = {};
      if (from) dateRange.start = new Date(from);
      if (to) dateRange.end = new Date(to);

      const redemptions = await discountService.getStoreRedemptions(store_id, dateRange);
      
      res.json({
        success: true,
        data: redemptions,
        count: redemptions.length
      });
    } catch (error) {
      logger.error('Error getting store redemptions:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to get store redemptions',
        error: error.message
      });
    }
  }
}

module.exports = new DiscountController();

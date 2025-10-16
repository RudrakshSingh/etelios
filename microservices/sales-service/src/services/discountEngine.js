const Coupon = require('../models/Coupon.model');
const CouponCode = require('../models/CouponCode.model');
const CouponRedemption = require('../models/CouponRedemption.model');
const logger = require('../config/logger');

class DiscountEngine {
  constructor() {
    this.calculationCache = new Map();
    this.validationCache = new Map();
  }

  /**
   * Validate a coupon code against cart and context
   */
  async validateCoupon(validationRequest) {
    const {
      code,
      customer_id,
      store_id,
      channel,
      cart,
      context = {}
    } = validationRequest;

    try {
      // Find the coupon code
      const couponCode = await CouponCode.findOne({ 
        code: code.toUpperCase(), 
        status: 'ISSUED' 
      }).populate('coupon_id');

      if (!couponCode) {
        return {
          valid: false,
          reason: 'INVALID_CODE',
          computed_discount: 0,
          affected_items: [],
          warnings: [],
          stackability: { with_loyalty: false, with_wallet: false }
        };
      }

      const coupon = await Coupon.findById(couponCode.coupon_id);
      if (!coupon) {
        return {
          valid: false,
          reason: 'COUPON_NOT_FOUND',
          computed_discount: 0,
          affected_items: [],
          warnings: [],
          stackability: { with_loyalty: false, with_wallet: false }
        };
      }

      // Check if coupon is active
      if (!coupon.is_active) {
        return {
          valid: false,
          reason: 'COUPON_INACTIVE',
          computed_discount: 0,
          affected_items: [],
          warnings: [],
          stackability: { with_loyalty: false, with_wallet: false }
        };
      }

      // Check time validity
      if (!coupon.isValidForTime()) {
        return {
          valid: false,
          reason: 'COUPON_EXPIRED',
          computed_discount: 0,
          affected_items: [],
          warnings: [],
          stackability: { with_loyalty: false, with_wallet: false }
        };
      }

      // Check channel validity
      if (!coupon.isValidForChannel(channel)) {
        return {
          valid: false,
          reason: 'INVALID_CHANNEL',
          computed_discount: 0,
          affected_items: [],
          warnings: [],
          stackability: { with_loyalty: false, with_wallet: false }
        };
      }

      // Check store validity
      if (!coupon.isValidForStore(store_id)) {
        return {
          valid: false,
          reason: 'INVALID_STORE',
          computed_discount: 0,
          affected_items: [],
          warnings: [],
          stackability: { with_loyalty: false, with_wallet: false }
        };
      }

      // Check customer eligibility
      const customerEligibility = await this.checkCustomerEligibility(coupon, customer_id, channel);
      if (!customerEligibility.eligible) {
        return {
          valid: false,
          reason: customerEligibility.reason,
          computed_discount: 0,
          affected_items: [],
          warnings: [],
          stackability: { with_loyalty: false, with_wallet: false }
        };
      }

      // Check cart eligibility
      const cartEligibility = this.checkCartEligibility(coupon, cart, context);
      if (!cartEligibility.eligible) {
        return {
          valid: false,
          reason: cartEligibility.reason,
          computed_discount: 0,
          affected_items: [],
          warnings: [],
          stackability: { with_loyalty: false, with_wallet: false }
        };
      }

      // Calculate discount
      const discountCalculation = await this.calculateDiscount(coupon, cart, context);
      
      return {
        valid: true,
        reason: null,
        computed_discount: discountCalculation.total_discount,
        affected_items: discountCalculation.affected_items,
        warnings: discountCalculation.warnings,
        stackability: {
          with_loyalty: coupon.stacking.stack_with_loyalty,
          with_wallet: coupon.stacking.stack_with_wallet
        }
      };

    } catch (error) {
      logger.error('Error validating coupon:', error);
      return {
        valid: false,
        reason: 'VALIDATION_ERROR',
        computed_discount: 0,
        affected_items: [],
        warnings: ['Validation error occurred'],
        stackability: { with_loyalty: false, with_wallet: false }
      };
    }
  }

  /**
   * Apply a coupon code to an order
   */
  async applyCoupon(applicationRequest) {
    const {
      code,
      customer_id,
      store_id,
      channel,
      order_id,
      cart,
      context = {}
    } = applicationRequest;

    try {
      // Validate the coupon first
      const validation = await this.validateCoupon({
        code,
        customer_id,
        store_id,
        channel,
        cart,
        context
      });

      if (!validation.valid) {
        throw new Error(`Coupon validation failed: ${validation.reason}`);
      }

      // Find the coupon code and coupon
      const couponCode = await CouponCode.findOne({ 
        code: code.toUpperCase(), 
        status: 'ISSUED' 
      });
      
      const coupon = await Coupon.findById(couponCode.coupon_id);

      // Create redemption record
      const redemption = new CouponRedemption({
        redemption_id: `RDM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        coupon_id: coupon.coupon_id,
        code_id: couponCode.code_id,
        code: couponCode.code,
        customer_id,
        store_id,
        channel,
        order_id,
        pre_discount_amount: cart.totals.subtotal,
        discount_amount: validation.computed_discount,
        discounted_items: validation.affected_items,
        loyalty_burn_applied: false,
        wallet_applied: false,
        context: {
          ip_address: context.ip_address,
          user_agent: context.user_agent,
          device_id: context.device_id,
          session_id: context.session_id,
          city: context.city,
          state: context.state,
          payment_method: context.payment_method,
          time_of_day: new Date().toTimeString().slice(0, 5)
        }
      });

      await redemption.save();

      // Update coupon code usage
      await couponCode.incrementUsage();

      // Update coupon redemption count
      await this.updateCouponRedemptionCount(coupon.coupon_id);

      return {
        success: true,
        redemption_id: redemption.redemption_id,
        discount_amount: validation.computed_discount,
        affected_items: validation.affected_items,
        stackability: validation.stackability
      };

    } catch (error) {
      logger.error('Error applying coupon:', error);
      throw error;
    }
  }

  /**
   * Check customer eligibility for a coupon
   */
  async checkCustomerEligibility(coupon, customerId, channel) {
    // Check if customer exists (you'll need to implement this based on your Customer model)
    // For now, we'll assume customer exists
    
    // Check first order only
    if (coupon.target.first_order_only) {
      const existingOrders = await CouponRedemption.countDocuments({
        customer_id,
        status: { $in: ['ACTIVE', 'REFUNDED'] }
      });
      
      if (existingOrders > 0) {
        return { eligible: false, reason: 'NOT_FIRST_ORDER' };
      }
    }

    // Check per-customer limits
    if (coupon.limits.per_customer_limit_total > 0) {
      const totalRedemptions = await CouponRedemption.countDocuments({
        customer_id,
        coupon_id: coupon.coupon_id,
        status: { $in: ['ACTIVE', 'REFUNDED'] }
      });
      
      if (totalRedemptions >= coupon.limits.per_customer_limit_total) {
        return { eligible: false, reason: 'CUSTOMER_LIMIT_EXCEEDED' };
      }
    }

    // Check daily limit
    if (coupon.limits.per_customer_limit_daily > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dailyRedemptions = await CouponRedemption.countDocuments({
        customer_id,
        coupon_id: coupon.coupon_id,
        created_at: { $gte: today, $lt: tomorrow },
        status: { $in: ['ACTIVE', 'REFUNDED'] }
      });
      
      if (dailyRedemptions >= coupon.limits.per_customer_limit_daily) {
        return { eligible: false, reason: 'DAILY_LIMIT_EXCEEDED' };
      }
    }

    return { eligible: true };
  }

  /**
   * Check cart eligibility for a coupon
   */
  checkCartEligibility(coupon, cart, context) {
    // Check minimum cart value
    if (coupon.target.min_cart_value > 0 && cart.totals.subtotal < coupon.target.min_cart_value) {
      return { 
        eligible: false, 
        reason: 'MIN_CART_VALUE_NOT_MET',
        required_amount: coupon.target.min_cart_value
      };
    }

    // Check minimum quantity
    if (coupon.target.min_qty > 0) {
      const totalQty = cart.items.reduce((sum, item) => sum + item.qty, 0);
      if (totalQty < coupon.target.min_qty) {
        return { 
          eligible: false, 
          reason: 'MIN_QUANTITY_NOT_MET',
          required_qty: coupon.target.min_qty
        };
      }
    }

    // Check product targeting
    if (coupon.target.products.length > 0) {
      const cartSkus = cart.items.map(item => item.sku);
      const hasTargetProduct = coupon.target.products.some(sku => cartSkus.includes(sku));
      if (!hasTargetProduct) {
        return { eligible: false, reason: 'TARGET_PRODUCT_NOT_IN_CART' };
      }
    }

    // Check category targeting
    if (coupon.target.categories.length > 0) {
      const cartCategories = cart.items.map(item => item.category).filter(Boolean);
      const hasTargetCategory = coupon.target.categories.some(cat => cartCategories.includes(cat));
      if (!hasTargetCategory) {
        return { eligible: false, reason: 'TARGET_CATEGORY_NOT_IN_CART' };
      }
    }

    // Check excluded products
    if (coupon.target.exclude_products.length > 0) {
      const cartSkus = cart.items.map(item => item.sku);
      const hasExcludedProduct = coupon.target.exclude_products.some(sku => cartSkus.includes(sku));
      if (hasExcludedProduct) {
        return { eligible: false, reason: 'EXCLUDED_PRODUCT_IN_CART' };
      }
    }

    // Check payment method
    if (coupon.target.payment_methods.length > 0 && context.payment_method) {
      if (!coupon.target.payment_methods.includes(context.payment_method)) {
        return { eligible: false, reason: 'INVALID_PAYMENT_METHOD' };
      }
    }

    return { eligible: true };
  }

  /**
   * Calculate discount amount based on coupon type
   */
  async calculateDiscount(coupon, cart, context) {
    const affectedItems = [];
    let totalDiscount = 0;
    const warnings = [];

    switch (coupon.type) {
      case 'PERCENT':
        totalDiscount = this.calculatePercentDiscount(coupon, cart, affectedItems);
        break;
      
      case 'AMOUNT':
        totalDiscount = this.calculateAmountDiscount(coupon, cart, affectedItems);
        break;
      
      case 'BOGO_BY_CODE':
        totalDiscount = this.calculateBOGODiscount(coupon, cart, affectedItems);
        break;
      
      case 'YOPO_BY_CODE':
        totalDiscount = this.calculateYOPODiscount(coupon, cart, affectedItems);
        break;
      
      case 'FREE_ITEM':
        totalDiscount = this.calculateFreeItemDiscount(coupon, cart, affectedItems);
        break;
      
      case 'SHIPPING_OFF':
        totalDiscount = this.calculateShippingDiscount(coupon, cart, affectedItems);
        break;
      
      default:
        throw new Error(`Unsupported coupon type: ${coupon.type}`);
    }

    // Apply maximum discount cap
    if (coupon.max_discount_value > 0 && totalDiscount > coupon.max_discount_value) {
      totalDiscount = coupon.max_discount_value;
      warnings.push(`Discount capped at ₹${coupon.max_discount_value}`);
    }

    return {
      total_discount: totalDiscount,
      affected_items: affectedItems,
      warnings
    };
  }

  /**
   * Calculate percentage discount
   */
  calculatePercentDiscount(coupon, cart, affectedItems) {
    let totalDiscount = 0;
    const eligibleItems = this.getEligibleItems(coupon, cart);

    for (const item of eligibleItems) {
      const itemDiscount = (item.price * item.qty * coupon.percent_off) / 100;
      totalDiscount += itemDiscount;
      
      affectedItems.push({
        sku: item.sku,
        qty: item.qty,
        original_price: item.price,
        discounted_price: item.price - (itemDiscount / item.qty),
        discount_applied: itemDiscount,
        category: item.category,
        collection: item.collection
      });
    }

    return totalDiscount;
  }

  /**
   * Calculate fixed amount discount
   */
  calculateAmountDiscount(coupon, cart, affectedItems) {
    const eligibleItems = this.getEligibleItems(coupon, cart);
    const totalEligibleAmount = eligibleItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    let remainingDiscount = Math.min(coupon.amount_off, totalEligibleAmount);
    let totalDiscount = 0;

    for (const item of eligibleItems) {
      if (remainingDiscount <= 0) break;
      
      const itemTotal = item.price * item.qty;
      const itemDiscount = Math.min(remainingDiscount, itemTotal);
      remainingDiscount -= itemDiscount;
      totalDiscount += itemDiscount;
      
      affectedItems.push({
        sku: item.sku,
        qty: item.qty,
        original_price: item.price,
        discounted_price: item.price - (itemDiscount / item.qty),
        discount_applied: itemDiscount,
        category: item.category,
        collection: item.collection
      });
    }

    return totalDiscount;
  }

  /**
   * Calculate BOGO discount
   */
  calculateBOGODiscount(coupon, cart, affectedItems) {
    const eligibleItems = this.getEligibleItems(coupon, cart);
    let totalDiscount = 0;

    for (const item of eligibleItems) {
      const { x, y, reward, value } = coupon.bogo;
      const eligibleQty = Math.floor(item.qty / x) * y;
      
      if (eligibleQty > 0) {
        let itemDiscount = 0;
        
        if (reward === 'FREE') {
          itemDiscount = item.price * eligibleQty;
        } else if (reward === 'PERCENTAGE_OFF') {
          itemDiscount = (item.price * eligibleQty * value) / 100;
        } else if (reward === 'FIXED_PRICE') {
          itemDiscount = (item.price - value) * eligibleQty;
        }
        
        totalDiscount += itemDiscount;
        
        affectedItems.push({
          sku: item.sku,
          qty: eligibleQty,
          original_price: item.price,
          discounted_price: reward === 'FIXED_PRICE' ? value : 0,
          discount_applied: itemDiscount,
          category: item.category,
          collection: item.collection
        });
      }
    }

    return totalDiscount;
  }

  /**
   * Calculate YOPO discount
   */
  calculateYOPODiscount(coupon, cart, affectedItems) {
    const eligibleItems = this.getEligibleItems(coupon, cart);
    let totalDiscount = 0;
    const { group_size, payable } = coupon.yopo;

    // Group items by eligibility
    const groups = [];
    for (let i = 0; i < eligibleItems.length; i += group_size) {
      const group = eligibleItems.slice(i, i + group_size);
      if (group.length === group_size) {
        groups.push(group);
      }
    }

    for (const group of groups) {
      // Sort by price
      group.sort((a, b) => payable === 'HIGHEST' ? b.price - a.price : a.price - b.price);
      
      // Pay for the selected item(s), free for others
      const payableItem = group[0];
      const freeItems = group.slice(1);
      
      for (const freeItem of freeItems) {
        totalDiscount += freeItem.price;
        
        affectedItems.push({
          sku: freeItem.sku,
          qty: 1,
          original_price: freeItem.price,
          discounted_price: 0,
          discount_applied: freeItem.price,
          category: freeItem.category,
          collection: freeItem.collection
        });
      }
    }

    return totalDiscount;
  }

  /**
   * Calculate free item discount
   */
  calculateFreeItemDiscount(coupon, cart, affectedItems) {
    // This would need inventory check
    const freeItemSku = coupon.free_item_sku;
    const freeItemPrice = 0; // This should be fetched from inventory
    
    affectedItems.push({
      sku: freeItemSku,
      qty: 1,
      original_price: freeItemPrice,
      discounted_price: 0,
      discount_applied: freeItemPrice,
      category: 'FREE_ITEM',
      collection: 'PROMOTIONAL'
    });

    return freeItemPrice;
  }

  /**
   * Calculate shipping discount
   */
  calculateShippingDiscount(coupon, cart, affectedItems) {
    const shippingAmount = cart.totals.shipping || 0;
    
    if (coupon.type === 'SHIPPING_OFF') {
      affectedItems.push({
        sku: 'SHIPPING',
        qty: 1,
        original_price: shippingAmount,
        discounted_price: 0,
        discount_applied: shippingAmount,
        category: 'SHIPPING',
        collection: 'LOGISTICS'
      });
      
      return shippingAmount;
    }
    
    return 0;
  }

  /**
   * Get eligible items for discount
   */
  getEligibleItems(coupon, cart) {
    let eligibleItems = cart.items;

    // Filter by products
    if (coupon.target.products.length > 0) {
      eligibleItems = eligibleItems.filter(item => 
        coupon.target.products.includes(item.sku)
      );
    }

    // Filter by categories
    if (coupon.target.categories.length > 0) {
      eligibleItems = eligibleItems.filter(item => 
        coupon.target.categories.includes(item.category)
      );
    }

    // Filter by collections
    if (coupon.target.collections.length > 0) {
      eligibleItems = eligibleItems.filter(item => 
        coupon.target.collections.includes(item.collection)
      );
    }

    // Exclude products
    if (coupon.target.exclude_products.length > 0) {
      eligibleItems = eligibleItems.filter(item => 
        !coupon.target.exclude_products.includes(item.sku)
      );
    }

    return eligibleItems;
  }

  /**
   * Update coupon redemption count
   */
  async updateCouponRedemptionCount(couponId) {
    const coupon = await Coupon.findOne({ coupon_id: couponId });
    if (coupon) {
      const redemptionCount = await CouponRedemption.countDocuments({
        coupon_id: couponId,
        status: { $in: ['ACTIVE', 'REFUNDED'] }
      });
      
      // Update coupon metadata or create analytics record
      // This depends on your analytics implementation
    }
  }

  /**
   * Cancel a coupon redemption
   */
  async cancelRedemption(orderId, userId, reason) {
    const redemption = await CouponRedemption.findOne({ order_id: orderId });
    if (redemption) {
      await redemption.cancel(userId, reason);
      return { success: true };
    }
    throw new Error('Redemption not found');
  }

  /**
   * Refund a coupon redemption
   */
  async refundRedemption(orderId, refundId, refundAmount, reason, userId) {
    const redemption = await CouponRedemption.findOne({ order_id: orderId });
    if (redemption) {
      await redemption.refund(refundId, refundAmount, reason, userId);
      return { success: true };
    }
    throw new Error('Redemption not found');
  }
}

module.exports = new DiscountEngine();

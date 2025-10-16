const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const Joi = require('joi');

// Validation schemas
const createCouponSchema = {
  body: Joi.object({
    coupon_id: Joi.string().optional(),
    name: Joi.string().required().trim(),
    type: Joi.string().valid('PERCENT', 'AMOUNT', 'FREE_ITEM', 'BOGO_BY_CODE', 'YOPO_BY_CODE', 'SHIPPING_OFF').required(),
    percent_off: Joi.number().min(0).max(100).when('type', { is: 'PERCENT', then: Joi.required() }),
    amount_off: Joi.number().min(0).when('type', { is: 'AMOUNT', then: Joi.required() }),
    free_item_sku: Joi.string().when('type', { is: 'FREE_ITEM', then: Joi.required() }),
    bogo: Joi.object({
      x: Joi.number().min(1).required(),
      y: Joi.number().min(1).required(),
      reward: Joi.string().valid('FREE', 'PERCENTAGE_OFF', 'FIXED_PRICE').default('FREE'),
      value: Joi.number().min(0)
    }).when('type', { is: 'BOGO_BY_CODE', then: Joi.required() }),
    yopo: Joi.object({
      group_size: Joi.number().min(2).required(),
      payable: Joi.string().valid('HIGHEST', 'LOWEST').default('HIGHEST')
    }).when('type', { is: 'YOPO_BY_CODE', then: Joi.required() }),
    max_discount_value: Joi.number().min(0).default(0),
    target: Joi.object({
      products: Joi.array().items(Joi.string()),
      categories: Joi.array().items(Joi.string()),
      collections: Joi.array().items(Joi.string()),
      exclude_products: Joi.array().items(Joi.string()),
      customer_segments: Joi.array().items(Joi.string()),
      subscription_plans: Joi.array().items(Joi.string()),
      first_order_only: Joi.boolean().default(false),
      min_cart_value: Joi.number().min(0).default(0),
      min_qty: Joi.number().min(1).default(1),
      payment_methods: Joi.array().items(Joi.string()),
      channels: Joi.array().items(Joi.string().valid('ECOM', 'POS', 'TELE', 'MOBILE')).default(['ECOM', 'POS']),
      stores: Joi.array().items(Joi.string()),
      cities: Joi.array().items(Joi.string()),
      states: Joi.array().items(Joi.string()),
      weekdays: Joi.array().items(Joi.number().min(1).max(7)),
      hours_local: Joi.object({
        start: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        end: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      })
    }).required(),
    stacking: Joi.object({
      is_stackable: Joi.boolean().default(false),
      stack_with_loyalty: Joi.boolean().default(false),
      stack_with_wallet: Joi.boolean().default(true),
      exclude_coupon_ids: Joi.array().items(Joi.string())
    }).default({}),
    limits: Joi.object({
      global_redemption_limit: Joi.number().min(0).default(0),
      per_customer_limit_total: Joi.number().min(0).default(0),
      per_customer_limit_daily: Joi.number().min(0).default(0),
      per_store_daily_cap: Joi.number().min(0).default(0)
    }).default({}),
    validity: Joi.object({
      starts_at: Joi.date().required(),
      ends_at: Joi.date().required()
    }).required(),
    metadata: Joi.object({
      campaign: Joi.string(),
      description: Joi.string(),
      tags: Joi.array().items(Joi.string())
    }).optional()
  })
};

const updateCouponSchema = {
  body: Joi.object({
    name: Joi.string().trim(),
    percent_off: Joi.number().min(0).max(100),
    amount_off: Joi.number().min(0),
    max_discount_value: Joi.number().min(0),
    target: Joi.object({
      products: Joi.array().items(Joi.string()),
      categories: Joi.array().items(Joi.string()),
      collections: Joi.array().items(Joi.string()),
      exclude_products: Joi.array().items(Joi.string()),
      customer_segments: Joi.array().items(Joi.string()),
      subscription_plans: Joi.array().items(Joi.string()),
      first_order_only: Joi.boolean(),
      min_cart_value: Joi.number().min(0),
      min_qty: Joi.number().min(1),
      payment_methods: Joi.array().items(Joi.string()),
      channels: Joi.array().items(Joi.string().valid('ECOM', 'POS', 'TELE', 'MOBILE')),
      stores: Joi.array().items(Joi.string()),
      cities: Joi.array().items(Joi.string()),
      states: Joi.array().items(Joi.string()),
      weekdays: Joi.array().items(Joi.number().min(1).max(7)),
      hours_local: Joi.object({
        start: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        end: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      })
    }),
    stacking: Joi.object({
      is_stackable: Joi.boolean(),
      stack_with_loyalty: Joi.boolean(),
      stack_with_wallet: Joi.boolean(),
      exclude_coupon_ids: Joi.array().items(Joi.string())
    }),
    limits: Joi.object({
      global_redemption_limit: Joi.number().min(0),
      per_customer_limit_total: Joi.number().min(0),
      per_customer_limit_daily: Joi.number().min(0),
      per_store_daily_cap: Joi.number().min(0)
    }),
    validity: Joi.object({
      starts_at: Joi.date(),
      ends_at: Joi.date()
    }),
    metadata: Joi.object({
      campaign: Joi.string(),
      description: Joi.string(),
      tags: Joi.array().items(Joi.string())
    })
  })
};

const generateBulkCodesSchema = {
  body: Joi.object({
    count: Joi.number().min(1).max(10000).required(),
    prefix: Joi.string().max(10).default(''),
    length: Joi.number().min(4).max(20).default(8),
    distribution: Joi.string().valid('GENERIC', 'UNIQUE', 'BULK').default('BULK'),
    batch_id: Joi.string().optional()
  })
};

const assignCodesSchema = {
  body: Joi.object({
    customer_ids: Joi.array().items(Joi.string()).min(1).required()
  })
};

const revokeCodesSchema = {
  body: Joi.object({
    code_ids: Joi.array().items(Joi.string()).min(1).required(),
    reason: Joi.string().required()
  })
};

const validateCouponSchema = {
  body: Joi.object({
    code: Joi.string().required().trim(),
    customer_id: Joi.string().required(),
    store_id: Joi.string().required(),
    channel: Joi.string().valid('ECOM', 'POS', 'TELE', 'MOBILE').required(),
    cart: Joi.object({
      items: Joi.array().items(Joi.object({
        sku: Joi.string().required(),
        qty: Joi.number().min(1).required(),
        price: Joi.number().min(0).required(),
        category: Joi.string(),
        collection: Joi.string()
      })).required(),
      totals: Joi.object({
        subtotal: Joi.number().min(0).required(),
        tax: Joi.number().min(0).default(0),
        shipping: Joi.number().min(0).default(0)
      }).required()
    }).required(),
    context: Joi.object({
      payment_method: Joi.string(),
      time: Joi.date(),
      city: Joi.string(),
      state: Joi.string(),
      ip_address: Joi.string(),
      user_agent: Joi.string(),
      device_id: Joi.string(),
      session_id: Joi.string()
    }).optional()
  })
};

const applyCouponSchema = {
  body: Joi.object({
    code: Joi.string().required().trim(),
    customer_id: Joi.string().required(),
    store_id: Joi.string().required(),
    channel: Joi.string().valid('ECOM', 'POS', 'TELE', 'MOBILE').required(),
    order_id: Joi.string().required(),
    cart: Joi.object({
      items: Joi.array().items(Joi.object({
        sku: Joi.string().required(),
        qty: Joi.number().min(1).required(),
        price: Joi.number().min(0).required(),
        category: Joi.string(),
        collection: Joi.string()
      })).required(),
      totals: Joi.object({
        subtotal: Joi.number().min(0).required(),
        tax: Joi.number().min(0).default(0),
        shipping: Joi.number().min(0).default(0)
      }).required()
    }).required(),
    context: Joi.object({
      payment_method: Joi.string(),
      time: Joi.date(),
      city: Joi.string(),
      state: Joi.string(),
      ip_address: Joi.string(),
      user_agent: Joi.string(),
      device_id: Joi.string(),
      session_id: Joi.string()
    }).optional()
  })
};

// Coupon Management Routes (Admin/Manager only)
router.post('/coupons', 
  requireRole(['admin', 'manager']),
  requirePermission('discount:create'),
  validateRequest(createCouponSchema),
  discountController.createCoupon
);

router.patch('/coupons/:coupon_id', 
  requireRole(['admin', 'manager']),
  requirePermission('discount:update'),
  validateRequest(updateCouponSchema),
  discountController.updateCoupon
);

router.post('/coupons/:coupon_id/activate', 
  requireRole(['admin', 'manager']),
  requirePermission('discount:read'),
  discountController.activateCoupon
);

router.post('/coupons/:coupon_id/pause', 
  requireRole(['admin', 'manager']),
  requirePermission('discount:read'),
  discountController.pauseCoupon
);

router.post('/coupons/:coupon_id/archive', 
  requireRole(['admin', 'manager']),
  requirePermission('discount:read'),
  discountController.archiveCoupon
);

router.get('/coupons', 
  requireRole(['admin', 'manager']),
  requirePermission('discount:read'),
  discountController.getCoupons
);

router.get('/coupons/:coupon_id', 
  requireRole(['admin', 'manager']),
  requirePermission('discount:read'),
  discountController.getCouponById
);

// Coupon Code Management Routes
router.post('/coupons/:coupon_id/codes/bulk', 
  requireRole(['admin', 'manager']),
  requirePermission('discount:read'),
  validateRequest(generateBulkCodesSchema),
  discountController.generateBulkCodes
);

router.post('/coupons/:coupon_id/codes/assign', 
  requireRole(['admin', 'manager']),
  requirePermission('discount:read'),
  validateRequest(assignCodesSchema),
  discountController.assignCodesToCustomers
);

router.get('/coupons/:coupon_id/codes', 
  requireRole(['admin', 'manager']),
  requirePermission('discount:read'),
  discountController.getCouponCodes
);

router.post('/coupons/:coupon_id/codes/revoke', 
  requireRole(['admin', 'manager']),
  requirePermission('discount:read'),
  validateRequest(revokeCodesSchema),
  discountController.revokeCodes
);

// Distribution Routes
router.post('/coupons/:coupon_id/send', 
  requireRole(['admin', 'manager']),
  requirePermission('discount:read'),
  discountController.sendCouponCodes
);

// Analytics Routes
router.get('/coupons/:coupon_id/analytics', 
  requireRole(['admin', 'manager']),
  requirePermission('discount:read'),
  discountController.getCouponAnalytics
);

// Validation and Application Routes (Public for POS/E-com)
router.post('/validate', 
  validateRequest(validateCouponSchema),
  discountController.validateCoupon
);

router.post('/apply', 
  validateRequest(applyCouponSchema),
  discountController.applyCoupon
);

// Redemption Management Routes
router.post('/redemptions/:order_id/cancel', 
  requireRole(['admin', 'manager']),
  requirePermission('discount:read'),
  discountController.cancelRedemption
);

router.post('/redemptions/:order_id/refund', 
  requireRole(['admin', 'manager']),
  requirePermission('discount:read'),
  discountController.refundRedemption
);

// Customer and Store Analytics
router.get('/customers/:customer_id/redemptions', 
  requireRole(['admin', 'manager']),
  requirePermission('discount:read'),
  discountController.getCustomerRedemptions
);

router.get('/stores/:store_id/redemptions', 
  requireRole(['admin', 'manager']),
  requirePermission('discount:read'),
  discountController.getStoreRedemptions
);

module.exports = router;

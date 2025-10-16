const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation middleware
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  
  next();
};

/**
 * Common validation rules
 */
const commonValidations = {
  // ID validation
  mongoId: param('id').isMongoId().withMessage('Invalid ID format'),
  
  // Pagination
  pagination: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('sort').optional().isString().withMessage('Sort must be a string'),
    query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc')
  ],
  
  // Email validation
  email: body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  
  // Phone validation
  phone: body('phone').isMobilePhone('any').withMessage('Valid phone number required'),
  
  // Password validation
  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number and special character'),
  
  // Name validation
  name: body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  
  // Address validation
  address: [
    body('address.street').optional().isString().withMessage('Street must be a string'),
    body('address.city').optional().isString().withMessage('City must be a string'),
    body('address.state').optional().isString().withMessage('State must be a string'),
    body('address.pincode').optional().isPostalCode('IN').withMessage('Valid pincode required'),
    body('address.country').optional().isString().withMessage('Country must be a string')
  ],
  
  // Price validation
  price: body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  
  // Quantity validation
  quantity: body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  
  // Date validation
  date: body('date').isISO8601().withMessage('Valid date required'),
  
  // Status validation
  status: body('status').isIn(['active', 'inactive', 'pending', 'approved', 'rejected']).withMessage('Invalid status')
};

/**
 * Auth validation rules
 */
const authValidations = {
  register: [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('phone').isMobilePhone('any').withMessage('Valid phone number required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number and special character'),
    body('role').optional().isIn(['customer', 'admin', 'store_manager', 'staff']).withMessage('Invalid role')
  ],
  
  login: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required')
  ],
  
  forgotPassword: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required')
  ],
  
  resetPassword: [
    body('token').notEmpty().withMessage('Reset token required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number and special character')
  ]
};

/**
 * Product validation rules
 */
const productValidations = {
  create: [
    body('name').trim().isLength({ min: 2, max: 200 }).withMessage('Product name must be 2-200 characters'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('category').notEmpty().withMessage('Category required'),
    body('brand').optional().isString().withMessage('Brand must be a string'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('mrp').optional().isFloat({ min: 0 }).withMessage('MRP must be a positive number'),
    body('sku').optional().isString().withMessage('SKU must be a string'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('images').optional().isArray().withMessage('Images must be an array'),
    body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
  ],
  
  update: [
    body('name').optional().trim().isLength({ min: 2, max: 200 }).withMessage('Product name must be 2-200 characters'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('category').optional().notEmpty().withMessage('Category cannot be empty'),
    body('brand').optional().isString().withMessage('Brand must be a string'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('mrp').optional().isFloat({ min: 0 }).withMessage('MRP must be a positive number'),
    body('sku').optional().isString().withMessage('SKU must be a string'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('images').optional().isArray().withMessage('Images must be an array'),
    body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
  ]
};

/**
 * Order validation rules
 */
const orderValidations = {
  create: [
    body('items').isArray({ min: 1 }).withMessage('At least one item required'),
    body('items.*.productId').isMongoId().withMessage('Valid product ID required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be positive integer'),
    body('items.*.price').isFloat({ min: 0 }).withMessage('Price must be positive number'),
    body('shippingAddress').isObject().withMessage('Shipping address required'),
    body('shippingAddress.street').notEmpty().withMessage('Street required'),
    body('shippingAddress.city').notEmpty().withMessage('City required'),
    body('shippingAddress.state').notEmpty().withMessage('State required'),
    body('shippingAddress.pincode').isPostalCode('IN').withMessage('Valid pincode required'),
    body('paymentMethod').isIn(['cod', 'online', 'wallet']).withMessage('Invalid payment method')
  ]
};

/**
 * Customer validation rules
 */
const customerValidations = {
  create: [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('phone').isMobilePhone('any').withMessage('Valid phone number required'),
    body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth required'),
    body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Invalid gender')
  ],
  
  update: [
    body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
    body('phone').optional().isMobilePhone('any').withMessage('Valid phone number required'),
    body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth required'),
    body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Invalid gender')
  ]
};

/**
 * Store validation rules
 */
const storeValidations = {
  create: [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Store name must be 2-100 characters'),
    body('address').isObject().withMessage('Address required'),
    body('address.street').notEmpty().withMessage('Street required'),
    body('address.city').notEmpty().withMessage('City required'),
    body('address.state').notEmpty().withMessage('State required'),
    body('address.pincode').isPostalCode('IN').withMessage('Valid pincode required'),
    body('phone').isMobilePhone('any').withMessage('Valid phone number required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required')
  ]
};

/**
 * Page builder validation rules
 */
const pageValidations = {
  create: [
    body('slug').trim().isLength({ min: 2, max: 100 }).withMessage('Slug must be 2-100 characters'),
    body('path').trim().isLength({ min: 1, max: 200 }).withMessage('Path must be 1-200 characters'),
    body('title').trim().isLength({ min: 2, max: 200 }).withMessage('Title must be 2-200 characters'),
    body('type').isIn(['HOME', 'LANDING', 'CMS']).withMessage('Invalid page type'),
    body('seo').optional().isObject().withMessage('SEO must be an object'),
    body('draftJson').optional().isObject().withMessage('Draft JSON must be an object')
  ],
  
  update: [
    body('slug').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Slug must be 2-100 characters'),
    body('path').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Path must be 1-200 characters'),
    body('title').optional().trim().isLength({ min: 2, max: 200 }).withMessage('Title must be 2-200 characters'),
    body('type').optional().isIn(['HOME', 'LANDING', 'CMS']).withMessage('Invalid page type'),
    body('seo').optional().isObject().withMessage('SEO must be an object'),
    body('draftJson').optional().isObject().withMessage('Draft JSON must be an object')
  ]
};

module.exports = {
  validateRequest,
  commonValidations,
  authValidations,
  productValidations,
  orderValidations,
  customerValidations,
  storeValidations,
  pageValidations
};

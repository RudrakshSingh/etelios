const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.middleware');
const {
  registerRealUser,
  getRealUsers,
  getRealUser,
  updateRealUser,
  deactivateRealUser,
  getUserProfile,
  updateUserProfile,
  changePassword
} = require('../controllers/realUserController');

const router = express.Router();

/**
 * @route   POST /api/real-users/register
 * @desc    Register a new real user (HR/Admin only)
 * @access  Private (HR, Admin)
 */
router.post(
  '/register',
  authenticate,
  requireRole(['hr', 'admin']),
  [
    body('employee_id')
      .notEmpty()
      .withMessage('Employee ID is required')
      .isLength({ min: 3, max: 20 })
      .withMessage('Employee ID must be between 3 and 20 characters'),
    body('first_name')
      .notEmpty()
      .withMessage('First name is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters'),
    body('last_name')
      .notEmpty()
      .withMessage('Last name is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters'),
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    body('role')
      .isIn(['admin', 'hr', 'manager', 'employee', 'accounts'])
      .withMessage('Role must be one of: admin, hr, manager, employee, accounts'),
    body('phone')
      .optional()
      .isMobilePhone()
      .withMessage('Valid phone number is required'),
    body('store_id')
      .optional()
      .isMongoId()
      .withMessage('Valid store ID is required'),
    body('department')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Department must be between 2 and 100 characters'),
    body('designation')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Designation must be between 2 and 100 characters'),
    body('reporting_manager_id')
      .optional()
      .isMongoId()
      .withMessage('Valid reporting manager ID is required')
  ],
  validateRequest,
  registerRealUser
);

/**
 * @route   GET /api/real-users
 * @desc    Get all real users with pagination and filtering
 * @access  Private (HR, Admin, Manager)
 */
router.get(
  '/',
  authenticate,
  requireRole(['hr', 'admin', 'manager']),
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('role')
      .optional()
      .isIn(['admin', 'hr', 'manager', 'employee', 'accounts'])
      .withMessage('Invalid role filter'),
    query('store_id')
      .optional()
      .isMongoId()
      .withMessage('Invalid store ID filter'),
    query('department')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Department filter must be between 2 and 100 characters'),
    query('status')
      .optional()
      .isIn(['active', 'inactive', 'pending'])
      .withMessage('Invalid status filter'),
    query('search')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Search term must be between 2 and 100 characters')
  ],
  validateRequest,
  getRealUsers
);

/**
 * @route   GET /api/real-users/:id
 * @desc    Get a specific real user
 * @access  Private (HR, Admin, Manager)
 */
router.get(
  '/:id',
  authenticate,
  requireRole(['hr', 'admin', 'manager']),
  [
    param('id')
      .isMongoId()
      .withMessage('Valid user ID is required')
  ],
  validateRequest,
  getRealUser
);

/**
 * @route   PUT /api/real-users/:id
 * @desc    Update a real user
 * @access  Private (HR, Admin)
 */
router.put(
  '/:id',
  authenticate,
  requireRole(['hr', 'admin']),
  [
    param('id')
      .isMongoId()
      .withMessage('Valid user ID is required'),
    body('first_name')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters'),
    body('last_name')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail(),
    body('phone')
      .optional()
      .isMobilePhone()
      .withMessage('Valid phone number is required'),
    body('role')
      .optional()
      .isIn(['admin', 'hr', 'manager', 'employee', 'accounts'])
      .withMessage('Role must be one of: admin, hr, manager, employee, accounts'),
    body('store_id')
      .optional()
      .isMongoId()
      .withMessage('Valid store ID is required'),
    body('department')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Department must be between 2 and 100 characters'),
    body('designation')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Designation must be between 2 and 100 characters'),
    body('reporting_manager_id')
      .optional()
      .isMongoId()
      .withMessage('Valid reporting manager ID is required'),
    body('status')
      .optional()
      .isIn(['active', 'inactive', 'pending'])
      .withMessage('Status must be one of: active, inactive, pending')
  ],
  validateRequest,
  updateRealUser
);

/**
 * @route   DELETE /api/real-users/:id
 * @desc    Deactivate a real user
 * @access  Private (HR, Admin)
 */
router.delete(
  '/:id',
  authenticate,
  requireRole(['hr', 'admin']),
  [
    param('id')
      .isMongoId()
      .withMessage('Valid user ID is required'),
    body('reason')
      .optional()
      .isLength({ min: 5, max: 500 })
      .withMessage('Reason must be between 5 and 500 characters')
  ],
  validateRequest,
  deactivateRealUser
);

/**
 * @route   GET /api/real-users/profile/me
 * @desc    Get current user's profile
 * @access  Private (All authenticated users)
 */
router.get(
  '/profile/me',
  authenticate,
  getUserProfile
);

/**
 * @route   PUT /api/real-users/profile/me
 * @desc    Update current user's profile
 * @access  Private (All authenticated users)
 */
router.put(
  '/profile/me',
  authenticate,
  [
    body('first_name')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters'),
    body('last_name')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters'),
    body('phone')
      .optional()
      .isMobilePhone()
      .withMessage('Valid phone number is required'),
    body('department')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Department must be between 2 and 100 characters'),
    body('designation')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Designation must be between 2 and 100 characters')
  ],
  validateRequest,
  updateUserProfile
);

/**
 * @route   PUT /api/real-users/profile/change-password
 * @desc    Change current user's password
 * @access  Private (All authenticated users)
 */
router.put(
  '/profile/change-password',
  authenticate,
  [
    body('current_password')
      .notEmpty()
      .withMessage('Current password is required'),
    body('new_password')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
  ],
  validateRequest,
  changePassword
);

module.exports = router;

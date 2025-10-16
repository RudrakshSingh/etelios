const express = require('express');
const { body } = require('express-validator');
const AuthController = require('../controllers/authController');

const router = express.Router();
const authController = new AuthController('auth-service');

// Validation middleware
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('phone').isMobilePhone(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('first_name').notEmpty().trim(),
  body('last_name').notEmpty().trim(),
  body('tenant_id').notEmpty(),
  body('org_id').notEmpty()
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  body('tenant_id').notEmpty()
];

const changePasswordValidation = [
  body('current_password').notEmpty(),
  body('new_password').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
];

// Routes
router.post('/register', registerValidation, authController.register.bind(authController));
router.post('/login', loginValidation, authController.login.bind(authController));
router.post('/refresh', authController.refreshToken.bind(authController));
router.post('/logout', authController.logout.bind(authController));

// Protected routes (require authentication middleware)
router.get('/profile', authController.getProfile.bind(authController));
router.put('/profile', authController.updateProfile.bind(authController));
router.put('/change-password', changePasswordValidation, authController.changePassword.bind(authController));

module.exports = router;
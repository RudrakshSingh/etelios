const User = require('../models/User.model');
const jwt = require('jsonwebtoken');
const { sendSuccessResponse, sendErrorResponse, sendValidationError } = require('../middleware/error.middleware');
const { businessLogger, securityLogger } = require('../middleware/logger.middleware');
const NotificationService = require('../services/notification.service');

class AuthController {
  /**
   * Register a new user
   */
  async register(req, res) {
    try {
      const { name, email, phone, password, role = 'customer' } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { phone }]
      });

      if (existingUser) {
        return sendErrorResponse(res, 'User with this email or phone already exists', 409);
      }

      // Create new user
      const user = new User({
        name,
        email,
        phone,
        password,
        role
      });

      // Generate email verification token
      const emailToken = user.generateEmailVerificationToken();
      await user.save();

      // Send verification email
      try {
        await NotificationService.sendEmailVerification(user.email, emailToken);
      } catch (emailError) {
        console.error('Email verification failed:', emailError);
      }

      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      businessLogger('user_registered', {
        userId: user._id,
        email: user.email,
        role: user.role
      });

      sendSuccessResponse(res, 'User registered successfully', {
        user: user.getPublicProfile(),
        accessToken,
        refreshToken
      }, 201);
    } catch (error) {
      console.error('Registration error:', error);
      sendErrorResponse(res, 'Registration failed', 500);
    }
  }

  /**
   * Login user
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        securityLogger('login_failed', { email, reason: 'user_not_found' });
        return sendErrorResponse(res, 'Invalid credentials', 401);
      }

      // Check if account is locked
      if (user.isLocked) {
        securityLogger('login_failed', { email, reason: 'account_locked' });
        return sendErrorResponse(res, 'Account is locked due to too many failed attempts', 423);
      }

      // Check if account is active
      if (!user.isActive) {
        securityLogger('login_failed', { email, reason: 'account_inactive' });
        return sendErrorResponse(res, 'Account is deactivated', 401);
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        await user.incLoginAttempts();
        securityLogger('login_failed', { email, reason: 'invalid_password' });
        return sendErrorResponse(res, 'Invalid credentials', 401);
      }

      // Reset login attempts on successful login
      if (user.loginAttempts > 0) {
        await user.resetLoginAttempts();
      }

      // Update last login
      user.lastLoginAt = new Date();
      await user.save();

      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      businessLogger('user_login', {
        userId: user._id,
        email: user.email,
        role: user.role
      });

      sendSuccessResponse(res, 'Login successful', {
        user: user.getPublicProfile(),
        accessToken,
        refreshToken
      });
    } catch (error) {
      console.error('Login error:', error);
      sendErrorResponse(res, 'Login failed', 500);
    }
  }

  /**
   * Logout user
   */
  async logout(req, res) {
    try {
      // In a real application, you might want to blacklist the token
      // For now, we'll just return success
      
      businessLogger('user_logout', {
        userId: req.userId,
        email: req.user.email
      });

      sendSuccessResponse(res, 'Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
      sendErrorResponse(res, 'Logout failed', 500);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return sendErrorResponse(res, 'Refresh token required', 400);
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret');
      
      // Find user
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        return sendErrorResponse(res, 'Invalid refresh token', 401);
      }

      // Generate new tokens
      const newAccessToken = this.generateAccessToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      sendSuccessResponse(res, 'Token refreshed successfully', {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      sendErrorResponse(res, 'Invalid refresh token', 401);
    }
  }

  /**
   * Forgot password
   */
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        // Don't reveal if user exists or not
        return sendSuccessResponse(res, 'If the email exists, a password reset link has been sent');
      }

      // Generate reset token
      const resetToken = user.generatePasswordResetToken();
      await user.save();

      // Send reset email
      try {
        await NotificationService.sendPasswordReset(user.email, resetToken);
      } catch (emailError) {
        console.error('Password reset email failed:', emailError);
      }

      sendSuccessResponse(res, 'If the email exists, a password reset link has been sent');
    } catch (error) {
      console.error('Forgot password error:', error);
      sendErrorResponse(res, 'Password reset request failed', 500);
    }
  }

  /**
   * Reset password
   */
  async resetPassword(req, res) {
    try {
      const { token, password } = req.body;

      // Find user with valid reset token
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
      });

      if (!user) {
        return sendErrorResponse(res, 'Invalid or expired reset token', 400);
      }

      // Update password
      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      businessLogger('password_reset', {
        userId: user._id,
        email: user.email
      });

      sendSuccessResponse(res, 'Password reset successfully');
    } catch (error) {
      console.error('Reset password error:', error);
      sendErrorResponse(res, 'Password reset failed', 500);
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(req, res) {
    try {
      const { token } = req.body;

      const user = await User.findOne({
        emailVerificationToken: token
      });

      if (!user) {
        return sendErrorResponse(res, 'Invalid verification token', 400);
      }

      user.isEmailVerified = true;
      user.emailVerificationToken = undefined;
      await user.save();

      businessLogger('email_verified', {
        userId: user._id,
        email: user.email
      });

      sendSuccessResponse(res, 'Email verified successfully');
    } catch (error) {
      console.error('Email verification error:', error);
      sendErrorResponse(res, 'Email verification failed', 500);
    }
  }

  /**
   * Verify phone
   */
  async verifyPhone(req, res) {
    try {
      const { phone, code } = req.body;

      const user = await User.findOne({
        phone,
        phoneVerificationCode: code,
        phoneVerificationExpires: { $gt: Date.now() }
      });

      if (!user) {
        return sendErrorResponse(res, 'Invalid verification code', 400);
      }

      user.isPhoneVerified = true;
      user.phoneVerificationCode = undefined;
      user.phoneVerificationExpires = undefined;
      await user.save();

      businessLogger('phone_verified', {
        userId: user._id,
        phone: user.phone
      });

      sendSuccessResponse(res, 'Phone verified successfully');
    } catch (error) {
      console.error('Phone verification error:', error);
      sendErrorResponse(res, 'Phone verification failed', 500);
    }
  }

  /**
   * Resend verification
   */
  async resendVerification(req, res) {
    try {
      const { type, value } = req.body;

      let user;
      if (type === 'email') {
        user = await User.findOne({ email: value });
      } else if (type === 'phone') {
        user = await User.findOne({ phone: value });
      } else {
        return sendErrorResponse(res, 'Invalid verification type', 400);
      }

      if (!user) {
        return sendErrorResponse(res, 'User not found', 404);
      }

      if (type === 'email' && user.isEmailVerified) {
        return sendErrorResponse(res, 'Email already verified', 400);
      }

      if (type === 'phone' && user.isPhoneVerified) {
        return sendErrorResponse(res, 'Phone already verified', 400);
      }

      // Generate and send verification
      if (type === 'email') {
        const emailToken = user.generateEmailVerificationToken();
        await user.save();
        
        try {
          await NotificationService.sendEmailVerification(user.email, emailToken);
        } catch (emailError) {
          console.error('Email verification failed:', emailError);
        }
      } else if (type === 'phone') {
        const phoneCode = user.generatePhoneVerificationCode();
        await user.save();
        
        try {
          await NotificationService.sendSMSVerification(user.phone, phoneCode);
        } catch (smsError) {
          console.error('SMS verification failed:', smsError);
        }
      }

      sendSuccessResponse(res, 'Verification code sent');
    } catch (error) {
      console.error('Resend verification error:', error);
      sendErrorResponse(res, 'Failed to send verification', 500);
    }
  }

  /**
   * Get user profile
   */
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        return sendErrorResponse(res, 'User not found', 404);
      }

      sendSuccessResponse(res, 'Profile retrieved successfully', {
        user: user.getPublicProfile()
      });
    } catch (error) {
      console.error('Get profile error:', error);
      sendErrorResponse(res, 'Failed to get profile', 500);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req, res) {
    try {
      const { name, phone, profile } = req.body;
      const user = await User.findById(req.userId);

      if (!user) {
        return sendErrorResponse(res, 'User not found', 404);
      }

      // Update fields
      if (name) user.name = name;
      if (phone) user.phone = phone;
      if (profile) {
        user.profile = { ...user.profile, ...profile };
      }

      user.updatedAt = new Date();
      await user.save();

      businessLogger('profile_updated', {
        userId: user._id,
        email: user.email
      });

      sendSuccessResponse(res, 'Profile updated successfully', {
        user: user.getPublicProfile()
      });
    } catch (error) {
      console.error('Update profile error:', error);
      sendErrorResponse(res, 'Failed to update profile', 500);
    }
  }

  /**
   * Change password
   */
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.userId);

      if (!user) {
        return sendErrorResponse(res, 'User not found', 404);
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return sendErrorResponse(res, 'Current password is incorrect', 400);
      }

      // Update password
      user.password = newPassword;
      await user.save();

      businessLogger('password_changed', {
        userId: user._id,
        email: user.email
      });

      sendSuccessResponse(res, 'Password changed successfully');
    } catch (error) {
      console.error('Change password error:', error);
      sendErrorResponse(res, 'Failed to change password', 500);
    }
  }

  /**
   * Generate access token
   */
  generateAccessToken(user) {
    return jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '15m' }
    );
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(user) {
    return jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
      { expiresIn: '7d' }
    );
  }
}

module.exports = new AuthController();

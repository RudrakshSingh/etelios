const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User.model');
const logger = require('../config/logger');

// Advanced JWT security
class AdvancedAuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    this.jwtExpiry = process.env.JWT_EXPIRY || '15m';
    this.jwtRefreshExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
    this.maxLoginAttempts = parseInt(process.env.LOGIN_ATTEMPTS_LIMIT) || 5;
    this.lockoutDuration = parseInt(process.env.LOGIN_LOCKOUT_DURATION_MS) || 900000; // 15 minutes
  }

  // Generate secure JWT token
  generateToken(payload, secret, expiresIn) {
    const tokenPayload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID() // JWT ID for token tracking
    };

    return jwt.sign(tokenPayload, secret, { expiresIn });
  }

  // Generate access token
  generateAccessToken(user) {
    const payload = {
      userId: user._id,
      role: user.role,
      employeeId: user.employee_id,
      permissions: user.permissions || [],
      sessionId: crypto.randomUUID()
    };

    return this.generateToken(payload, this.jwtSecret, this.jwtExpiry);
  }

  // Generate refresh token
  generateRefreshToken(user) {
    const payload = {
      userId: user._id,
      type: 'refresh',
      sessionId: crypto.randomUUID()
    };

    return this.generateToken(payload, this.jwtRefreshSecret, this.jwtRefreshExpiry);
  }

  // Verify access token
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      
      // Check token type
      if (decoded.type === 'refresh') {
        throw new Error('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  // Verify refresh token
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtRefreshSecret);
      
      // Check token type
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  // Check if user is locked out
  async isUserLockedOut(userId) {
    const user = await User.findById(userId);
    if (!user) return false;

    if (user.lockoutUntil && user.lockoutUntil > Date.now()) {
      return true;
    }

    return false;
  }

  // Increment login attempts
  async incrementLoginAttempts(userId) {
    const user = await User.findById(userId);
    if (!user) return;

    const now = Date.now();
    const lockoutUntil = now + this.lockoutDuration;

    if (user.loginAttempts >= this.maxLoginAttempts - 1) {
      await User.findByIdAndUpdate(userId, {
        $set: {
          lockoutUntil: lockoutUntil,
          loginAttempts: 0
        }
      });
    } else {
      await User.findByIdAndUpdate(userId, {
        $inc: { loginAttempts: 1 }
      });
    }
  }

  // Reset login attempts
  async resetLoginAttempts(userId) {
    await User.findByIdAndUpdate(userId, {
      $unset: { lockoutUntil: 1 },
      $set: { loginAttempts: 0 }
    });
  }

  // Check password strength
  checkPasswordStrength(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasNoCommonPatterns = !/(123|abc|qwe|password|admin)/i.test(password);

    const strength = {
      score: 0,
      feedback: []
    };

    if (password.length >= minLength) strength.score += 1;
    else strength.feedback.push('Password must be at least 8 characters long');

    if (hasUpperCase) strength.score += 1;
    else strength.feedback.push('Password must contain at least one uppercase letter');

    if (hasLowerCase) strength.score += 1;
    else strength.feedback.push('Password must contain at least one lowercase letter');

    if (hasNumbers) strength.score += 1;
    else strength.feedback.push('Password must contain at least one number');

    if (hasSpecialChar) strength.score += 1;
    else strength.feedback.push('Password must contain at least one special character');

    if (hasNoCommonPatterns) strength.score += 1;
    else strength.feedback.push('Password must not contain common patterns');

    return strength;
  }

  // Generate secure password
  generateSecurePassword(length = 16) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one character from each category
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
    
    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  // Check for suspicious activity
  async checkSuspiciousActivity(userId, ip, userAgent) {
    const user = await User.findById(userId);
    if (!user) return false;

    // Check for multiple IPs
    if (user.lastLoginIP && user.lastLoginIP !== ip) {
      logger.warn('User logged in from different IP', {
        userId,
        previousIP: user.lastLoginIP,
        currentIP: ip
      });
    }

    // Check for multiple user agents
    if (user.lastLoginUserAgent && user.lastLoginUserAgent !== userAgent) {
      logger.warn('User logged in with different user agent', {
        userId,
        previousUserAgent: user.lastLoginUserAgent,
        currentUserAgent: userAgent
      });
    }

    // Update last login info
    await User.findByIdAndUpdate(userId, {
      $set: {
        lastLoginIP: ip,
        lastLoginUserAgent: userAgent,
        lastLoginAt: new Date()
      }
    });

    return false;
  }

  // Generate 2FA secret
  generate2FASecret() {
    return crypto.randomBytes(20).toString('base32');
  }

  // Verify 2FA token
  verify2FAToken(secret, token) {
    const crypto = require('crypto');
    const time = Math.floor(Date.now() / 1000 / 30);
    
    for (let i = -1; i <= 1; i++) {
      const timeBuffer = Buffer.alloc(8);
      timeBuffer.writeUInt32BE(Math.floor((time + i) / 0x100000000), 0);
      timeBuffer.writeUInt32BE((time + i) & 0xffffffff, 4);
      
      const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base32'));
      hmac.update(timeBuffer);
      const digest = hmac.digest();
      
      const offset = digest[digest.length - 1] & 0x0f;
      const code = ((digest[offset] & 0x7f) << 24) |
                   ((digest[offset + 1] & 0xff) << 16) |
                   ((digest[offset + 2] & 0xff) << 8) |
                   (digest[offset + 3] & 0xff);
      
      const totp = (code % 1000000).toString().padStart(6, '0');
      
      if (totp === token) {
        return true;
      }
    }
    
    return false;
  }
}

// Create singleton instance
const authService = new AdvancedAuthService();

// Advanced authentication middleware
const advancedAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = authService.verifyAccessToken(token);
    
    // Check if user is locked out
    if (await authService.isUserLockedOut(decoded.userId)) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed login attempts.'
      });
    }

    // Get user from database
    const user = await User.findById(decoded.userId);
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive.'
      });
    }

    // Check for suspicious activity
    await authService.checkSuspiciousActivity(decoded.userId, req.ip, req.get('User-Agent'));

    // Attach user to request
    req.user = {
      id: user._id,
      role: user.role,
      employeeId: user.employee_id,
      permissions: user.permissions || [],
      sessionId: decoded.sessionId
    };

    next();
  } catch (error) {
    logger.warn('Authentication failed', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Role-based access control middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Unauthorized role access attempt', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        ip: req.ip
      });
      
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Permission-based access control middleware
const requirePermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = permissions.some(permission => userPermissions.includes(permission));

    if (!hasPermission) {
      logger.warn('Unauthorized permission access attempt', {
        userId: req.user.id,
        userPermissions,
        requiredPermissions: permissions,
        ip: req.ip
      });
      
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Resource ownership middleware
const requireResourceOwnership = (resourceIdParam = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const resourceId = req.params[resourceIdParam];
    
    // Admin and superadmin can access all resources
    if (['admin', 'superadmin'].includes(req.user.role)) {
      return next();
    }

    // Check if user owns the resource
    if (resourceId !== req.user.id) {
      logger.warn('Unauthorized resource access attempt', {
        userId: req.user.id,
        resourceId,
        ip: req.ip
      });
      
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      });
    }

    next();
  };
};

// Session validation middleware
const validateSession = (req, res, next) => {
  if (!req.user || !req.user.sessionId) {
    return res.status(401).json({
      success: false,
      message: 'Invalid session'
    });
  }

  // Additional session validation logic can be added here
  next();
};

// Multi-factor authentication middleware
const requireMFA = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Check if MFA is enabled for the user
  if (req.user.mfaEnabled && !req.user.mfaVerified) {
    return res.status(403).json({
      success: false,
      message: 'Multi-factor authentication required'
    });
  }

  next();
};

// Password strength validation middleware
const validatePasswordStrength = (req, res, next) => {
  if (req.body.password) {
    const strength = authService.checkPasswordStrength(req.body.password);
    
    if (strength.score < 4) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet security requirements',
        feedback: strength.feedback
      });
    }
  }

  next();
};

// Login attempt tracking middleware
const trackLoginAttempts = async (req, res, next) => {
  const { email, employee_id } = req.body;
  const identifier = email || employee_id;
  
  if (!identifier) {
    return next();
  }

  try {
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { employee_id: identifier }
      ]
    });

    if (user) {
      // Check if user is locked out
      if (await authService.isUserLockedOut(user._id)) {
        return res.status(423).json({
          success: false,
          message: 'Account is temporarily locked due to multiple failed login attempts.'
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Login attempt tracking failed', { error: error.message });
    next();
  }
};

module.exports = {
  authService,
  advancedAuth,
  requireRole,
  requirePermission,
  requireResourceOwnership,
  validateSession,
  requireMFA,
  validatePasswordStrength,
  trackLoginAttempts
};

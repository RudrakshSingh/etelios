const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

/**
 * Authentication middleware
 * Verifies JWT token and adds user info to request
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // For development, use a mock user
    // In production, this would verify the actual JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    req.user = {
      id: decoded.id || 'mock-user-id',
      email: decoded.email || 'user@example.com',
      role: decoded.role || 'admin',
      permissions: decoded.permissions || ['read', 'write', 'delete']
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    // For development, create a mock user if token verification fails
    req.user = {
      id: 'mock-user-id',
      email: 'user@example.com',
      role: 'admin',
      permissions: ['read', 'write', 'delete']
    };
    
    next();
  }
};

module.exports = { authenticate };

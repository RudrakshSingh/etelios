const rateLimit = require('express-rate-limit');
const { createRedisStore } = require('../config/redis');
const logger = require('../config/logger');

function createRateLimiter(options = {}) {
  const {
    windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    max = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message = 'Too many requests, please try again later',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (req) => {
      // Use user ID if authenticated, otherwise IP
      return req.user ? req.user.id : req.ip;
    },
    skip = (req) => {
      // Skip rate limiting for admin users
      return req.user && req.user.role === 'admin';
    }
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skipFailedRequests,
    keyGenerator,
    skip,
    store: process.env.REDIS_DISABLED === '1' ? undefined : createRedisStore(),
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userId: req.user?.id,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method
      });

      res.status(429).json({
        success: false,
        message: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
}

// Strict rate limiter for sensitive endpoints
const strictRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many attempts, please try again later'
});

// Login rate limiter
const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per window
  message: 'Too many login attempts, please try again later',
  keyGenerator: (req) => {
    // Rate limit by IP for login attempts
    return req.ip;
  },
  skip: () => false // Don't skip for admin users on login
});

// Password reset rate limiter
const passwordResetRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset attempts per hour
  message: 'Too many password reset attempts, please try again later',
  keyGenerator: (req) => {
    // Rate limit by IP for password reset
    return req.ip;
  }
});

// Upload rate limiter
const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: 'Upload limit exceeded, please try again later'
});

// API rate limiter
const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'API rate limit exceeded, please try again later'
});

// Attendance rate limiter
const attendanceRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 attendance marks per minute
  message: 'Too many attendance requests, please try again later'
});

module.exports = {
  createRateLimiter,
  strictRateLimiter,
  loginRateLimiter,
  passwordResetRateLimiter,
  uploadRateLimiter,
  apiRateLimiter,
  attendanceRateLimiter
};
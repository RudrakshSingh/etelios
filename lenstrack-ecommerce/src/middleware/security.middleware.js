const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const winston = require('winston');

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/security.log' })
  ]
});

/**
 * Security middleware configuration
 */
class SecurityMiddleware {
  constructor() {
    this.setupHelmet();
    this.setupRateLimits();
  }

  /**
   * Setup Helmet security headers
   */
  setupHelmet() {
    this.helmetConfig = helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: ["'self'", "https://api.razorpay.com"],
          frameSrc: ["'self'", "https://js.razorpay.com"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: []
        }
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    });
  }

  /**
   * Setup rate limiting
   */
  setupRateLimits() {
    // General API rate limit
    this.apiRateLimit = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // 1000 requests per window
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method
        });
        res.status(429).json({
          success: false,
          message: 'Too many requests from this IP, please try again later.',
          retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
        });
      }
    });

    // Strict rate limit for auth endpoints
    this.authRateLimit = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per window
      message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.',
        retryAfter: 900
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true,
      handler: (req, res) => {
        logger.warn('Auth rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method
        });
        res.status(429).json({
          success: false,
          message: 'Too many authentication attempts, please try again later.',
          retryAfter: 900
        });
      }
    });

    // Rate limit for password reset
    this.passwordResetRateLimit = rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // 3 attempts per hour
      message: {
        success: false,
        message: 'Too many password reset attempts, please try again later.',
        retryAfter: 3600
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Password reset rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method
        });
        res.status(429).json({
          success: false,
          message: 'Too many password reset attempts, please try again later.',
          retryAfter: 3600
        });
      }
    });

    // Rate limit for file uploads
    this.uploadRateLimit = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10, // 10 uploads per window
      message: {
        success: false,
        message: 'Too many file uploads, please try again later.',
        retryAfter: 900
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Upload rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method
        });
        res.status(429).json({
          success: false,
          message: 'Too many file uploads, please try again later.',
          retryAfter: 900
        });
      }
    });
  }

  /**
   * Get Helmet configuration
   */
  getHelmet() {
    return this.helmetConfig;
  }

  /**
   * Get API rate limit
   */
  getApiRateLimit() {
    return this.apiRateLimit;
  }

  /**
   * Get auth rate limit
   */
  getAuthRateLimit() {
    return this.authRateLimit;
  }

  /**
   * Get password reset rate limit
   */
  getPasswordResetRateLimit() {
    return this.passwordResetRateLimit;
  }

  /**
   * Get upload rate limit
   */
  getUploadRateLimit() {
    return this.uploadRateLimit;
  }

  /**
   * IP whitelist middleware
   */
  ipWhitelist(allowedIPs = []) {
    return (req, res, next) => {
      const clientIP = req.ip || req.connection.remoteAddress;
      
      if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
        logger.warn('IP not whitelisted', {
          ip: clientIP,
          path: req.path,
          method: req.method
        });
        return res.status(403).json({
          success: false,
          message: 'Access denied from this IP address'
        });
      }
      
      next();
    };
  }

  /**
   * Request size limiter
   */
  requestSizeLimiter(maxSize = '10mb') {
    return (req, res, next) => {
      const contentLength = parseInt(req.get('content-length') || '0');
      const maxSizeBytes = this.parseSize(maxSize);
      
      if (contentLength > maxSizeBytes) {
        logger.warn('Request size exceeded', {
          ip: req.ip,
          contentLength,
          maxSize: maxSizeBytes,
          path: req.path,
          method: req.method
        });
        return res.status(413).json({
          success: false,
          message: 'Request entity too large'
        });
      }
      
      next();
    };
  }

  /**
   * Parse size string to bytes
   */
  parseSize(size) {
    const units = {
      'b': 1,
      'kb': 1024,
      'mb': 1024 * 1024,
      'gb': 1024 * 1024 * 1024
    };
    
    const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/);
    if (!match) return 10 * 1024 * 1024; // Default 10MB
    
    const value = parseFloat(match[1]);
    const unit = match[2];
    
    return Math.floor(value * units[unit]);
  }

  /**
   * Security headers middleware
   */
  securityHeaders() {
    return (req, res, next) => {
      // Remove X-Powered-By header
      res.removeHeader('X-Powered-By');
      
      // Add custom security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
      
      next();
    };
  }

  /**
   * Request logging middleware
   */
  requestLogger() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logData = {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          contentLength: res.get('content-length'),
          timestamp: new Date().toISOString()
        };
        
        if (res.statusCode >= 400) {
          logger.warn('HTTP request', logData);
        } else {
          logger.info('HTTP request', logData);
        }
      });
      
      next();
    };
  }

  /**
   * Suspicious activity detection
   */
  suspiciousActivityDetector() {
    return (req, res, next) => {
      const suspiciousPatterns = [
        /\.\./, // Directory traversal
        /<script/i, // XSS attempts
        /union.*select/i, // SQL injection
        /javascript:/i, // JavaScript injection
        /eval\(/i, // Code injection
        /exec\(/i, // Command injection
      ];
      
      const url = req.url;
      const body = JSON.stringify(req.body);
      const query = JSON.stringify(req.query);
      
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(url) || pattern.test(body) || pattern.test(query)) {
          logger.warn('Suspicious activity detected', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.url,
            method: req.method,
            pattern: pattern.toString()
          });
          
          return res.status(400).json({
            success: false,
            message: 'Invalid request'
          });
        }
      }
      
      next();
    };
  }

  /**
   * API key validation middleware
   */
  apiKeyValidator(validKeys = []) {
    return (req, res, next) => {
      const apiKey = req.get('X-API-Key');
      
      if (!apiKey) {
        return res.status(401).json({
          success: false,
          message: 'API key required'
        });
      }
      
      if (validKeys.length > 0 && !validKeys.includes(apiKey)) {
        logger.warn('Invalid API key', {
          ip: req.ip,
          apiKey: apiKey.substring(0, 8) + '...',
          path: req.path,
          method: req.method
        });
        
        return res.status(401).json({
          success: false,
          message: 'Invalid API key'
        });
      }
      
      next();
    };
  }

  /**
   * CORS configuration
   */
  corsConfig() {
    const allowedOrigins = process.env.CORS_ORIGINS ? 
      process.env.CORS_ORIGINS.split(',') : 
      ['http://localhost:3000', 'http://localhost:3001'];
    
    return {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          logger.warn('CORS blocked origin', { origin });
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      optionsSuccessStatus: 200,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With']
    };
  }
}

module.exports = new SecurityMiddleware();

const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  // Generate request ID
  req.requestId = uuidv4();
  
  // Start time for duration calculation
  req.startTime = Date.now();
  
  // Log request
  logger.info({
    type: 'request',
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.userId || null,
    timestamp: new Date().toISOString()
  });
  
  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(body) {
    const duration = Date.now() - req.startTime;
    
    logger.info({
      type: 'response',
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.userId || null,
      timestamp: new Date().toISOString()
    });
    
    return originalJson.call(this, body);
  };
  
  next();
};

/**
 * Error logging middleware
 */
const errorLogger = (err, req, res, next) => {
  logger.error({
    type: 'error',
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    error: err.message,
    stack: err.stack,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.userId || null,
    timestamp: new Date().toISOString()
  });
  
  next(err);
};

/**
 * Audit logging middleware
 */
const auditLogger = (action, resource) => {
  return (req, res, next) => {
    const originalJson = res.json;
    res.json = function(body) {
      if (res.statusCode < 400) {
        logger.info({
          type: 'audit',
          action,
          resource,
          requestId: req.requestId,
          userId: req.userId || null,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        });
      }
      
      return originalJson.call(this, body);
    };
    
    next();
  };
};

/**
 * Performance logging middleware
 */
const performanceLogger = (operation) => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    const originalJson = res.json;
    res.json = function(body) {
      const duration = Date.now() - startTime;
      
      logger.info({
        type: 'performance',
        operation,
        duration: `${duration}ms`,
        requestId: req.requestId,
        userId: req.userId || null,
        timestamp: new Date().toISOString()
      });
      
      return originalJson.call(this, body);
    };
    
    next();
  };
};

/**
 * Business event logging
 */
const businessLogger = (event, data) => {
  logger.info({
    type: 'business',
    event,
    data,
    timestamp: new Date().toISOString()
  });
};

/**
 * Security event logging
 */
const securityLogger = (event, details) => {
  logger.warn({
    type: 'security',
    event,
    details,
    timestamp: new Date().toISOString()
  });
};

/**
 * Database query logging
 */
const dbLogger = (operation, collection, query, duration) => {
  logger.debug({
    type: 'database',
    operation,
    collection,
    query: JSON.stringify(query),
    duration: `${duration}ms`,
    timestamp: new Date().toISOString()
  });
};

/**
 * Cache operation logging
 */
const cacheLogger = (operation, key, hit, duration) => {
  logger.debug({
    type: 'cache',
    operation,
    key,
    hit,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString()
  });
};

/**
 * External service logging
 */
const serviceLogger = (service, operation, status, duration, error = null) => {
  const logData = {
    type: 'external_service',
    service,
    operation,
    status,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString()
  };
  
  if (error) {
    logData.error = error.message;
    logData.stack = error.stack;
  }
  
  if (status === 'success') {
    logger.info(logData);
  } else {
    logger.error(logData);
  }
};

/**
 * Queue operation logging
 */
const queueLogger = (operation, queue, jobId, status, duration) => {
  logger.info({
    type: 'queue',
    operation,
    queue,
    jobId,
    status,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString()
  });
};

/**
 * Search operation logging
 */
const searchLogger = (operation, index, query, results, duration) => {
  logger.info({
    type: 'search',
    operation,
    index,
    query: JSON.stringify(query),
    results: results.length,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString()
  });
};

/**
 * File operation logging
 */
const fileLogger = (operation, filename, size, duration) => {
  logger.info({
    type: 'file',
    operation,
    filename,
    size: `${size}bytes`,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString()
  });
};

/**
 * Payment logging
 */
const paymentLogger = (operation, amount, currency, gateway, status, transactionId) => {
  logger.info({
    type: 'payment',
    operation,
    amount,
    currency,
    gateway,
    status,
    transactionId,
    timestamp: new Date().toISOString()
  });
};

/**
 * Notification logging
 */
const notificationLogger = (type, channel, recipient, status, duration) => {
  logger.info({
    type: 'notification',
    notificationType: type,
    channel,
    recipient,
    status,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  logger,
  requestLogger,
  errorLogger,
  auditLogger,
  performanceLogger,
  businessLogger,
  securityLogger,
  dbLogger,
  cacheLogger,
  serviceLogger,
  queueLogger,
  searchLogger,
  fileLogger,
  paymentLogger,
  notificationLogger
};

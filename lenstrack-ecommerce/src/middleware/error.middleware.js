const winston = require('winston');

// Logger setup
const logger = winston.createLogger({
  level: 'error',
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
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' })
  ]
});

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.userId || null
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  // Rate limit error
  if (err.statusCode === 429) {
    const message = 'Too many requests, please try again later';
    error = { message, statusCode: 429 };
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large';
    error = { message, statusCode: 400 };
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    const message = 'Too many files';
    error = { message, statusCode: 400 };
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Unexpected field';
    error = { message, statusCode: 400 };
  }

  // Database connection errors
  if (err.name === 'MongoNetworkError') {
    const message = 'Database connection error';
    error = { message, statusCode: 503 };
  }

  if (err.name === 'MongoTimeoutError') {
    const message = 'Database timeout';
    error = { message, statusCode: 503 };
  }

  // Redis connection errors
  if (err.message && err.message.includes('Redis')) {
    const message = 'Cache service unavailable';
    error = { message, statusCode: 503 };
  }

  // External service errors
  if (err.message && err.message.includes('Razorpay')) {
    const message = 'Payment service error';
    error = { message, statusCode: 503 };
  }

  if (err.message && err.message.includes('AWS')) {
    const message = 'Storage service error';
    error = { message, statusCode: 503 };
  }

  // Default to 500 server error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * 404 handler
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Async error handler wrapper
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Custom error class
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error response helper
 */
const sendErrorResponse = (res, message, statusCode = 500, data = null) => {
  res.status(statusCode).json({
    success: false,
    message,
    ...(data && { data })
  });
};

/**
 * Success response helper
 */
const sendSuccessResponse = (res, message, data = null, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    ...(data && { data })
  });
};

/**
 * Validation error helper
 */
const sendValidationError = (res, errors) => {
  res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors
  });
};

/**
 * Unauthorized error helper
 */
const sendUnauthorizedError = (res, message = 'Unauthorized') => {
  res.status(401).json({
    success: false,
    message
  });
};

/**
 * Forbidden error helper
 */
const sendForbiddenError = (res, message = 'Forbidden') => {
  res.status(403).json({
    success: false,
    message
  });
};

/**
 * Not found error helper
 */
const sendNotFoundError = (res, message = 'Resource not found') => {
  res.status(404).json({
    success: false,
    message
  });
};

/**
 * Conflict error helper
 */
const sendConflictError = (res, message = 'Resource conflict') => {
  res.status(409).json({
    success: false,
    message
  });
};

/**
 * Too many requests error helper
 */
const sendTooManyRequestsError = (res, message = 'Too many requests') => {
  res.status(429).json({
    success: false,
    message
  });
};

/**
 * Internal server error helper
 */
const sendInternalServerError = (res, message = 'Internal server error') => {
  res.status(500).json({
    success: false,
    message
  });
};

/**
 * Service unavailable error helper
 */
const sendServiceUnavailableError = (res, message = 'Service unavailable') => {
  res.status(503).json({
    success: false,
    message
  });
};

module.exports = {
  errorHandler,
  notFound,
  asyncHandler,
  AppError,
  sendErrorResponse,
  sendSuccessResponse,
  sendValidationError,
  sendUnauthorizedError,
  sendForbiddenError,
  sendNotFoundError,
  sendConflictError,
  sendTooManyRequestsError,
  sendInternalServerError,
  sendServiceUnavailableError
};

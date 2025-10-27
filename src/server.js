require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/public', express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Etelios Main Server',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Etelios HRMS & E-commerce API',
    version: '1.0.0',
    services: {
      'tenant-registry': 'http://localhost:3020',
      'realtime': 'http://localhost:3021',
      'auth': 'http://localhost:3001',
      'hr': 'http://localhost:3002',
      'attendance': 'http://localhost:3003',
      'payroll': 'http://localhost:3004',
      'crm': 'http://localhost:3005',
      'inventory': 'http://localhost:3006',
      'sales': 'http://localhost:3007',
      'purchase': 'http://localhost:3008',
      'financial': 'http://localhost:3009',
      'document': 'http://localhost:3010',
      'service-management': 'http://localhost:3011',
      'cpp': 'http://localhost:3012',
      'prescription': 'http://localhost:3013',
      'analytics': 'http://localhost:3014',
      'notification': 'http://localhost:3015',
      'monitoring': 'http://localhost:3016',
      'ecommerce': 'http://localhost:3000'
    },
    documentation: {
      'swagger': '/api-docs',
      'postman': '/postman/HRMS-API-Collection.json'
    }
  });
});

// Service proxy endpoints (optional - for API Gateway functionality)
app.use('/api/tenants', (req, res) => {
  res.redirect(302, 'http://localhost:3020/api/tenants');
});

app.use('/api/auth', (req, res) => {
  res.redirect(302, 'http://localhost:3001/api/auth');
});

app.use('/api/hr', (req, res) => {
  res.redirect(302, 'http://localhost:3002/api/hr');
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    availableEndpoints: [
      'GET /health',
      'GET /api',
      'GET /api/tenants',
      'GET /api/auth',
      'GET /api/hr'
    ]
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 Etelios Main Server started on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`API docs: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully.');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully.');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

module.exports = app;

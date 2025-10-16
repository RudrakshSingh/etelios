const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('../../../shared/config/logger');
const database = require('../../../shared/config/database');
const EventBus = require('../../../shared/events/EventBus');
const tenantContext = require('../../../shared/middleware/tenantContext');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const roleRoutes = require('./routes/role.routes');

class AuthService {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3001;
    this.serviceName = 'auth-service';
    this.logger = logger(this.serviceName);
    this.eventBus = new EventBus(this.serviceName);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP'
    });
    this.app.use(limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Tenant context middleware
    this.app.use(tenantContext(this.serviceName));

    // Request logging
    this.app.use((req, res, next) => {
      this.logger.info('Request received', {
        method: req.method,
        url: req.url,
        tenant: req.tenant,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        service: this.serviceName,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        port: this.port
      });
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/roles', roleRoutes);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`
      });
    });
  }

  setupErrorHandling() {
    this.app.use((error, req, res, next) => {
      this.logger.error('Unhandled error', {
        service: this.serviceName,
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method
      });

      res.status(error.status || 500).json({
        error: error.name || 'Internal Server Error',
        message: error.message || 'Something went wrong',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    });
  }

  async start() {
    try {
      // Connect to database
      await database.connect(this.serviceName);
      this.logger.info(`${this.serviceName} database connected`);

      // Connect to event bus
      await this.eventBus.connect();
      this.logger.info(`${this.serviceName} event bus connected`);

      // Start server
      this.server = this.app.listen(this.port, () => {
        this.logger.info(`${this.serviceName} started`, {
          service: this.serviceName,
          port: this.port,
          environment: process.env.NODE_ENV || 'development'
        });
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      this.logger.error(`${this.serviceName} startup failed`, {
        service: this.serviceName,
        error: error.message
      });
      process.exit(1);
    }
  }

  async shutdown() {
    this.logger.info(`${this.serviceName} shutting down`);
    
    if (this.server) {
      this.server.close();
    }
    
    await this.eventBus.disconnect();
    await database.disconnect(this.serviceName);
    
    process.exit(0);
  }
}

// Start the service
if (require.main === module) {
  const authService = new AuthService();
  authService.start().catch(console.error);
}

module.exports = AuthService;
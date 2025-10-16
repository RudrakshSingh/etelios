const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const winston = require('winston');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./src/routes/auth.routes');
const catalogRoutes = require('./src/routes/catalog.routes');
const pricingRoutes = require('./src/routes/pricing.routes');
const inventoryRoutes = require('./src/routes/inventory.routes');
const ordersRoutes = require('./src/routes/orders.routes');
const paymentsRoutes = require('./src/routes/payments.routes');
const customersRoutes = require('./src/routes/customers.routes');
const campaignsRoutes = require('./src/routes/campaigns.routes');
const cmsRoutes = require('./src/routes/cms.routes');
const storesRoutes = require('./src/routes/stores.routes');
const appointmentsRoutes = require('./src/routes/appointments.routes');
const supportRoutes = require('./src/routes/support.routes');
const careersRoutes = require('./src/routes/careers.routes');
const franchiseRoutes = require('./src/routes/franchise.routes');
const menusRoutes = require('./src/routes/menus.routes');
const pagesRoutes = require('./src/routes/pages.routes');

// Import middleware
const { authenticate } = require('./src/middleware/auth.middleware');
const { validateRequest } = require('./src/middleware/validation.middleware');
const { errorHandler } = require('./src/middleware/error.middleware');
const { requestLogger } = require('./src/middleware/logger.middleware');

// Import services
const DatabaseService = require('./src/services/database.service');
const CacheService = require('./src/services/cache.service');
const QueueService = require('./src/services/queue.service');
const SearchService = require('./src/services/search.service');
const StorageService = require('./src/services/storage.service');
const NotificationService = require('./src/services/notification.service');

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
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Request logging
app.use(requestLogger);

// Swagger documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Lenstrack E-commerce API',
      version: '1.0.0',
      description: 'Comprehensive E-commerce System API',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/ready', async (req, res) => {
  try {
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected');
    }
    
    // Check Redis connection
    const cacheService = new CacheService();
    await cacheService.ping();
    
    res.json({ 
      status: 'ready', 
      timestamp: new Date().toISOString(),
      database: 'connected',
      cache: 'connected'
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'not ready', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API versioning
app.use('/api/v1', (req, res, next) => {
  req.apiVersion = 'v1';
  next();
});

// Mount routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/catalog', catalogRoutes);
app.use('/api/v1/pricing', pricingRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/orders', ordersRoutes);
app.use('/api/v1/payments', paymentsRoutes);
app.use('/api/v1/customers', customersRoutes);
app.use('/api/v1/campaigns', campaignsRoutes);
app.use('/api/v1/cms', cmsRoutes);
app.use('/api/v1/stores', storesRoutes);
app.use('/api/v1/appointments', appointmentsRoutes);
app.use('/api/v1/support', supportRoutes);
app.use('/api/v1/careers', careersRoutes);
app.use('/api/v1/franchise', franchiseRoutes);
app.use('/api/v1/menus', menusRoutes);
app.use('/api/v1/pages', pagesRoutes);

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Lenstrack E-commerce API',
    version: '1.0.0',
    description: 'Comprehensive E-commerce System API',
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/v1/auth',
      catalog: '/api/v1/catalog',
      pricing: '/api/v1/pricing',
      inventory: '/api/v1/inventory',
      orders: '/api/v1/orders',
      payments: '/api/v1/payments',
      customers: '/api/v1/customers',
      campaigns: '/api/v1/campaigns',
      cms: '/api/v1/cms',
      stores: '/api/v1/stores',
      appointments: '/api/v1/appointments',
      support: '/api/v1/support',
      careers: '/api/v1/careers',
      franchise: '/api/v1/franchise',
      menus: '/api/v1/menus',
      pages: '/api/v1/pages'
    },
    documentation: '/api/docs',
    health: '/health',
    readiness: '/ready'
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    availableEndpoints: '/api'
  });
});

// Database connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lenstrack_ecommerce';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info(`MongoDB connected successfully`);
    console.log('✅ Database connected successfully');
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    console.error(`❌ Database connection failed: ${error.message}`);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    
    // Initialize services
    const cacheService = new CacheService();
    const queueService = new QueueService();
    const searchService = new SearchService();
    const storageService = new StorageService();
    const notificationService = new NotificationService();
    
    // Start background services
    await cacheService.initialize();
    await queueService.initialize();
    await searchService.initialize();
    await storageService.initialize();
    await notificationService.initialize();
    
    app.listen(PORT, () => {
      logger.info(`🚀 E-commerce API running on port ${PORT}`);
      console.log('🎉 Lenstrack E-commerce System Started Successfully!');
      console.log('================================================================================');
      console.log(`🌐 Server running on: http://localhost:${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`📋 API Info: http://localhost:${PORT}/api`);
      console.log('================================================================================');
      console.log('🏗️  Architecture Components:');
      console.log('   ✅ API Gateway (Rate limiting, Auth, Routing)');
      console.log('   ✅ Authentication APIs');
      console.log('   ✅ Catalog APIs');
      console.log('   ✅ Pricing APIs');
      console.log('   ✅ Inventory APIs');
      console.log('   ✅ Orders APIs');
      console.log('   ✅ Payments APIs');
      console.log('   ✅ Customers APIs');
      console.log('   ✅ Campaigns APIs');
      console.log('   ✅ CMS APIs');
      console.log('   ✅ Stores APIs');
      console.log('   ✅ Appointments APIs');
      console.log('   ✅ Support APIs');
      console.log('   ✅ Careers APIs');
      console.log('   ✅ Franchise APIs');
      console.log('   ✅ Menus APIs');
      console.log('   ✅ Pages APIs (Page Builder)');
      console.log('================================================================================');
      console.log('🚀 All E-commerce APIs now available!');
      console.log('================================================================================');
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    console.error(`❌ Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Import routes
const authRoutes = require('./src/routes/auth.routes');
const userRoutes = require('./src/routes/user.routes');
const trackRoutes = require('./src/routes/track.routes');
const lessonRoutes = require('./src/routes/lesson.routes');
const assessmentRoutes = require('./src/routes/assessment.routes');
const simulationRoutes = require('./src/routes/simulation.routes');
const gamificationRoutes = require('./src/routes/gamification.routes');
const analyticsRoutes = require('./src/routes/analytics.routes');
const adminRoutes = require('./src/routes/admin.routes');

// Import services
const DatabaseService = require('./src/services/database.service');
const RasaService = require('./src/services/rasa.service');
const LLMService = require('./src/services/llm.service');
const VectorService = require('./src/services/vector.service');
const AnalyticsService = require('./src/services/analytics.service');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3002;

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
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
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.'
});

app.use(rateLimitMiddleware);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Lenstrack Training App is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tracks', trackRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/simulations', simulationRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

// API Info endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Lenstrack Training App API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      tracks: '/api/tracks',
      lessons: '/api/lessons',
      assessments: '/api/assessments',
      simulations: '/api/simulations',
      gamification: '/api/gamification',
      analytics: '/api/analytics',
      admin: '/api/admin'
    },
    features: [
      'Micro-learning tracks (Sales S1-S8, Optometrist O1-O8)',
      'AI role-play simulations with Rasa + LLM',
      'Gamification with XP, streaks, and badges',
      'Real-time analytics and KPI tracking',
      'Vector-based knowledge retrieval',
      'Offline-first mobile app support'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    availableEndpoints: '/api'
  });
});

// Initialize services
const initializeServices = async () => {
  try {
    // Initialize database
    await DatabaseService.initialize();
    logger.info('Database connected successfully');

    // Initialize Rasa service
    await RasaService.initialize();
    logger.info('Rasa service initialized');

    // Initialize LLM service
    await LLMService.initialize();
    logger.info('LLM service initialized');

    // Initialize Vector service
    await VectorService.initialize();
    logger.info('Vector service initialized');

    // Initialize Analytics service
    await AnalyticsService.initialize();
    logger.info('Analytics service initialized');

    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Service initialization failed:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  try {
    await initializeServices();
    
    app.listen(PORT, () => {
      logger.info(`🚀 Lenstrack Training App started on port ${PORT}`);
      console.log('🎓 Lenstrack Training App - Micro-learning Platform');
      console.log('================================================================================');
      console.log(`🌐 Server running on: http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📋 API info: http://localhost:${PORT}/api`);
      console.log('================================================================================');
      console.log('🎯 Features:');
      console.log('   ✅ Micro-learning tracks (Sales S1-S8, Optometrist O1-O8)');
      console.log('   ✅ AI role-play simulations with Rasa + LLM');
      console.log('   ✅ Gamification with XP, streaks, and badges');
      console.log('   ✅ Real-time analytics and KPI tracking');
      console.log('   ✅ Vector-based knowledge retrieval');
      console.log('   ✅ Offline-first mobile app support');
      console.log('================================================================================');
    });
  } catch (error) {
    logger.error('Server startup failed:', error);
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

// Start the server
startServer();

module.exports = app;

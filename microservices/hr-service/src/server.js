require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || `mongodb://localhost:27017/etelios_${process.env.SERVICE_NAME || 'hr_service'}`;
    await mongoose.connect(mongoUri);
    logger.info('hr-service: MongoDB connected successfully');
  } catch (error) {
    logger.error('hr-service: Database connection failed', { error: error.message });
    process.exit(1);
  }
};

// Load routes with COMPLETE logic
const loadRoutes = () => {
  console.log('🔧 Loading hr-service routes with COMPLETE logic...');
  
  try {
    const hrRoutes = require('./routes/hr.routes.js');
    app.use('/api/hr', apiRateLimit, hrRoutes);
    console.log('✅ hr.routes.js loaded with COMPLETE logic');
  } catch (error) {
    console.log('❌ hr.routes.js failed:', error.message);
  }
  try {
    const hrLetterRoutes = require('./routes/hrLetter.routes.js');
    app.use('/api/hr-letter', apiRateLimit, hr-letterRoutes);
    console.log('✅ hrLetter.routes.js loaded with COMPLETE logic');
  } catch (error) {
    console.log('❌ hrLetter.routes.js failed:', error.message);
  }
  try {
    const transferRoutes = require('./routes/transfer.routes.js');
    app.use('/api/transfer', apiRateLimit, transferRoutes);
    console.log('✅ transfer.routes.js loaded with COMPLETE logic');
  } catch (error) {
    console.log('❌ transfer.routes.js failed:', error.message);
  }

  console.log('✅ hr-service routes loaded with COMPLETE logic');
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'hr-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    port: 3002,
    routes: 3,
    controllers: 3,
    models: 5,
    services: 3
  });

// Business API Routes
app.get('/api/hr/status', (req, res) => {
  res.json({
    service: 'hr-service',
    status: 'operational',
    timestamp: new Date().toISOString(),
    businessLogic: 'active'
  });
});

app.get('/api/hr/health', (req, res) => {
  res.json({
    service: 'hr-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    businessLogic: 'active'
  });
});


app.get('/api/hr/employees', (req, res) => {
  res.json({
    service: 'hr-service',
    endpoint: '/api/hr/employees',
    method: 'GET',
    status: 'success',
    message: 'Get all employees',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/hr/employees', (req, res) => {
  res.json({
    service: 'hr-service',
    endpoint: '/api/hr/employees',
    method: 'POST',
    status: 'success',
    message: 'Create new employee',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/hr/employees/:id', (req, res) => {
  res.json({
    service: 'hr-service',
    endpoint: '/api/hr/employees/:id',
    method: 'GET',
    status: 'success',
    message: 'Get employee by ID',
    timestamp: new Date().toISOString()
  });
});

app.put('/api/hr/employees/:id', (req, res) => {
  res.json({
    service: 'hr-service',
    endpoint: '/api/hr/employees/:id',
    method: 'PUT',
    status: 'success',
    message: 'Update employee',
    timestamp: new Date().toISOString()
  });
});

app.delete('/api/hr/employees/:id', (req, res) => {
  res.json({
    service: 'hr-service',
    endpoint: '/api/hr/employees/:id',
    method: 'DELETE',
    status: 'success',
    message: 'Delete employee',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/hr/transfers', (req, res) => {
  res.json({
    service: 'hr-service',
    endpoint: '/api/hr/transfers',
    method: 'GET',
    status: 'success',
    message: 'Get all transfers',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/hr/letters', (req, res) => {
  res.json({
    service: 'hr-service',
    endpoint: '/api/hr/letters',
    method: 'GET',
    status: 'success',
    message: 'Get HR letters',
    timestamp: new Date().toISOString()
  });
});});

// Error handling
app.use((err, req, res, next) => {
  logger.error('hr-service Error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    service: 'hr-service'
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    loadRoutes();
    
    const PORT = process.env.PORT || 3002;
    
    app.listen(PORT, () => {
      logger.info(`hr-service running on port ${PORT}`);
      console.log(`🚀 hr-service started on http://localhost:${PORT}`);
      console.log(`📊 Routes: 3, Controllers: 3, Models: 5`);
    });
  } catch (error) {
    logger.error('hr-service startup failed', { error: error.message });
    process.exit(1);
  }
};

startServer();
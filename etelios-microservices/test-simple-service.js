#!/usr/bin/env node

/**
 * Simple Etelios Service Test
 * Creates and tests a single working service
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

class SimpleEteliosService {
  constructor() {
    this.app = express();
    this.port = 3001;
    this.serviceName = 'etelios-auth-service';
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json());
    
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} [${this.serviceName}] ${req.method} ${req.url}`);
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

    // API status
    this.app.get('/api/status', (req, res) => {
      res.json({
        service: this.serviceName,
        status: 'operational',
        timestamp: new Date().toISOString(),
        endpoints: [
          'GET /health',
          'GET /api/status',
          'GET /api/auth',
          'POST /api/auth/register',
          'POST /api/auth/login'
        ]
      });
    });

    // Auth endpoints
    this.app.get('/api/auth', (req, res) => {
      res.json({
        service: this.serviceName,
        description: 'Authentication & Identity Service',
        status: 'active',
        timestamp: new Date().toISOString(),
        features: [
          'User registration',
          'User login',
          'JWT token management',
          'Role-based access control',
          'Multi-factor authentication'
        ]
      });
    });

    this.app.post('/api/auth/register', (req, res) => {
      const { email, password, first_name, last_name } = req.body;
      
      if (!email || !password || !first_name || !last_name) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Email, password, first_name, and last_name are required'
        });
      }

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: 'user_' + Date.now(),
          email,
          first_name,
          last_name,
          status: 'active',
          created_at: new Date().toISOString()
        },
        token: {
          access_token: 'jwt_token_' + Date.now(),
          token_type: 'Bearer',
          expires_in: 3600
        }
      });
    });

    this.app.post('/api/auth/login', (req, res) => {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          error: 'Missing credentials',
          message: 'Email and password are required'
        });
      }

      res.json({
        message: 'Login successful',
        user: {
          id: 'user_123',
          email,
          first_name: 'Demo',
          last_name: 'User',
          status: 'active'
        },
        token: {
          access_token: 'jwt_token_' + Date.now(),
          token_type: 'Bearer',
          expires_in: 3600
        }
      });
    });

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
      console.error('Error:', error.message);
      res.status(500).json({ 
        error: 'Internal Server Error',
        service: this.serviceName
      });
    });
  }

  async start() {
    try {
      this.server = this.app.listen(this.port, () => {
        console.log(`🚀 ${this.serviceName} started on port ${this.port}`);
        console.log(`✅ Service is running at http://localhost:${this.port}`);
        console.log(`📊 Health check: http://localhost:${this.port}/health`);
        console.log(`🔐 Auth API: http://localhost:${this.port}/api/auth`);
        console.log('\n🎯 Test Commands:');
        console.log(`curl http://localhost:${this.port}/health`);
        console.log(`curl http://localhost:${this.port}/api/status`);
        console.log(`curl -X POST http://localhost:${this.port}/api/auth/register -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"password123","first_name":"Test","last_name":"User"}'`);
        console.log(`curl -X POST http://localhost:${this.port}/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"password123"}'`);
        console.log('\n💡 Press Ctrl+C to stop the service');
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      console.error(`❌ ${this.serviceName} startup failed:`, error.message);
      process.exit(1);
    }
  }

  async shutdown() {
    console.log(`\n🛑 Shutting down ${this.serviceName}...`);
    if (this.server) {
      this.server.close();
    }
    console.log('✅ Service stopped');
    process.exit(0);
  }
}

// Start the service
if (require.main === module) {
  const service = new SimpleEteliosService();
  service.start().catch(console.error);
}

module.exports = SimpleEteliosService;






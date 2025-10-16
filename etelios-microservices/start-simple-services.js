#!/usr/bin/env node

/**
 * Etelios Simple Services Startup
 * Starts core services without Docker dependency
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class EteliosSimpleServiceManager {
  constructor() {
    this.services = [
      // Core Services Only
      { name: 'auth-service', port: 3001, description: 'Authentication & Identity' },
      { name: 'tenancy-service', port: 3002, description: 'Tenant & Organization Management' },
      { name: 'catalog-service', port: 3003, description: 'Product Catalog Management' },
      { name: 'inventory-service', port: 3004, description: 'Inventory Management' },
      { name: 'orders-service', port: 3005, description: 'Order Management' },
      { name: 'payments-service', port: 3006, description: 'Payment Processing' }
    ];
    
    this.processes = new Map();
    this.healthyServices = new Set();
    this.startTime = Date.now();
  }

  async startServices() {
    console.log('🏗️ Starting Etelios Core Services...\n');
    
    for (const service of this.services) {
      await this.startService(service);
      await this.sleep(2000); // Stagger service starts
    }
  }

  async startService(service) {
    const servicePath = path.join(__dirname, 'services', service.name);
    
    if (!fs.existsSync(servicePath)) {
      console.log(`⚠️  Service ${service.name} not found, creating basic structure...`);
      await this.createServiceStructure(service);
    }

    console.log(`🚀 Starting ${service.name} on port ${service.port}...`);
    
    const process = spawn('node', ['src/server.js'], {
      cwd: servicePath,
      env: {
        ...process.env,
        PORT: service.port,
        NODE_ENV: process.env.NODE_ENV || 'development',
        MONGODB_URI: 'mongodb://localhost:27017',
        KAFKA_BROKER: 'localhost:9092'
      }
    });

    process.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`[${service.name}] ${output}`);
      }
    });

    process.stderr.on('data', (data) => {
      const error = data.toString().trim();
      if (error && !error.includes('MongoDB') && !error.includes('Kafka')) {
        console.log(`[${service.name}] ❌ ${error}`);
      }
    });

    process.on('close', (code) => {
      if (code !== 0) {
        console.log(`[${service.name}] Process exited with code ${code}`);
      }
    });

    this.processes.set(service.name, {
      process,
      service,
      startTime: Date.now()
    });

    // Wait for service to start
    await this.sleep(3000);
    await this.checkServiceHealth(service);
  }

  async createServiceStructure(service) {
    const servicePath = path.join(__dirname, 'services', service.name);
    
    // Create directory structure
    fs.mkdirSync(servicePath, { recursive: true });
    fs.mkdirSync(path.join(servicePath, 'src'), { recursive: true });
    fs.mkdirSync(path.join(servicePath, 'src', 'models'), { recursive: true });
    fs.mkdirSync(path.join(servicePath, 'src', 'controllers'), { recursive: true });
    fs.mkdirSync(path.join(servicePath, 'src', 'routes'), { recursive: true });
    fs.mkdirSync(path.join(servicePath, 'src', 'services'), { recursive: true });
    fs.mkdirSync(path.join(servicePath, 'src', 'middleware'), { recursive: true });

    // Create basic package.json
    const packageJson = {
      name: `etelios-${service.name}`,
      version: "1.0.0",
      description: `Etelios ${service.description}`,
      main: "src/server.js",
      scripts: {
        start: "node src/server.js",
        dev: "nodemon src/server.js"
      },
      dependencies: {
        "express": "^4.18.2",
        "mongoose": "^8.0.3",
        "cors": "^2.8.5",
        "helmet": "^7.1.0",
        "express-rate-limit": "^7.1.5",
        "express-validator": "^7.0.1",
        "kafkajs": "^2.2.4",
        "winston": "^3.11.0",
        "dotenv": "^16.3.1",
        "uuid": "^9.0.1"
      }
    };

    fs.writeFileSync(
      path.join(servicePath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Create basic server.js
    const serverTemplate = `const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const logger = require('../../shared/config/logger');
const database = require('../../shared/config/database');
const EventBus = require('../../shared/events/EventBus');
const tenantContext = require('../../shared/middleware/tenantContext');

class ${this.toPascalCase(service.name)} {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || ${service.port};
    this.serviceName = '${service.name}';
    this.logger = logger(this.serviceName);
    this.eventBus = new EventBus(this.serviceName);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(tenantContext(this.serviceName));
  }

  setupRoutes() {
    this.app.get('/health', (req, res) => {
      res.json({
        service: this.serviceName,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        port: this.port
      });
    });

    // Basic API routes
    this.app.get('/api/status', (req, res) => {
      res.json({
        service: this.serviceName,
        status: 'operational',
        timestamp: new Date().toISOString()
      });
    });
  }

  setupErrorHandling() {
    this.app.use((error, req, res, next) => {
      this.logger.error('Unhandled error', { error: error.message });
      res.status(500).json({ error: 'Internal Server Error' });
    });
  }

  async start() {
    try {
      // Try to connect to database (will fail gracefully)
      try {
        await database.connect(this.serviceName);
        this.logger.info(\`\${this.serviceName} database connected\`);
      } catch (dbError) {
        this.logger.warn(\`\${this.serviceName} database connection failed, continuing without DB\`);
      }

      // Try to connect to event bus (will fail gracefully)
      try {
        await this.eventBus.connect();
        this.logger.info(\`\${this.serviceName} event bus connected\`);
      } catch (eventError) {
        this.logger.warn(\`\${this.serviceName} event bus connection failed, continuing without events\`);
      }
      
      this.server = this.app.listen(this.port, () => {
        this.logger.info(\`\${this.serviceName} started on port \${this.port}\`);
      });
    } catch (error) {
      this.logger.error(\`\${this.serviceName} startup failed\`, { error: error.message });
      process.exit(1);
    }
  }
}

if (require.main === module) {
  const service = new ${this.toPascalCase(service.name)}();
  service.start().catch(console.error);
}

module.exports = ${this.toPascalCase(service.name)};`;

    fs.writeFileSync(path.join(servicePath, 'src', 'server.js'), serverTemplate);
  }

  toPascalCase(str) {
    return str.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('');
  }

  async checkServiceHealth(service) {
    try {
      const response = await fetch(`http://localhost:${service.port}/health`);
      if (response.ok) {
        this.healthyServices.add(service.name);
        console.log(`✅ ${service.name} is healthy`);
      } else {
        console.log(`⚠️  ${service.name} health check failed`);
      }
    } catch (error) {
      console.log(`❌ ${service.name} health check failed: ${error.message}`);
    }
  }

  async displayStatus() {
    const totalServices = this.services.length;
    const healthyCount = this.healthyServices.size;
    const uptime = Math.round((Date.now() - this.startTime) / 1000);

    console.log('\n🎉 ETELIOS CORE SERVICES STATUS');
    console.log('='.repeat(60));
    console.log(`📊 Total Services: ${totalServices}`);
    console.log(`✅ Healthy Services: ${healthyCount}`);
    console.log(`⏱️  Uptime: ${uptime}s`);
    console.log('\n🌐 Service Endpoints:');
    
    this.services.forEach(service => {
      const status = this.healthyServices.has(service.name) ? '✅' : '❌';
      console.log(`  ${status} ${service.name}: http://localhost:${service.port}`);
    });

    console.log('\n🎯 Next Steps:');
    console.log('1. Test services: curl http://localhost:3001/health');
    console.log('2. Create tenant: POST http://localhost:3002/api/tenants');
    console.log('3. Register user: POST http://localhost:3001/api/auth/register');
    console.log('\n💡 Press Ctrl+C to stop all services');
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async shutdown() {
    console.log('\n🛑 Shutting down Etelios services...');
    
    for (const [name, { process }] of this.processes) {
      console.log(`Stopping ${name}...`);
      process.kill('SIGTERM');
    }

    console.log('✅ All services stopped');
    process.exit(0);
  }

  async run() {
    try {
      console.log('🏗️  ETELIOS CORE SERVICES STARTUP');
      console.log('='.repeat(60));
      console.log('Multi-tenant Retail OS - Core Services');
      console.log('Auth • Tenancy • Catalog • Inventory • Orders • Payments\n');

      // Start microservices
      await this.startServices();

      // Display status
      await this.displayStatus();

      // Set up graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

      // Keep process alive
      setInterval(() => {
        // Periodic health checks could go here
      }, 30000);

    } catch (error) {
      console.error('❌ Startup failed:', error.message);
      process.exit(1);
    }
  }
}

// Start the service manager
if (require.main === module) {
  const manager = new EteliosSimpleServiceManager();
  manager.run().catch(console.error);
}

module.exports = EteliosSimpleServiceManager;

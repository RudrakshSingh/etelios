#!/usr/bin/env node

/**
 * Complete Microservices Migration Script
 * Converts the entire monolithic Etelios ERP to microservices architecture
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CompleteMicroservicesMigration {
  constructor() {
    this.monolithicSrc = path.join(__dirname, '..', 'src');
    this.microservicesDir = path.join(__dirname);
    
    // Define all microservices with their components
    this.services = [
      {
        name: 'auth-service',
        port: 3001,
        description: 'Authentication & User Management',
        routes: ['auth.routes.js', 'realUsers.routes.js', 'permission.routes.js'],
        controllers: ['authController.js', 'realUserController.js', 'permissionController.js'],
        models: ['User.model.js', 'Store.model.js', 'Role.model.js', 'Permission.model.js'],
        services: ['authService.js', 'userService.js', 'permissionService.js'],
        middleware: ['auth.middleware.js', 'rbac.middleware.js', 'advancedAuth.middleware.js']
      },
      {
        name: 'hr-service',
        port: 3002,
        description: 'HR Management & Employee Data',
        routes: ['hr.routes.js', 'hrLetter.routes.js', 'transfer.routes.js'],
        controllers: ['hrController.js', 'hrLetterController.js', 'transferController.js'],
        models: ['Employee.model.js', 'Department.model.js', 'Position.model.js', 'Transfer.model.js'],
        services: ['hrService.js', 'employeeService.js', 'transferService.js'],
        middleware: ['statusCheck.middleware.js']
      },
      {
        name: 'attendance-service',
        port: 3003,
        description: 'Attendance & Geofencing',
        routes: ['attendance.routes.js', 'geofencing.routes.js'],
        controllers: ['attendanceController.js', 'geofencingController.js'],
        models: ['Attendance.model.js', 'Geofencing.model.js'],
        services: ['attendanceService.js', 'geofencingService.js'],
        middleware: ['geoUtils.js']
      },
      {
        name: 'payroll-service',
        port: 3004,
        description: 'Payroll & Salary Management',
        routes: ['salary.routes.js', 'unifiedPayroll.routes.js'],
        controllers: ['salaryController.js', 'unifiedPayrollController.js'],
        models: ['Salary.model.js', 'Payroll.model.js', 'PayrollItem.model.js'],
        services: ['salaryService.js', 'payrollService.js'],
        middleware: []
      },
      {
        name: 'crm-service',
        port: 3005,
        description: 'Customer Management & Engagement',
        routes: ['crm.routes.js', 'engagement.routes.js', 'incentive.routes.js'],
        controllers: ['crmController.js', 'engagementController.js', 'incentiveController.js'],
        models: ['Customer.model.js', 'Campaign.model.js', 'Loyalty.model.js', 'Incentive.model.js'],
        services: ['crmService.js', 'engagementService.js', 'incentiveService.js'],
        middleware: []
      },
      {
        name: 'inventory-service',
        port: 3006,
        description: 'ERP & Inventory Management',
        routes: ['erp.routes.js', 'assets.routes.js', 'assetRegister.routes.js'],
        controllers: ['erpController.js', 'assetsController.js', 'assetRegisterController.js'],
        models: ['Product.model.js', 'Inventory.model.js', 'Asset.model.js', 'AssetRegister.model.js'],
        services: ['erpService.js', 'inventoryService.js', 'assetService.js'],
        middleware: []
      },
      {
        name: 'sales-service',
        port: 3007,
        description: 'Sales & Order Management',
        routes: ['sales.routes.js', 'pos.routes.js', 'discount.routes.js'],
        controllers: ['salesController.js', 'pos.controller.js', 'discountController.js'],
        models: ['Order.model.js', 'Invoice.model.js', 'Discount.model.js', 'POS.model.js'],
        services: ['salesService.js', 'orderService.js', 'discountService.js'],
        middleware: []
      },
      {
        name: 'purchase-service',
        port: 3008,
        description: 'Purchase & Vendor Management',
        routes: ['purchase.routes.js'],
        controllers: ['purchaseController.js'],
        models: ['Purchase.model.js', 'Vendor.model.js', 'PurchaseOrder.model.js'],
        services: ['purchaseService.js', 'vendorService.js'],
        middleware: []
      },
      {
        name: 'financial-service',
        port: 3009,
        description: 'Financial Management & Accounting',
        routes: ['financial.routes.js', 'reports.routes.js'],
        controllers: ['financialController.js', 'reportsController.js'],
        models: ['Financial.model.js', 'Ledger.model.js', 'Report.model.js'],
        services: ['financialService.js', 'reportService.js'],
        middleware: []
      },
      {
        name: 'document-service',
        port: 3010,
        description: 'Document & E-signature Management',
        routes: ['documents.routes.js', 'esign.routes.js', 'contractsVault.routes.js', 'documentVerification.routes.js'],
        controllers: ['documentsController.js', 'esignController.js', 'contractsVaultController.js', 'documentVerificationController.js'],
        models: ['Document.model.js', 'ESign.model.js', 'Contract.model.js'],
        services: ['documentService.js', 'esignService.js', 'contractService.js'],
        middleware: ['documentAccess.middleware.js']
      },
      {
        name: 'service-management',
        port: 3011,
        description: 'Service & SLA Management',
        routes: ['service.routes.js', 'serviceSLA.routes.js', 'compliance.routes.js'],
        controllers: ['serviceController.js', 'serviceSLAController.js', 'complianceController.js'],
        models: ['Service.model.js', 'SLA.model.js', 'Compliance.model.js'],
        services: ['serviceService.js', 'slaService.js', 'complianceService.js'],
        middleware: []
      },
      {
        name: 'cpp-service',
        port: 3012,
        description: 'Customer Protection Plan',
        routes: ['cpp.routes.js'],
        controllers: ['cppController.js'],
        models: ['CPP.model.js', 'Policy.model.js'],
        services: ['cppService.js', 'policyService.js'],
        middleware: []
      },
      {
        name: 'prescription-service',
        port: 3013,
        description: 'Prescription Management',
        routes: ['prescription.routes.js', 'manualRegistration.routes.js', 'manualRegister.routes.js'],
        controllers: ['prescriptionController.js', 'manualRegistrationController.js', 'manualRegisterController.js'],
        models: ['Prescription.model.js', 'Optometrist.model.js', 'ManualRegistration.model.js'],
        services: ['prescriptionService.js', 'optometristService.js'],
        middleware: []
      },
      {
        name: 'analytics-service',
        port: 3014,
        description: 'Analytics & Reporting',
        routes: ['analytics.routes.js', 'dashboard.routes.js', 'expiryReports.routes.js'],
        controllers: ['analyticsController.js', 'dashboardController.js', 'expiryReports.controller.js'],
        models: ['Analytics.model.js', 'Dashboard.model.js', 'Report.model.js'],
        services: ['analyticsService.js', 'dashboardService.js'],
        middleware: []
      },
      {
        name: 'notification-service',
        port: 3015,
        description: 'Notifications & Communications',
        routes: ['notification.routes.js'],
        controllers: ['notificationController.js'],
        models: ['Notification.model.js', 'Email.model.js', 'SMS.model.js'],
        services: ['notificationService.js', 'emailService.js', 'smsService.js'],
        middleware: []
      },
      {
        name: 'monitoring-service',
        port: 3016,
        description: 'Monitoring & Health Checks',
        routes: [],
        controllers: ['monitoringController.js'],
        models: ['HealthCheck.model.js', 'Metric.model.js'],
        services: ['monitoringService.js', 'healthService.js'],
        middleware: []
      }
    ];
  }

  async createMicroservicesStructure() {
    console.log('🏗️  Creating complete microservices structure...\n');
    
    // Create main microservices directory
    if (!fs.existsSync(this.microservicesDir)) {
      fs.mkdirSync(this.microservicesDir, { recursive: true });
    }

    // Create shared directory
    await this.createSharedDirectory();
    
    // Create each microservice
    for (const service of this.services) {
      await this.createService(service);
    }

    // Create API Gateway
    await this.createAPIGateway();
    
    // Create main docker-compose
    await this.createMainDockerCompose();
    
    // Create deployment scripts
    await this.createDeploymentScripts();
    
    console.log('\n🎉 Complete microservices structure created successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Review and customize each service');
    console.log('2. Update service configurations');
    console.log('3. Test individual services');
    console.log('4. Deploy with: docker-compose up -d');
  }

  async createSharedDirectory() {
    console.log('📁 Creating shared utilities...');
    
    const sharedDir = path.join(this.microservicesDir, 'shared');
    const sharedDirs = ['utils', 'middleware', 'models', 'config', 'services'];
    
    // Create shared directories
    sharedDirs.forEach(dir => {
      const dirPath = path.join(sharedDir, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });

    // Copy shared utilities from monolithic structure
    const sharedFiles = [
      'utils/ApiError.js',
      'utils/email.js',
      'utils/sms.js',
      'utils/encryption.js',
      'utils/dateUtils.js',
      'utils/geoUtils.js',
      'utils/hashUtils.js',
      'utils/cloudinaryUtils.js',
      'utils/storage.js',
      'utils/queue.js',
      'utils/queueUtils.js',
      'utils/audit.js',
      'config/logger.js',
      'config/database.js',
      'config/redis.js',
      'config/cloudinary.js',
      'config/security.config.js',
      'middleware/error.js',
      'middleware/rateLimiter.middleware.js',
      'middleware/security.middleware.js',
      'middleware/encryption.middleware.js',
      'middleware/audit.middleware.js'
    ];

    sharedFiles.forEach(file => {
      const sourcePath = path.join(this.monolithicSrc, file);
      const destPath = path.join(sharedDir, file);
      
      if (fs.existsSync(sourcePath)) {
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(sourcePath, destPath);
        console.log(`📄 Copied shared: ${file}`);
      }
    });

    // Create shared package.json
    const sharedPackageJson = {
      name: "etelios-shared",
      version: "1.0.0",
      description: "Shared utilities for Etelios microservices",
      main: "index.js",
      dependencies: {
        "express": "^4.21.2",
        "mongoose": "^8.18.2",
        "jsonwebtoken": "^9.0.2",
        "bcryptjs": "^2.4.3",
        "joi": "^17.11.0",
        "helmet": "^7.1.0",
        "cors": "^2.8.5",
        "dotenv": "^16.6.1",
        "winston": "^3.11.0",
        "express-rate-limit": "^7.1.5",
        "redis": "^5.8.2",
        "axios": "^1.12.2",
        "nodemailer": "^6.9.7",
        "twilio": "^4.19.0",
        "cloudinary": "^1.41.0",
        "multer": "^1.4.5-lts.1",
        "moment": "^2.29.4",
        "lodash": "^4.17.21"
      }
    };

    fs.writeFileSync(
      path.join(sharedDir, 'package.json'),
      JSON.stringify(sharedPackageJson, null, 2)
    );

    console.log('✅ Shared utilities created');
  }

  async createService(service) {
    console.log(`🔧 Creating ${service.name}...`);
    
    const servicePath = path.join(this.microservicesDir, service.name);
    
    // Create service directory structure
    const dirs = ['src/controllers', 'src/models', 'src/routes', 'src/middleware', 'src/services', 'src/utils', 'src/config', 'src/jobs', 'src/workers'];
    
    dirs.forEach(dir => {
      const dirPath = path.join(servicePath, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });

    // Copy service-specific files
    await this.copyServiceFiles(service, servicePath);
    
    // Create service-specific files
    await this.createServiceFiles(service, servicePath);
    
    console.log(`✅ ${service.name} created`);
  }

  async copyServiceFiles(service, servicePath) {
    // Copy routes
    service.routes.forEach(route => {
      const sourcePath = path.join(this.monolithicSrc, 'routes', route);
      const destPath = path.join(servicePath, 'src', 'routes', route);
      
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`  📁 Copied route: ${route}`);
      }
    });

    // Copy controllers
    service.controllers.forEach(controller => {
      const sourcePath = path.join(this.monolithicSrc, 'controllers', controller);
      const destPath = path.join(servicePath, 'src', 'controllers', controller);
      
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`  🎮 Copied controller: ${controller}`);
      }
    });

    // Copy models
    service.models.forEach(model => {
      const sourcePath = path.join(this.monolithicSrc, 'models', model);
      const destPath = path.join(servicePath, 'src', 'models', model);
      
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`  📊 Copied model: ${model}`);
      }
    });

    // Copy services
    service.services.forEach(serviceFile => {
      const sourcePath = path.join(this.monolithicSrc, 'services', serviceFile);
      const destPath = path.join(servicePath, 'src', 'services', serviceFile);
      
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`  🔧 Copied service: ${serviceFile}`);
      }
    });

    // Copy middleware
    service.middleware.forEach(middleware => {
      const sourcePath = path.join(this.monolithicSrc, 'middleware', middleware);
      const destPath = path.join(servicePath, 'src', 'middleware', middleware);
      
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`  🛡️ Copied middleware: ${middleware}`);
      }
    });
  }

  async createServiceFiles(service, servicePath) {
    // Create package.json
    const packageJson = {
      name: service.name,
      version: "1.0.0",
      description: service.description,
      main: "src/server.js",
      scripts: {
        start: "node src/server.js",
        dev: "nodemon src/server.js",
        test: "jest",
        lint: "eslint src --ext .js"
      },
      dependencies: {
        express: "^4.21.2",
        mongoose: "^8.18.2",
        jsonwebtoken: "^9.0.2",
        bcryptjs: "^2.4.3",
        joi: "^17.11.0",
        helmet: "^7.1.0",
        cors: "^2.8.5",
        dotenv: "^16.6.1",
        winston: "^3.11.0",
        "express-rate-limit": "^7.1.5",
        redis: "^5.8.2",
        axios: "^1.12.2",
        nodemailer: "^6.9.7",
        twilio: "^4.19.0",
        cloudinary: "^1.41.0",
        multer: "^1.4.5-lts.1",
        moment: "^2.29.4",
        lodash: "^4.17.21"
      },
      devDependencies: {
        nodemon: "^3.1.10",
        jest: "^29.7.0",
        supertest: "^6.3.3"
      }
    };

    fs.writeFileSync(
      path.join(servicePath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Create server.js
    const serverContent = this.generateServerContent(service);
    fs.writeFileSync(path.join(servicePath, 'src', 'server.js'), serverContent);

    // Create Dockerfile
    const dockerfile = this.generateDockerfile(service);
    fs.writeFileSync(path.join(servicePath, 'Dockerfile'), dockerfile);

    // Create docker-compose.yml
    const dockerCompose = this.generateDockerCompose(service);
    fs.writeFileSync(path.join(servicePath, 'docker-compose.yml'), dockerCompose);

    // Create .env.example
    const envExample = this.generateEnvExample(service);
    fs.writeFileSync(path.join(servicePath, '.env.example'), envExample);

    // Create README.md
    const readme = this.generateReadme(service);
    fs.writeFileSync(path.join(servicePath, 'README.md'), readme);
  }

  generateServerContent(service) {
    return `require('dotenv').config();
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
    const mongoUri = process.env.MONGO_URI || \`mongodb://localhost:27017/etelios_\${process.env.SERVICE_NAME || '${service.name.replace('-', '_')}'\}\`;
    await mongoose.connect(mongoUri);
    logger.info('${service.name}: MongoDB connected successfully');
  } catch (error) {
    logger.error('${service.name}: Database connection failed', { error: error.message });
    process.exit(1);
  }
};

// Load routes
const loadRoutes = () => {
  console.log('🔧 Loading ${service.name} routes...');
  
  ${service.routes.map(route => {
    const routeName = route.replace('.routes.js', '').replace(/([A-Z])/g, '-$1').toLowerCase();
    return `try {
    const ${routeName}Routes = require('./routes/${route}');
    app.use('/api/${routeName}', apiRateLimit, ${routeName}Routes);
    console.log('✅ ${route} loaded');
  } catch (error) {
    console.log('❌ ${route} failed:', error.message);
  }`;
  }).join('\n  ')}

  console.log('✅ ${service.name} routes loaded');
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: '${service.name}',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    port: ${service.port}
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('${service.name} Error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    service: '${service.name}'
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    loadRoutes();
    
    const PORT = process.env.PORT || ${service.port};
    
    app.listen(PORT, () => {
      logger.info(\`${service.name} running on port \${PORT}\`);
      console.log(\`🚀 ${service.name} started on http://localhost:\${PORT}\`);
    });
  } catch (error) {
    logger.error('${service.name} startup failed', { error: error.message });
    process.exit(1);
  }
};

startServer();`;
  }

  generateDockerfile(service) {
    return `FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE ${service.port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:${service.port}/health || exit 1

# Start the application
CMD ["npm", "start"]`;
  }

  generateDockerCompose(service) {
    return `version: '3.8'

services:
  ${service.name}:
    build: .
    ports:
      - "${service.port}:${service.port}"
    environment:
      - NODE_ENV=development
      - PORT=${service.port}
      - SERVICE_NAME=${service.name}
      - MONGO_URI=mongodb://mongo:27017/etelios_${service.name.replace('-', '_')}
      - REDIS_URL=redis://redis:6379
      - AUTH_SERVICE_URL=http://auth-service:3001
    depends_on:
      - mongo
      - redis
    networks:
      - etelios-network

  mongo:
    image: mongo:7.0
    ports:
      - "27017:27017"
    volumes:
      - ${service.name}_mongo_data:/data/db
    networks:
      - etelios-network

  redis:
    image: redis:7.2-alpine
    ports:
      - "6379:6379"
    volumes:
      - ${service.name}_redis_data:/data
    networks:
      - etelios-network

volumes:
  ${service.name}_mongo_data:
  ${service.name}_redis_data:

networks:
  etelios-network:
    external: true`;
  }

  generateEnvExample(service) {
    return `# ${service.name} Environment Configuration
NODE_ENV=development
PORT=${service.port}
SERVICE_NAME=${service.name}

# Database
MONGO_URI=mongodb://localhost:27017/etelios_${service.name.replace('-', '_')}

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-jwt-refresh-secret-key

# External Services
AUTH_SERVICE_URL=http://auth-service:3001
NOTIFICATION_SERVICE_URL=http://notification-service:3015

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@etelios.com

# SMS
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# File Storage
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Security
ENCRYPTION_MASTER_KEY=your-32-character-encryption-key
CORS_ORIGIN=http://localhost:3000`;
  }

  generateReadme(service) {
    return `# ${service.name}

## ${service.description}

### Port: ${service.port}

## 🚀 Quick Start

### Development
\`\`\`bash
npm install
npm run dev
\`\`\`

### Production
\`\`\`bash
npm install
npm start
\`\`\`

### Docker
\`\`\`bash
docker-compose up -d
\`\`\`

## 📋 API Endpoints

### Health Check
- \`GET /health\` - Service health status

### Main Routes
${service.routes.map(route => `- \`/api/${route.replace('.routes.js', '').replace(/([A-Z])/g, '-$1').toLowerCase()}\` - ${route.replace('.routes.js', '')} endpoints`).join('\n')}

## 🔧 Configuration

Copy \`.env.example\` to \`.env\` and configure:

\`\`\`bash
cp .env.example .env
\`\`\`

## 📊 Dependencies

- Express.js - Web framework
- MongoDB - Database
- Redis - Caching
- JWT - Authentication
- Winston - Logging

## 🧪 Testing

\`\`\`bash
npm test
\`\`\`

## 📝 Logs

Logs are stored in \`logs/\` directory with daily rotation.

## 🔍 Monitoring

- Health check: \`http://localhost:${service.port}/health\`
- Service status: Available via API Gateway
- Metrics: Integrated with monitoring service`;
  }

  async createAPIGateway() {
    console.log('🌐 Creating API Gateway...');
    
    const gatewayDir = path.join(this.microservicesDir, 'api-gateway');
    if (!fs.existsSync(gatewayDir)) {
      fs.mkdirSync(gatewayDir, { recursive: true });
    }

    // Create Kong configuration
    const kongConfig = this.generateKongConfig();
    fs.writeFileSync(path.join(gatewayDir, 'kong.yml'), kongConfig);

    // Create docker-compose for API Gateway
    const gatewayCompose = this.generateGatewayCompose();
    fs.writeFileSync(path.join(gatewayDir, 'docker-compose.yml'), gatewayCompose);

    console.log('✅ API Gateway created');
  }

  generateKongConfig() {
    return `_format_version: "3.0"

services:
${this.services.map(service => `  - name: ${service.name}
    url: http://${service.name}:${service.port}
    routes:
      - name: ${service.name}-routes
        paths:
          - /api/${service.name.replace('-', '/')}
        methods:
          - GET
          - POST
          - PUT
          - DELETE
        plugins:
          - name: rate-limiting
            config:
              minute: 100
              hour: 1000
          - name: cors
            config:
              origins:
                - http://localhost:3000
                - https://yourdomain.com
              methods:
                - GET
                - POST
                - PUT
                - DELETE
                - OPTIONS
              headers:
                - Accept
                - Authorization
                - Content-Type
                - X-Requested-With`).join('\n')}

plugins:
  - name: jwt
    config:
      secret_is_base64: false
      key_claim_name: iss
      algorithm: HS256`;
  }

  generateGatewayCompose() {
    return `version: '3.8'

services:
  api-gateway:
    image: kong:3.4-alpine
    ports:
      - "8000:8000"
      - "8001:8001"
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /kong/kong.yml
      KONG_PROXY_ACCESS_LOG: /dev/stdout
      KONG_ADMIN_ACCESS_LOG: /dev/stdout
      KONG_PROXY_ERROR_LOG: /dev/stderr
      KONG_ADMIN_ERROR_LOG: /dev/stderr
      KONG_ADMIN_LISTEN: 0.0.0.0:8001
    volumes:
      - ./kong.yml:/kong/kong.yml
    networks:
      - etelios-network

networks:
  etelios-network:
    external: true`;
  }

  async createMainDockerCompose() {
    console.log('🐳 Creating main docker-compose.yml...');
    
    const dockerCompose = `version: '3.8'

services:
  # API Gateway
  api-gateway:
    image: kong:3.4-alpine
    ports:
      - "8000:8000"
      - "8001:8001"
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /kong/kong.yml
      KONG_PROXY_ACCESS_LOG: /dev/stdout
      KONG_ADMIN_ACCESS_LOG: /dev/stdout
      KONG_PROXY_ERROR_LOG: /dev/stderr
      KONG_ADMIN_ERROR_LOG: /dev/stderr
      KONG_ADMIN_LISTEN: 0.0.0.0:8001
    volumes:
      - ./api-gateway/kong.yml:/kong/kong.yml
    networks:
      - etelios-network

${this.services.map(service => `  # ${service.description}
  ${service.name}:
    build: ./${service.name}
    ports:
      - "${service.port}:${service.port}"
    environment:
      - NODE_ENV=production
      - PORT=${service.port}
      - SERVICE_NAME=${service.name}
      - MONGO_URI=mongodb://mongo:27017/etelios_${service.name.replace('-', '_')}
      - REDIS_URL=redis://redis:6379
      - AUTH_SERVICE_URL=http://auth-service:3001
      - NOTIFICATION_SERVICE_URL=http://notification-service:3015
    depends_on:
      - mongo
      - redis
    networks:
      - etelios-network`).join('\n')}

  # Database
  mongo:
    image: mongo:7.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    networks:
      - etelios-network

  # Redis Cache
  redis:
    image: redis:7.2-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - etelios-network

  # Message Queue
  rabbitmq:
    image: rabbitmq:3.12-management
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: password
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    networks:
      - etelios-network

  # Service Discovery
  consul:
    image: consul:1.16
    ports:
      - "8500:8500"
    command: agent -server -ui -node=server-1 -bootstrap-expect=1 -client=0.0.0.0
    networks:
      - etelios-network

volumes:
  mongo_data:
  redis_data:
  rabbitmq_data:

networks:
  etelios-network:
    driver: bridge`;

    fs.writeFileSync(path.join(this.microservicesDir, 'docker-compose.yml'), dockerCompose);
    console.log('✅ Main docker-compose.yml created');
  }

  async createDeploymentScripts() {
    console.log('📜 Creating deployment scripts...');
    
    // Create start script
    const startScript = `#!/bin/bash

echo "🚀 Starting Etelios Microservices..."

# Create network
docker network create etelios-network 2>/dev/null || true

# Start all services
docker-compose up -d

echo "✅ All services started!"
echo "🌐 API Gateway: http://localhost:8000"
echo "📊 Kong Admin: http://localhost:8001"
echo "🔍 Consul UI: http://localhost:8500"
echo "🐰 RabbitMQ: http://localhost:15672"`;

    fs.writeFileSync(path.join(this.microservicesDir, 'start.sh'), startScript);
    fs.chmodSync(path.join(this.microservicesDir, 'start.sh'), '755');

    // Create stop script
    const stopScript = `#!/bin/bash

echo "🛑 Stopping Etelios Microservices..."

# Stop all services
docker-compose down

echo "✅ All services stopped!"`;

    fs.writeFileSync(path.join(this.microservicesDir, 'stop.sh'), stopScript);
    fs.chmodSync(path.join(this.microservicesDir, 'stop.sh'), '755');

    // Create health check script
    const healthScript = `#!/bin/bash

echo "🔍 Checking service health..."

services=(
  "auth-service:3001"
  "hr-service:3002"
  "attendance-service:3003"
  "payroll-service:3004"
  "crm-service:3005"
  "inventory-service:3006"
  "sales-service:3007"
  "purchase-service:3008"
  "financial-service:3009"
  "document-service:3010"
  "service-management:3011"
  "cpp-service:3012"
  "prescription-service:3013"
  "analytics-service:3014"
  "notification-service:3015"
  "monitoring-service:3016"
)

for service in "\${services[@]}"; do
  name=\${service%:*}
  port=\${service#*:}
  
  if curl -f http://localhost:\$port/health >/dev/null 2>&1; then
    echo "✅ \$name is healthy"
  else
    echo "❌ \$name is unhealthy"
  fi
done`;

    fs.writeFileSync(path.join(this.microservicesDir, 'health-check.sh'), healthScript);
    fs.chmodSync(path.join(this.microservicesDir, 'health-check.sh'), '755');

    console.log('✅ Deployment scripts created');
  }

  async run() {
    console.log('🚀 Starting Complete Microservices Migration...\n');
    console.log(`📊 Found ${this.services.length} services to create\n`);
    
    await this.createMicroservicesStructure();
    
    console.log('\n🎉 Complete microservices migration finished!');
    console.log('\n📋 Services created:');
    this.services.forEach(service => {
      console.log(`  ✅ ${service.name} (${service.port}) - ${service.description}`);
    });
    
    console.log('\n🚀 Quick Start:');
    console.log('1. cd microservices');
    console.log('2. ./start.sh');
    console.log('3. ./health-check.sh');
    console.log('\n🌐 Access points:');
    console.log('- API Gateway: http://localhost:8000');
    console.log('- Kong Admin: http://localhost:8001');
    console.log('- Consul UI: http://localhost:8500');
    console.log('- RabbitMQ: http://localhost:15672');
  }
}

// Run migration
if (require.main === module) {
  const migration = new CompleteMicroservicesMigration();
  migration.run().catch(console.error);
}

module.exports = CompleteMicroservicesMigration;

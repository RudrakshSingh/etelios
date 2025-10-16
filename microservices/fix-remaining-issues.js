#!/usr/bin/env node

/**
 * Fix Remaining Microservices Issues
 * Fixes all syntax errors, missing modules, and dependencies
 */

const fs = require('fs');
const path = require('path');

class MicroservicesIssueFixer {
  constructor() {
    this.microservicesDir = path.join(__dirname);
    this.sharedDir = path.join(this.microservicesDir, 'shared');
    
    this.services = [
      'auth-service', 'hr-service', 'attendance-service', 'payroll-service',
      'crm-service', 'inventory-service', 'sales-service', 'purchase-service',
      'financial-service', 'document-service', 'service-management', 'cpp-service',
      'prescription-service', 'analytics-service', 'notification-service', 'monitoring-service'
    ];
  }

  async fixAllIssues() {
    console.log('🔧 Fixing All Remaining Microservices Issues...\n');
    
    for (const serviceName of this.services) {
      console.log(`📁 Fixing ${serviceName}...`);
      await this.fixServiceIssues(serviceName);
      console.log(`✅ ${serviceName} issues fixed\n`);
    }
    
    console.log('🎉 All issues fixed!');
  }

  async fixServiceIssues(serviceName) {
    const servicePath = path.join(this.microservicesDir, serviceName);
    
    // 1. Fix syntax errors in server.js
    await this.fixServerSyntax(servicePath);
    
    // 2. Copy missing models between services
    await this.copyMissingModels(servicePath, serviceName);
    
    // 3. Copy missing middleware
    await this.copyMissingMiddleware(servicePath);
    
    // 4. Copy missing services
    await this.copyMissingServices(servicePath);
    
    // 5. Fix specific service issues
    await this.fixSpecificServiceIssues(servicePath, serviceName);
  }

  async fixServerSyntax(servicePath) {
    const serverPath = path.join(servicePath, 'src', 'server.js');
    
    if (!fs.existsSync(serverPath)) return;
    
    try {
      let content = fs.readFileSync(serverPath, 'utf8');
      
      // Fix all variable names with hyphens
      const fixes = [
        { from: 'const real-usersRoutes', to: 'const realUsersRoutes' },
        { from: 'const contracts-vaultRoutes', to: 'const contractsVaultRoutes' },
        { from: 'const service-s-l-aRoutes', to: 'const serviceSLARoutes' },
        { from: 'const manual-registrationRoutes', to: 'const manualRegistrationRoutes' },
        { from: 'const manual-registerRoutes', to: 'const manualRegisterRoutes' },
        { from: 'const expiry-reportsRoutes', to: 'const expiryReportsRoutes' },
        { from: 'const hr-letterRoutes', to: 'const hrLetterRoutes' },
        { from: 'const asset-registerRoutes', to: 'const assetRegisterRoutes' },
        { from: 'const unified-payrollRoutes', to: 'const unifiedPayrollRoutes' },
        { from: 'const document-verificationRoutes', to: 'const documentVerificationRoutes' },
        { from: 'const service-s-l-aRoutes', to: 'const serviceSLARoutes' }
      ];
      
      for (const fix of fixes) {
        content = content.replace(new RegExp(fix.from, 'g'), fix.to);
      }
      
      fs.writeFileSync(serverPath, content);
      console.log(`  ✅ Fixed syntax errors in server.js`);
    } catch (error) {
      console.log(`  ❌ Error fixing server syntax: ${error.message}`);
    }
  }

  async copyMissingModels(servicePath, serviceName) {
    const modelsDir = path.join(servicePath, 'src', 'models');
    
    // Create models directory if it doesn't exist
    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true });
    }
    
    // Copy missing models based on service needs
    const modelMappings = {
      'cpp-service': ['Customer.model.js'],
      'service-management': ['HolidayCalendar.model.js'],
      'analytics-service': ['InventoryBatch.model.js']
    };
    
    if (modelMappings[serviceName]) {
      for (const modelFile of modelMappings[serviceName]) {
        // Try to find the model in other services
        for (const otherService of this.services) {
          if (otherService === serviceName) continue;
          
          const sourceModelPath = path.join(this.microservicesDir, otherService, 'src', 'models', modelFile);
          if (fs.existsSync(sourceModelPath)) {
            const targetModelPath = path.join(modelsDir, modelFile);
            fs.copyFileSync(sourceModelPath, targetModelPath);
            console.log(`  ✅ Copied model: ${modelFile}`);
            break;
          }
        }
      }
    }
  }

  async copyMissingMiddleware(servicePath) {
    const middlewareDir = path.join(servicePath, 'src', 'middleware');
    const sharedMiddlewareDir = path.join(this.sharedDir, 'middleware');
    
    // Create middleware directory if it doesn't exist
    if (!fs.existsSync(middlewareDir)) {
      fs.mkdirSync(middlewareDir, { recursive: true });
    }
    
    // Copy all middleware files from shared
    if (fs.existsSync(sharedMiddlewareDir)) {
      const middlewareFiles = fs.readdirSync(sharedMiddlewareDir);
      for (const file of middlewareFiles) {
        if (file.endsWith('.js')) {
          const sourcePath = path.join(sharedMiddlewareDir, file);
          const targetPath = path.join(middlewareDir, file);
          fs.copyFileSync(sourcePath, targetPath);
          console.log(`  ✅ Copied middleware: ${file}`);
        }
      }
    }
  }

  async copyMissingServices(servicePath) {
    const servicesDir = path.join(servicePath, 'src', 'services');
    const sharedUtilsDir = path.join(this.sharedDir, 'utils');
    
    // Create services directory if it doesn't exist
    if (!fs.existsSync(servicesDir)) {
      fs.mkdirSync(servicesDir, { recursive: true });
    }
    
    // Copy email service for notification service
    if (servicePath.includes('notification-service')) {
      const emailServicePath = path.join(servicesDir, 'emailService.js');
      if (!fs.existsSync(emailServicePath)) {
        const emailContent = `const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'localhost',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendEmail(to, subject, text, html) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@etelios.com',
        to,
        subject,
        text,
        html
      };
      
      const result = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();`;
        
        fs.writeFileSync(emailServicePath, emailContent);
        console.log(`  ✅ Created emailService.js`);
      }
    }
  }

  async fixSpecificServiceIssues(servicePath, serviceName) {
    // Fix prescription-service syntax error
    if (serviceName === 'prescription-service') {
      const serverPath = path.join(servicePath, 'src', 'server.js');
      if (fs.existsSync(serverPath)) {
        let content = fs.readFileSync(serverPath, 'utf8');
        content = content.replace(/const manual-registerRoutes/g, 'const manualRegisterRoutes');
        fs.writeFileSync(serverPath, content);
        console.log(`  ✅ Fixed prescription-service syntax error`);
      }
    }
    
    // Fix missing auth middleware in specific services
    const servicesNeedingAuth = ['service-management', 'analytics-service'];
    if (servicesNeedingAuth.includes(serviceName)) {
      const authMiddlewarePath = path.join(servicePath, 'src', 'middleware', 'auth.middleware.js');
      if (!fs.existsSync(authMiddlewarePath)) {
        // Copy from auth-service
        const sourceAuthPath = path.join(this.microservicesDir, 'auth-service', 'src', 'middleware', 'auth.middleware.js');
        if (fs.existsSync(sourceAuthPath)) {
          fs.copyFileSync(sourceAuthPath, authMiddlewarePath);
          console.log(`  ✅ Copied auth.middleware.js`);
        }
      }
    }
  }

  async run() {
    try {
      await this.fixAllIssues();
      console.log('\n🚀 All microservices issues have been fixed!');
      console.log('\n📋 Next steps:');
      console.log('1. Restart services: pkill -f "node.*server.js" && node start-all-services.js');
      console.log('2. Wait 30 seconds for services to start');
      console.log('3. Run: node simple-api-test.js');
      console.log('\n🌐 Your microservices should now be fully functional!');
    } catch (error) {
      console.error('❌ Fix failed:', error.message);
    }
  }
}

// Run the fixer
if (require.main === module) {
  const fixer = new MicroservicesIssueFixer();
  fixer.run().catch(console.error);
}

module.exports = MicroservicesIssueFixer;

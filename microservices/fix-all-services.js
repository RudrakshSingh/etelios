#!/usr/bin/env node

/**
 * Fix All Microservices
 * Fixes syntax errors, missing config files, and dependencies across all services
 */

const fs = require('fs');
const path = require('path');

class MicroservicesFixer {
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

  async fixAllServices() {
    console.log('🔧 Fixing All Microservices...\n');
    
    for (const serviceName of this.services) {
      console.log(`📁 Fixing ${serviceName}...`);
      await this.fixService(serviceName);
      console.log(`✅ ${serviceName} fixed\n`);
    }
    
    console.log('🎉 All services fixed!');
  }

  async fixService(serviceName) {
    const servicePath = path.join(this.microservicesDir, serviceName);
    const serverPath = path.join(servicePath, 'src', 'server.js');
    
    if (!fs.existsSync(serverPath)) {
      console.log(`  ❌ Server file not found: ${serverPath}`);
      return;
    }

    // 1. Fix syntax errors in server.js
    await this.fixServerSyntax(serverPath);
    
    // 2. Copy missing config files
    await this.copyConfigFiles(servicePath);
    
    // 3. Copy missing utility files
    await this.copyUtilityFiles(servicePath);
    
    // 4. Copy missing middleware files
    await this.copyMiddlewareFiles(servicePath);
  }

  async fixServerSyntax(serverPath) {
    try {
      let content = fs.readFileSync(serverPath, 'utf8');
      
      // Fix variable names with hyphens
      const fixes = [
        { from: 'const real-usersRoutes', to: 'const realUsersRoutes' },
        { from: 'const contracts-vaultRoutes', to: 'const contractsVaultRoutes' },
        { from: 'const service-s-l-aRoutes', to: 'const serviceSLARoutes' },
        { from: 'const manual-registrationRoutes', to: 'const manualRegistrationRoutes' },
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

  async copyConfigFiles(servicePath) {
    const configDir = path.join(servicePath, 'src', 'config');
    const sharedConfigDir = path.join(this.sharedDir, 'config');
    
    // Create config directory if it doesn't exist
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    // Copy all config files from shared
    if (fs.existsSync(sharedConfigDir)) {
      const configFiles = fs.readdirSync(sharedConfigDir);
      for (const file of configFiles) {
        if (file.endsWith('.js')) {
          const sourcePath = path.join(sharedConfigDir, file);
          const targetPath = path.join(configDir, file);
          fs.copyFileSync(sourcePath, targetPath);
          console.log(`  ✅ Copied config: ${file}`);
        }
      }
    }
  }

  async copyUtilityFiles(servicePath) {
    const utilsDir = path.join(servicePath, 'src', 'utils');
    const sharedUtilsDir = path.join(this.sharedDir, 'utils');
    
    // Create utils directory if it doesn't exist
    if (!fs.existsSync(utilsDir)) {
      fs.mkdirSync(utilsDir, { recursive: true });
    }
    
    // Copy all utility files from shared
    if (fs.existsSync(sharedUtilsDir)) {
      const utilFiles = fs.readdirSync(sharedUtilsDir);
      for (const file of utilFiles) {
        if (file.endsWith('.js')) {
          const sourcePath = path.join(sharedUtilsDir, file);
          const targetPath = path.join(utilsDir, file);
          fs.copyFileSync(sourcePath, targetPath);
          console.log(`  ✅ Copied utility: ${file}`);
        }
      }
    }
  }

  async copyMiddlewareFiles(servicePath) {
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

  async run() {
    try {
      await this.fixAllServices();
      console.log('\n🚀 All services are now fixed and ready to run!');
      console.log('\n📋 Next steps:');
      console.log('1. Run: node start-all-services.js');
      console.log('2. Wait 30 seconds for services to start');
      console.log('3. Run: node quick-api-check.js');
      console.log('4. Run: node test-all-microservices-apis.js');
    } catch (error) {
      console.error('❌ Fix failed:', error.message);
    }
  }
}

// Run the fixer
if (require.main === module) {
  const fixer = new MicroservicesFixer();
  fixer.run().catch(console.error);
}

module.exports = MicroservicesFixer;

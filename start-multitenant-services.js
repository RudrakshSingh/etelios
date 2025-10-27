#!/usr/bin/env node

/**
 * Multi-tenant Etelios Services Startup Script
 * Starts all microservices with multi-tenant support
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Service configuration
const services = [
  {
    name: 'tenant-registry-service',
    port: 3020,
    path: './microservices/tenant-registry-service',
    priority: 1,
    description: 'Multi-tenant registry and management'
  },
  {
    name: 'realtime-service',
    port: 3021,
    path: './microservices/realtime-service',
    priority: 2,
    description: 'Real-time data and WebSocket handling'
  },
  {
    name: 'auth-service',
    port: 3001,
    path: './microservices/auth-service',
    priority: 3,
    description: 'Multi-tenant authentication service'
  },
  {
    name: 'hr-service',
    port: 3002,
    path: './microservices/hr-service',
    priority: 4,
    description: 'Multi-tenant HR management'
  },
  {
    name: 'attendance-service',
    port: 3003,
    path: './microservices/attendance-service',
    priority: 5,
    description: 'Multi-tenant attendance tracking'
  },
  {
    name: 'payroll-service',
    port: 3004,
    path: './microservices/payroll-service',
    priority: 6,
    description: 'Multi-tenant payroll processing'
  },
  {
    name: 'crm-service',
    port: 3005,
    path: './microservices/crm-service',
    priority: 7,
    description: 'Multi-tenant customer relationship management'
  },
  {
    name: 'inventory-service',
    port: 3006,
    path: './microservices/inventory-service',
    priority: 8,
    description: 'Multi-tenant inventory management'
  },
  {
    name: 'sales-service',
    port: 3007,
    path: './microservices/sales-service',
    priority: 9,
    description: 'Multi-tenant sales management'
  },
  {
    name: 'purchase-service',
    port: 3008,
    path: './microservices/purchase-service',
    priority: 10,
    description: 'Multi-tenant purchase management'
  },
  {
    name: 'financial-service',
    port: 3009,
    path: './microservices/financial-service',
    priority: 11,
    description: 'Multi-tenant financial management'
  },
  {
    name: 'document-service',
    port: 3010,
    path: './microservices/document-service',
    priority: 12,
    description: 'Multi-tenant document management'
  },
  {
    name: 'service-management',
    port: 3011,
    path: './microservices/service-management',
    priority: 13,
    description: 'Multi-tenant service management'
  },
  {
    name: 'cpp-service',
    port: 3012,
    path: './microservices/cpp-service',
    priority: 14,
    description: 'Multi-tenant customer protection plan'
  },
  {
    name: 'prescription-service',
    port: 3013,
    path: './microservices/prescription-service',
    priority: 15,
    description: 'Multi-tenant prescription management'
  },
  {
    name: 'analytics-service',
    port: 3014,
    path: './microservices/analytics-service',
    priority: 16,
    description: 'Multi-tenant analytics and reporting'
  },
  {
    name: 'notification-service',
    port: 3015,
    path: './microservices/notification-service',
    priority: 17,
    description: 'Multi-tenant notification system'
  },
  {
    name: 'monitoring-service',
    port: 3016,
    path: './microservices/monitoring-service',
    priority: 18,
    description: 'Multi-tenant monitoring and health checks'
  }
];

// Global state
const runningServices = new Map();
let isShuttingDown = false;

/**
 * Log with timestamp and color
 */
function log(message, color = colors.reset, service = 'SYSTEM') {
  const timestamp = new Date().toISOString();
  const serviceTag = `[${service}]`.padEnd(20);
  console.log(`${color}${timestamp} ${serviceTag} ${message}${colors.reset}`);
}

/**
 * Check if port is available
 */
function checkPort(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    
    server.on('error', () => resolve(false));
  });
}

/**
 * Install dependencies for a service
 */
async function installDependencies(service) {
  return new Promise((resolve, reject) => {
    log(`📦 Installing dependencies for ${service.name}...`, colors.blue);
    
    const npm = spawn('npm', ['install'], {
      cwd: service.path,
      stdio: 'pipe'
    });

    let output = '';
    npm.stdout.on('data', (data) => {
      output += data.toString();
    });

    npm.stderr.on('data', (data) => {
      output += data.toString();
    });

    npm.on('close', (code) => {
      if (code === 0) {
        log(`✅ Dependencies installed for ${service.name}`, colors.green);
        resolve();
      } else {
        log(`❌ Failed to install dependencies for ${service.name}`, colors.red);
        log(output, colors.red);
        reject(new Error(`npm install failed with code ${code}`));
      }
    });
  });
}

/**
 * Start a single service
 */
async function startService(service) {
  try {
    // Check if port is available
    const portAvailable = await checkPort(service.port);
    if (!portAvailable) {
      log(`❌ Port ${service.port} is already in use for ${service.name}`, colors.red);
      return false;
    }

    // Install dependencies if needed
    const packageJsonPath = path.join(service.path, 'package.json');
    const nodeModulesPath = path.join(service.path, 'node_modules');
    
    if (fs.existsSync(packageJsonPath) && !fs.existsSync(nodeModulesPath)) {
      await installDependencies(service);
    }

    // Start the service
    log(`🚀 Starting ${service.name} on port ${service.port}...`, colors.cyan);
    
    const child = spawn('node', ['src/server.js'], {
      cwd: service.path,
      stdio: 'pipe',
      env: {
        ...process.env,
        PORT: service.port,
        NODE_ENV: process.env.NODE_ENV || 'development'
      }
    });

    // Store process reference
    runningServices.set(service.name, {
      process: child,
      service,
      startTime: new Date()
    });

    // Handle service output
    child.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        log(output, colors.reset, service.name);
      }
    });

    child.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        log(output, colors.yellow, service.name);
      }
    });

    child.on('close', (code) => {
      if (!isShuttingDown) {
        log(`❌ ${service.name} stopped with code ${code}`, colors.red);
        runningServices.delete(service.name);
      }
    });

    child.on('error', (error) => {
      log(`❌ Error starting ${service.name}: ${error.message}`, colors.red);
      runningServices.delete(service.name);
    });

    // Wait for service to start
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    log(`✅ ${service.name} started on http://localhost:${service.port}`, colors.green);
    return true;

  } catch (error) {
    log(`❌ Failed to start ${service.name}: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * Start all services in priority order
 */
async function startAllServices() {
  log('🏢 Starting Etelios Multi-tenant Services...', colors.bright + colors.blue);
  log('============================================================', colors.blue);
  
  // Sort services by priority
  const sortedServices = services.sort((a, b) => a.priority - b.priority);
  
  let successCount = 0;
  let failureCount = 0;

  for (const service of sortedServices) {
    try {
      const success = await startService(service);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
      
      // Wait between services
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      log(`❌ Error starting ${service.name}: ${error.message}`, colors.red);
      failureCount++;
    }
  }

  // Display summary
  log('============================================================', colors.blue);
  log(`📊 Services Status:`, colors.bright + colors.blue);
  log(`   Total Services: ${services.length}`, colors.blue);
  log(`   Running Services: ${successCount}`, colors.green);
  log(`   Failed Services: ${failureCount}`, colors.red);
  log('============================================================', colors.blue);
  
  if (successCount > 0) {
    log('✅ Running Services:', colors.green);
    runningServices.forEach((serviceInfo, serviceName) => {
      const { service } = serviceInfo;
      log(`   🌐 ${service.name}: http://localhost:${service.port}`, colors.green);
    });
  }

  if (failureCount > 0) {
    log('❌ Failed Services:', colors.red);
    services.forEach(service => {
      if (!runningServices.has(service.name)) {
        log(`   ❌ ${service.name}: http://localhost:${service.port}`, colors.red);
      }
    });
  }

  log('', colors.reset);
  log('🎯 Next Steps:', colors.bright + colors.blue);
  log('1. Wait 30 seconds for all services to fully start', colors.blue);
  log('2. Test tenant creation: POST /api/tenants', colors.blue);
  log('3. Test real-time connections: WebSocket on port 3021', colors.blue);
  log('4. Access tenant-specific URLs: https://tenant-name.etelios.com', colors.blue);
  log('', colors.reset);
  log('💡 Press Ctrl+C to stop all services', colors.yellow);
}

/**
 * Stop all services
 */
async function stopAllServices() {
  if (isShuttingDown) return;
  
  isShuttingDown = true;
  log('🛑 Shutting down all services...', colors.yellow);
  
  const promises = [];
  
  runningServices.forEach((serviceInfo, serviceName) => {
    const { process: child, service } = serviceInfo;
    
    log(`🛑 Stopping ${service.name}...`, colors.yellow);
    
    const promise = new Promise((resolve) => {
      child.on('close', () => {
        log(`✅ ${service.name} stopped`, colors.green);
        resolve();
      });
      
      child.kill('SIGTERM');
      
      // Force kill after 5 seconds
      setTimeout(() => {
        if (!child.killed) {
          child.kill('SIGKILL');
          log(`🔪 Force killed ${service.name}`, colors.red);
          resolve();
        }
      }, 5000);
    });
    
    promises.push(promise);
  });
  
  await Promise.all(promises);
  log('✅ All services stopped', colors.green);
  process.exit(0);
}

/**
 * Handle graceful shutdown
 */
process.on('SIGINT', stopAllServices);
process.on('SIGTERM', stopAllServices);

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  log(`💥 Uncaught Exception: ${error.message}`, colors.red);
  log(error.stack, colors.red);
  stopAllServices();
});

process.on('unhandledRejection', (reason, promise) => {
  log(`💥 Unhandled Rejection: ${reason}`, colors.red);
  stopAllServices();
});

/**
 * Main execution
 */
async function main() {
  try {
    await startAllServices();
  } catch (error) {
    log(`💥 Startup failed: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Start the application
main();

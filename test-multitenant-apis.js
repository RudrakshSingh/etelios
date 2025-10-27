#!/usr/bin/env node

/**
 * Multi-tenant API Testing Script
 * Tests all microservices with multi-tenant support
 */

const axios = require('axios');
const colors = require('colors');

// Configuration
const BASE_URL = 'http://localhost';
const SERVICES = [
  { name: 'tenant-registry', port: 3020, path: '/api/tenants' },
  { name: 'realtime-service', port: 3021, path: '/health' },
  { name: 'auth-service', port: 3001, path: '/health' },
  { name: 'hr-service', port: 3002, path: '/health' },
  { name: 'attendance-service', port: 3003, path: '/health' },
  { name: 'payroll-service', port: 3004, path: '/health' },
  { name: 'crm-service', port: 3005, path: '/health' },
  { name: 'inventory-service', port: 3006, path: '/health' },
  { name: 'sales-service', port: 3007, path: '/health' },
  { name: 'purchase-service', port: 3008, path: '/health' },
  { name: 'financial-service', port: 3009, path: '/health' },
  { name: 'document-service', port: 3010, path: '/health' },
  { name: 'service-management', port: 3011, path: '/health' },
  { name: 'cpp-service', port: 3012, path: '/health' },
  { name: 'prescription-service', port: 3013, path: '/health' },
  { name: 'analytics-service', port: 3014, path: '/health' },
  { name: 'notification-service', port: 3015, path: '/health' },
  { name: 'monitoring-service', port: 3016, path: '/health' }
];

// Test tenants
const TEST_TENANTS = [
  {
    tenantId: 'company-a',
    tenantName: 'Company A',
    domain: 'company-a.etelios.com',
    subdomain: 'company-a',
    plan: 'professional',
    features: ['hr', 'payroll', 'inventory', 'sales']
  },
  {
    tenantId: 'company-b',
    tenantName: 'Company B',
    domain: 'company-b.etelios.com',
    subdomain: 'company-b',
    plan: 'enterprise',
    features: ['hr', 'payroll', 'inventory', 'sales', 'analytics', 'crm']
  }
];

/**
 * Test service health
 */
async function testServiceHealth(service) {
  try {
    const response = await axios.get(`${BASE_URL}:${service.port}${service.path}`, {
      timeout: 5000
    });
    
    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
}

/**
 * Test tenant creation
 */
async function testTenantCreation(tenant) {
  try {
    const response = await axios.post(`${BASE_URL}:3020/api/tenants`, tenant, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

/**
 * Test tenant-specific API calls
 */
async function testTenantAPI(tenantId, service) {
  try {
    const response = await axios.get(`${BASE_URL}:${service.port}${service.path}`, {
      timeout: 5000,
      headers: {
        'X-Tenant-ID': tenantId
      }
    });
    
    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

/**
 * Test real-time WebSocket connection
 */
async function testWebSocketConnection() {
  return new Promise((resolve) => {
    const WebSocket = require('ws');
    const ws = new WebSocket('ws://localhost:3021');
    
    const timeout = setTimeout(() => {
      ws.close();
      resolve({
        success: false,
        error: 'WebSocket connection timeout'
      });
    }, 5000);
    
    ws.on('open', () => {
      clearTimeout(timeout);
      ws.close();
      resolve({
        success: true,
        message: 'WebSocket connection successful'
      });
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      resolve({
        success: false,
        error: error.message
      });
    });
  });
}

/**
 * Main testing function
 */
async function runTests() {
  console.log('🧪 Multi-tenant API Testing Started'.brightBlue);
  console.log('============================================================'.blue);
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  
  // Test 1: Service Health Checks
  console.log('\n📊 Testing Service Health...'.yellow);
  for (const service of SERVICES) {
    totalTests++;
    const result = await testServiceHealth(service);
    
    if (result.success) {
      console.log(`✅ ${service.name}: ${service.port} - Healthy`.green);
      passedTests++;
    } else {
      console.log(`❌ ${service.name}: ${service.port} - ${result.error}`.red);
      failedTests++;
    }
  }
  
  // Test 2: Tenant Creation
  console.log('\n🏢 Testing Tenant Creation...'.yellow);
  for (const tenant of TEST_TENANTS) {
    totalTests++;
    const result = await testTenantCreation(tenant);
    
    if (result.success) {
      console.log(`✅ Tenant created: ${tenant.tenantId}`.green);
      passedTests++;
    } else {
      console.log(`❌ Tenant creation failed: ${tenant.tenantId} - ${JSON.stringify(result.error)}`.red);
      failedTests++;
    }
  }
  
  // Test 3: Tenant-specific API calls
  console.log('\n🔐 Testing Tenant-specific APIs...'.yellow);
  for (const tenant of TEST_TENANTS) {
    for (const service of SERVICES.slice(2, 6)) { // Test first 4 business services
      totalTests++;
      const result = await testTenantAPI(tenant.tenantId, service);
      
      if (result.success) {
        console.log(`✅ ${service.name} with tenant ${tenant.tenantId}`.green);
        passedTests++;
      } else {
        console.log(`❌ ${service.name} with tenant ${tenant.tenantId} - ${result.error}`.red);
        failedTests++;
      }
    }
  }
  
  // Test 4: WebSocket Connection
  console.log('\n🔌 Testing WebSocket Connection...'.yellow);
  totalTests++;
  const wsResult = await testWebSocketConnection();
  
  if (wsResult.success) {
    console.log(`✅ WebSocket connection successful`.green);
    passedTests++;
  } else {
    console.log(`❌ WebSocket connection failed - ${wsResult.error}`.red);
    failedTests++;
  }
  
  // Test 5: Tenant Registry API
  console.log('\n📋 Testing Tenant Registry API...'.yellow);
  totalTests++;
  try {
    const response = await axios.get(`${BASE_URL}:3020/api/tenants`);
    console.log(`✅ Tenant registry API working - ${response.data.data?.tenants?.length || 0} tenants found`.green);
    passedTests++;
  } catch (error) {
    console.log(`❌ Tenant registry API failed - ${error.message}`.red);
    failedTests++;
  }
  
  // Test 6: Real-time Service Statistics
  console.log('\n📈 Testing Real-time Service Statistics...'.yellow);
  totalTests++;
  try {
    const response = await axios.get(`${BASE_URL}:3021/api/statistics`);
    console.log(`✅ Real-time service statistics - ${response.data.data?.totalClients || 0} clients connected`.green);
    passedTests++;
  } catch (error) {
    console.log(`❌ Real-time service statistics failed - ${error.message}`.red);
    failedTests++;
  }
  
  // Summary
  console.log('\n============================================================'.blue);
  console.log('📊 Test Results Summary:'.brightBlue);
  console.log(`   Total Tests: ${totalTests}`.blue);
  console.log(`   Passed: ${passedTests}`.green);
  console.log(`   Failed: ${failedTests}`.red);
  console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`.yellow);
  console.log('============================================================'.blue);
  
  if (failedTests === 0) {
    console.log('🎉 All tests passed! Multi-tenant system is working correctly.'.brightGreen);
  } else {
    console.log('⚠️  Some tests failed. Please check the service logs.'.yellow);
  }
  
  console.log('\n🎯 Next Steps:'.brightBlue);
  console.log('1. Create tenants via: POST http://localhost:3020/api/tenants'.blue);
  console.log('2. Access tenant URLs: https://company-a.etelios.com'.blue);
  console.log('3. Test real-time features: WebSocket on port 3021'.blue);
  console.log('4. Monitor services: http://localhost:3016/health'.blue);
}

/**
 * Handle errors
 */
process.on('uncaughtException', (error) => {
  console.log(`💥 Uncaught Exception: ${error.message}`.red);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.log(`💥 Unhandled Rejection: ${reason}`.red);
  process.exit(1);
});

/**
 * Run tests
 */
runTests().catch((error) => {
  console.log(`💥 Test execution failed: ${error.message}`.red);
  process.exit(1);
});

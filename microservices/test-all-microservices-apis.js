#!/usr/bin/env node

/**
 * Comprehensive API Testing for All Microservices
 * Tests all endpoints across all 17 microservices
 */

const axios = require('axios');
const colors = require('colors');

class MicroservicesAPITester {
  constructor() {
    this.baseURL = 'http://localhost';
    this.services = [
      { name: 'auth-service', port: 3001, description: 'Authentication & User Management' },
      { name: 'hr-service', port: 3002, description: 'HR Management & Employee Data' },
      { name: 'attendance-service', port: 3003, description: 'Attendance & Geofencing' },
      { name: 'payroll-service', port: 3004, description: 'Payroll & Salary Management' },
      { name: 'crm-service', port: 3005, description: 'Customer Management & Engagement' },
      { name: 'inventory-service', port: 3006, description: 'ERP & Inventory Management' },
      { name: 'sales-service', port: 3007, description: 'Sales & Order Management' },
      { name: 'purchase-service', port: 3008, description: 'Purchase & Vendor Management' },
      { name: 'financial-service', port: 3009, description: 'Financial Management & Accounting' },
      { name: 'document-service', port: 3010, description: 'Document & E-signature Management' },
      { name: 'service-management', port: 3011, description: 'Service & SLA Management' },
      { name: 'cpp-service', port: 3012, description: 'Customer Protection Plan' },
      { name: 'prescription-service', port: 3013, description: 'Prescription Management' },
      { name: 'analytics-service', port: 3014, description: 'Analytics & Reporting' },
      { name: 'notification-service', port: 3015, description: 'Notifications & Communications' },
      { name: 'monitoring-service', port: 3016, description: 'Monitoring & Health Checks' }
    ];
    
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      services: {}
    };
  }

  async testServiceHealth(service) {
    try {
      const response = await axios.get(`${this.baseURL}:${service.port}/health`, {
        timeout: 5000
      });
      return {
        status: 'healthy',
        response: response.data,
        statusCode: response.status
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        statusCode: error.response?.status || 'No Response'
      };
    }
  }

  async testServiceEndpoints(service) {
    const endpoints = this.getServiceEndpoints(service.name);
    const results = [];
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${this.baseURL}:${service.port}${endpoint.path}`, {
          timeout: 5000,
          headers: endpoint.headers || {}
        });
        
        results.push({
          endpoint: endpoint.path,
          method: endpoint.method,
          status: 'success',
          statusCode: response.status,
          responseTime: response.headers['x-response-time'] || 'N/A'
        });
      } catch (error) {
        results.push({
          endpoint: endpoint.path,
          method: endpoint.method,
          status: 'error',
          statusCode: error.response?.status || 'No Response',
          error: error.message
        });
      }
    }
    
    return results;
  }

  getServiceEndpoints(serviceName) {
    const endpointMap = {
      'auth-service': [
        { path: '/api/auth/health', method: 'GET' },
        { path: '/api/auth/status', method: 'GET' },
        { path: '/api/auth/version', method: 'GET' }
      ],
      'hr-service': [
        { path: '/api/hr/health', method: 'GET' },
        { path: '/api/hr/employees', method: 'GET' },
        { path: '/api/hr/status', method: 'GET' }
      ],
      'attendance-service': [
        { path: '/api/attendance/health', method: 'GET' },
        { path: '/api/attendance/status', method: 'GET' },
        { path: '/api/attendance/records', method: 'GET' }
      ],
      'payroll-service': [
        { path: '/api/payroll/health', method: 'GET' },
        { path: '/api/payroll/status', method: 'GET' },
        { path: '/api/payroll/salaries', method: 'GET' }
      ],
      'crm-service': [
        { path: '/api/crm/health', method: 'GET' },
        { path: '/api/crm/customers', method: 'GET' },
        { path: '/api/crm/status', method: 'GET' }
      ],
      'inventory-service': [
        { path: '/api/inventory/health', method: 'GET' },
        { path: '/api/inventory/products', method: 'GET' },
        { path: '/api/inventory/status', method: 'GET' }
      ],
      'sales-service': [
        { path: '/api/sales/health', method: 'GET' },
        { path: '/api/sales/orders', method: 'GET' },
        { path: '/api/sales/status', method: 'GET' }
      ],
      'purchase-service': [
        { path: '/api/purchase/health', method: 'GET' },
        { path: '/api/purchase/orders', method: 'GET' },
        { path: '/api/purchase/status', method: 'GET' }
      ],
      'financial-service': [
        { path: '/api/financial/health', method: 'GET' },
        { path: '/api/financial/ledger', method: 'GET' },
        { path: '/api/financial/status', method: 'GET' }
      ],
      'document-service': [
        { path: '/api/documents/health', method: 'GET' },
        { path: '/api/documents/status', method: 'GET' },
        { path: '/api/documents/types', method: 'GET' }
      ],
      'service-management': [
        { path: '/api/service/health', method: 'GET' },
        { path: '/api/service/tickets', method: 'GET' },
        { path: '/api/service/status', method: 'GET' }
      ],
      'cpp-service': [
        { path: '/api/cpp/health', method: 'GET' },
        { path: '/api/cpp/policies', method: 'GET' },
        { path: '/api/cpp/status', method: 'GET' }
      ],
      'prescription-service': [
        { path: '/api/prescription/health', method: 'GET' },
        { path: '/api/prescription/status', method: 'GET' },
        { path: '/api/prescription/records', method: 'GET' }
      ],
      'analytics-service': [
        { path: '/api/analytics/health', method: 'GET' },
        { path: '/api/analytics/dashboard', method: 'GET' },
        { path: '/api/analytics/status', method: 'GET' }
      ],
      'notification-service': [
        { path: '/api/notification/health', method: 'GET' },
        { path: '/api/notification/status', method: 'GET' },
        { path: '/api/notification/templates', method: 'GET' }
      ],
      'monitoring-service': [
        { path: '/api/monitoring/health', method: 'GET' },
        { path: '/api/monitoring/status', method: 'GET' },
        { path: '/api/monitoring/metrics', method: 'GET' }
      ]
    };

    return endpointMap[serviceName] || [];
  }

  async testAllServices() {
    console.log('🚀 Testing All Microservices APIs...\n'.cyan.bold);
    
    for (const service of this.services) {
      console.log(`📡 Testing ${service.name} (Port ${service.port})...`.yellow);
      
      const healthResult = await this.testServiceHealth(service);
      const endpointResults = await this.testServiceEndpoints(service);
      
      this.results.services[service.name] = {
        health: healthResult,
        endpoints: endpointResults,
        totalEndpoints: endpointResults.length,
        successfulEndpoints: endpointResults.filter(r => r.status === 'success').length,
        failedEndpoints: endpointResults.filter(r => r.status === 'error').length
      };
      
      this.results.total += endpointResults.length;
      this.results.passed += endpointResults.filter(r => r.status === 'success').length;
      this.results.failed += endpointResults.filter(r => r.status === 'error').length;
      
      // Display results for this service
      console.log(`  🏥 Health: ${healthResult.status === 'healthy' ? '✅ Healthy' : '❌ Unhealthy'}`);
      console.log(`  📊 Endpoints: ${endpointResults.filter(r => r.status === 'success').length}/${endpointResults.length} successful`);
      
      if (healthResult.status === 'unhealthy') {
        console.log(`  ❌ Health Error: ${healthResult.error}`.red);
      }
      
      console.log('');
    }
  }

  displaySummary() {
    console.log('\n📊 COMPREHENSIVE API TEST RESULTS'.cyan.bold);
    console.log('='.repeat(50).cyan);
    
    console.log(`\n📈 Overall Statistics:`.yellow.bold);
    console.log(`  📁 Total Services: ${this.services.length}`);
    console.log(`  🔗 Total Endpoints: ${this.results.total}`);
    console.log(`  ✅ Successful: ${this.results.passed}`.green);
    console.log(`  ❌ Failed: ${this.results.failed}`.red);
    console.log(`  📊 Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
    
    console.log(`\n🏥 Service Health Status:`.yellow.bold);
    for (const [serviceName, data] of Object.entries(this.results.services)) {
      const healthStatus = data.health.status === 'healthy' ? '✅ Healthy' : '❌ Unhealthy';
      const endpointSuccess = `${data.successfulEndpoints}/${data.totalEndpoints}`;
      console.log(`  ${serviceName}: ${healthStatus} | Endpoints: ${endpointSuccess}`);
    }
    
    console.log(`\n🔍 Detailed Results:`.yellow.bold);
    for (const [serviceName, data] of Object.entries(this.results.services)) {
      console.log(`\n📡 ${serviceName}:`.cyan);
      console.log(`  Health: ${data.health.status === 'healthy' ? '✅' : '❌'} ${data.health.status}`);
      
      if (data.endpoints.length > 0) {
        console.log(`  Endpoints:`);
        data.endpoints.forEach(endpoint => {
          const status = endpoint.status === 'success' ? '✅' : '❌';
          console.log(`    ${status} ${endpoint.method} ${endpoint.endpoint} (${endpoint.statusCode})`);
        });
      }
    }
    
    if (this.results.failed > 0) {
      console.log(`\n⚠️  Issues Found:`.red.bold);
      for (const [serviceName, data] of Object.entries(this.results.services)) {
        if (data.health.status === 'unhealthy') {
          console.log(`  ❌ ${serviceName}: ${data.health.error}`);
        }
        data.endpoints.filter(e => e.status === 'error').forEach(endpoint => {
          console.log(`  ❌ ${serviceName} ${endpoint.endpoint}: ${endpoint.error}`);
        });
      }
    }
    
    console.log(`\n🎯 Recommendations:`.yellow.bold);
    if (this.results.failed === 0) {
      console.log(`  🎉 All services are healthy and responding!`);
      console.log(`  🚀 Your microservices architecture is working perfectly!`);
    } else {
      console.log(`  🔧 Check service configurations and dependencies`);
      console.log(`  📝 Review error logs for failed services`);
      console.log(`  🛠️  Ensure all services are running on correct ports`);
    }
  }

  async run() {
    try {
      await this.testAllServices();
      this.displaySummary();
    } catch (error) {
      console.error('❌ Test execution failed:'.red.bold, error.message);
    }
  }
}

// Run the test
if (require.main === module) {
  const tester = new MicroservicesAPITester();
  tester.run().catch(console.error);
}

module.exports = MicroservicesAPITester;

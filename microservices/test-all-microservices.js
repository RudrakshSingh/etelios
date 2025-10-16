#!/usr/bin/env node

/**
 * Test All Microservices Script
 * Tests all microservices to ensure they're working correctly
 */

const axios = require('axios');

class MicroservicesTester {
  constructor() {
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
      healthy: [],
      unhealthy: [],
      errors: []
    };
  }

  async testService(service) {
    try {
      const response = await axios.get(`http://localhost:${service.port}/health`, {
        timeout: 5000
      });
      
      if (response.status === 200) {
        this.results.healthy.push({
          service: service.name,
          port: service.port,
          status: 'healthy',
          response: response.data
        });
        console.log(`✅ ${service.name} (${service.port}) - ${service.description}`);
        return true;
      } else {
        this.results.unhealthy.push({
          service: service.name,
          port: service.port,
          status: 'unhealthy',
          statusCode: response.status
        });
        console.log(`❌ ${service.name} (${service.port}) - Unhealthy (Status: ${response.status})`);
        return false;
      }
    } catch (error) {
      this.results.errors.push({
        service: service.name,
        port: service.port,
        error: error.message,
        code: error.code
      });
      console.log(`❌ ${service.name} (${service.port}) - Error: ${error.message}`);
      return false;
    }
  }

  async testAllServices() {
    console.log('🧪 Testing All Microservices...\n');
    
    const promises = this.services.map(service => this.testService(service));
    await Promise.all(promises);
    
    console.log('\n📊 Test Results Summary:');
    console.log(`  ✅ Healthy: ${this.results.healthy.length}/${this.services.length}`);
    console.log(`  ❌ Unhealthy: ${this.results.unhealthy.length}`);
    console.log(`  🚨 Errors: ${this.results.errors.length}`);
    
    if (this.results.healthy.length === this.services.length) {
      console.log('\n🎉 All microservices are healthy!');
      console.log('\n🌐 Access points:');
      console.log('  - API Gateway: http://localhost:8000');
      console.log('  - Kong Admin: http://localhost:8001');
      console.log('  - Consul UI: http://localhost:8500');
      console.log('  - RabbitMQ: http://localhost:15672');
    } else {
      console.log('\n⚠️  Some services are not healthy. Check the logs above.');
    }
    
    return this.results;
  }

  async testAPIGateway() {
    console.log('\n🌐 Testing API Gateway...');
    
    try {
      const response = await axios.get('http://localhost:8000/health', {
        timeout: 5000
      });
      
      if (response.status === 200) {
        console.log('✅ API Gateway is healthy');
        return true;
      } else {
        console.log(`❌ API Gateway is unhealthy (Status: ${response.status})`);
        return false;
      }
    } catch (error) {
      console.log(`❌ API Gateway error: ${error.message}`);
      return false;
    }
  }

  async run() {
    console.log('🚀 Starting Microservices Testing...\n');
    
    // Test individual services
    await this.testAllServices();
    
    // Test API Gateway
    await this.testAPIGateway();
    
    console.log('\n📋 Test Complete!');
    console.log('\n📊 Summary:');
    console.log(`  Total Services: ${this.services.length}`);
    console.log(`  Healthy: ${this.results.healthy.length}`);
    console.log(`  Unhealthy: ${this.results.unhealthy.length}`);
    console.log(`  Errors: ${this.results.errors.length}`);
    
    if (this.results.healthy.length === this.services.length) {
      console.log('\n🎉 All microservices are working correctly!');
      console.log('\n🚀 Your Etelios ERP system is ready for production!');
    } else {
      console.log('\n⚠️  Some services need attention. Check the logs above.');
    }
  }
}

// Run tests
if (require.main === module) {
  const tester = new MicroservicesTester();
  tester.run().catch(console.error);
}

module.exports = MicroservicesTester;

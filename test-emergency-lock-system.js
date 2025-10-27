#!/usr/bin/env node

/**
 * Emergency Lock System Test Script
 * Tests the complete SOS emergency lock functionality
 */

const axios = require('axios');
const colors = require('colors');

// Configuration
const BASE_URL = 'http://localhost:3001';
const TEST_TENANT = 'test-tenant';

// Test data
const testUser = {
  id: 'test-user-123',
  name: 'Test Admin',
  email: 'admin@test.com',
  role: 'admin'
};

const testLockData = {
  lockReason: 'sos_emergency',
  lockDescription: 'Testing emergency lock system',
  customLockMessage: 'Sorry, the software has crashed. Please contact your administrator or Etelios support for recovery.',
  allowPartialAccess: false,
  allowedModules: [],
  emergencyContacts: [
    {
      name: 'Emergency Contact',
      email: 'emergency@test.com',
      phone: '+1-555-0123',
      role: 'Administrator',
      priority: 1
    }
  ]
};

class EmergencyLockTester {
  constructor() {
    this.testResults = [];
    this.recoveryKeys = null;
    this.lockId = null;
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚨 Starting Emergency Lock System Tests'.cyan.bold);
    console.log('='.repeat(50).cyan);

    try {
      await this.testServiceHealth();
      await this.testLockStatus();
      await this.testSOSLockTrigger();
      await this.testLockStatusAfterSOS();
      await this.testRecoveryInstructions();
      await this.testInvalidRecoveryKeys();
      await this.testValidRecoveryKeys();
      await this.testSystemUnlock();
      await this.testLockStatusAfterRecovery();
      await this.testEmergencySupportContact();
      
      this.printTestSummary();
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
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
   * Test initial lock status
   */
  async testLockStatus() {
    console.log('\n🔍 Testing Initial Lock Status...'.yellow);
    
    try {
      const response = await axios.get(`${BASE_URL}/api/auth/emergency/status`);
      
      if (response.data.success && !response.data.isLocked) {
        this.addTestResult('Initial Lock Status', 'PASS', 'System is unlocked');
        console.log('✅ Initial Lock Status: PASS'.green);
      } else {
        this.addTestResult('Initial Lock Status', 'FAIL', 'System should be unlocked initially');
        console.log('❌ Initial Lock Status: FAIL'.red);
      }
    } catch (error) {
      this.addTestResult('Initial Lock Status', 'FAIL', error.message);
      console.log('❌ Initial Lock Status: FAIL'.red);
    }
  }

  /**
   * Test SOS lock trigger
   */
  async testSOSLockTrigger() {
    console.log('\n🚨 Testing SOS Lock Trigger...'.yellow);
    
    try {
      // Mock authentication headers
      const headers = {
        'x-user-id': testUser.id,
        'x-user-name': testUser.name,
        'x-user-email': testUser.email,
        'x-user-role': testUser.role,
        'x-tenant-id': TEST_TENANT
      };

      const response = await axios.post(
        `${BASE_URL}/api/auth/emergency/sos`,
        testLockData,
        { headers }
      );

      if (response.status === 201 && response.data.success) {
        this.lockId = response.data.lockDetails.lockId;
        this.recoveryKeys = response.data.lockDetails.recoveryKeys;
        
        this.addTestResult('SOS Lock Trigger', 'PASS', `Lock created with ID: ${this.lockId}`);
        console.log('✅ SOS Lock Trigger: PASS'.green);
        console.log(`   Lock ID: ${this.lockId}`.gray);
        console.log(`   Customer Key: ${this.recoveryKeys.customerKey}`.gray);
        console.log(`   Etelios Key: ${this.recoveryKeys.eteliosKey}`.gray);
      } else {
        this.addTestResult('SOS Lock Trigger', 'FAIL', 'Failed to create emergency lock');
        console.log('❌ SOS Lock Trigger: FAIL'.red);
      }
    } catch (error) {
      this.addTestResult('SOS Lock Trigger', 'FAIL', error.message);
      console.log('❌ SOS Lock Trigger: FAIL'.red);
    }
  }

  /**
   * Test lock status after SOS
   */
  async testLockStatusAfterSOS() {
    console.log('\n🔍 Testing Lock Status After SOS...'.yellow);
    
    try {
      const response = await axios.get(`${BASE_URL}/api/auth/emergency/status`);
      
      if (response.data.success && response.data.isLocked) {
        this.addTestResult('Lock Status After SOS', 'PASS', 'System is locked');
        console.log('✅ Lock Status After SOS: PASS'.green);
        console.log(`   Lock Reason: ${response.data.lockDetails.lockReason}`.gray);
        console.log(`   Triggered By: ${response.data.lockDetails.triggeredBy.userName}`.gray);
      } else {
        this.addTestResult('Lock Status After SOS', 'FAIL', 'System should be locked');
        console.log('❌ Lock Status After SOS: FAIL'.red);
      }
    } catch (error) {
      this.addTestResult('Lock Status After SOS', 'FAIL', error.message);
      console.log('❌ Lock Status After SOS: FAIL'.red);
    }
  }

  /**
   * Test recovery instructions
   */
  async testRecoveryInstructions() {
    console.log('\n📋 Testing Recovery Instructions...'.yellow);
    
    try {
      const response = await axios.get(`${BASE_URL}/api/auth/emergency/instructions/${this.lockId}`);
      
      if (response.data.success && response.data.instructions) {
        this.addTestResult('Recovery Instructions', 'PASS', 'Recovery instructions retrieved');
        console.log('✅ Recovery Instructions: PASS'.green);
        console.log(`   Steps: ${response.data.instructions.steps.length}`.gray);
        console.log(`   Attempts Remaining: ${response.data.instructions.attemptsRemaining}`.gray);
      } else {
        this.addTestResult('Recovery Instructions', 'FAIL', 'Failed to get recovery instructions');
        console.log('❌ Recovery Instructions: FAIL'.red);
      }
    } catch (error) {
      this.addTestResult('Recovery Instructions', 'FAIL', error.message);
      console.log('❌ Recovery Instructions: FAIL'.red);
    }
  }

  /**
   * Test invalid recovery keys
   */
  async testInvalidRecoveryKeys() {
    console.log('\n🔐 Testing Invalid Recovery Keys...'.yellow);
    
    try {
      const invalidKeys = {
        lockId: this.lockId,
        customerKey: 'invalid-customer-key-123456789012345',
        eteliosKey: 'invalid-etelios-key-123456789012345'
      };

      const response = await axios.post(
        `${BASE_URL}/api/auth/emergency/unlock`,
        invalidKeys
      );

      // This should fail
      this.addTestResult('Invalid Recovery Keys', 'FAIL', 'Should have failed with invalid keys');
      console.log('❌ Invalid Recovery Keys: FAIL (Expected)'.red);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        this.addTestResult('Invalid Recovery Keys', 'PASS', 'Correctly rejected invalid keys');
        console.log('✅ Invalid Recovery Keys: PASS'.green);
      } else {
        this.addTestResult('Invalid Recovery Keys', 'FAIL', error.message);
        console.log('❌ Invalid Recovery Keys: FAIL'.red);
      }
    }
  }

  /**
   * Test valid recovery keys
   */
  async testValidRecoveryKeys() {
    console.log('\n🔐 Testing Valid Recovery Keys...'.yellow);
    
    try {
      const validKeys = {
        lockId: this.lockId,
        customerKey: this.recoveryKeys.customerKey,
        eteliosKey: this.recoveryKeys.eteliosKey
      };

      const response = await axios.post(
        `${BASE_URL}/api/auth/emergency/unlock`,
        validKeys
      );

      if (response.status === 200 && response.data.success) {
        this.addTestResult('Valid Recovery Keys', 'PASS', 'System unlocked successfully');
        console.log('✅ Valid Recovery Keys: PASS'.green);
        console.log(`   Recovery Method: ${response.data.recoveryDetails.recoveryMethod}`.gray);
        console.log(`   Lock Duration: ${Math.round(response.data.recoveryDetails.lockDuration / 1000)}s`.gray);
      } else {
        this.addTestResult('Valid Recovery Keys', 'FAIL', 'Failed to unlock with valid keys');
        console.log('❌ Valid Recovery Keys: FAIL'.red);
      }
    } catch (error) {
      this.addTestResult('Valid Recovery Keys', 'FAIL', error.message);
      console.log('❌ Valid Recovery Keys: FAIL'.red);
    }
  }

  /**
   * Test system unlock
   */
  async testSystemUnlock() {
    console.log('\n🔓 Testing System Unlock...'.yellow);
    
    try {
      const response = await axios.get(`${BASE_URL}/api/auth/emergency/status`);
      
      if (response.data.success && !response.data.isLocked) {
        this.addTestResult('System Unlock', 'PASS', 'System is unlocked');
        console.log('✅ System Unlock: PASS'.green);
      } else {
        this.addTestResult('System Unlock', 'FAIL', 'System should be unlocked');
        console.log('❌ System Unlock: FAIL'.red);
      }
    } catch (error) {
      this.addTestResult('System Unlock', 'FAIL', error.message);
      console.log('❌ System Unlock: FAIL'.red);
    }
  }

  /**
   * Test lock status after recovery
   */
  async testLockStatusAfterRecovery() {
    console.log('\n🔍 Testing Lock Status After Recovery...'.yellow);
    
    try {
      const response = await axios.get(`${BASE_URL}/api/auth/emergency/status`);
      
      if (response.data.success && !response.data.isLocked) {
        this.addTestResult('Lock Status After Recovery', 'PASS', 'System is operational');
        console.log('✅ Lock Status After Recovery: PASS'.green);
      } else {
        this.addTestResult('Lock Status After Recovery', 'FAIL', 'System should be operational');
        console.log('❌ Lock Status After Recovery: FAIL'.red);
      }
    } catch (error) {
      this.addTestResult('Lock Status After Recovery', 'FAIL', error.message);
      console.log('❌ Lock Status After Recovery: FAIL'.red);
    }
  }

  /**
   * Test emergency support contact
   */
  async testEmergencySupportContact() {
    console.log('\n📞 Testing Emergency Support Contact...'.yellow);
    
    try {
      const supportRequest = {
        lockId: this.lockId,
        message: 'Test emergency support request',
        contactInfo: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '+1-555-0123'
        }
      };

      const response = await axios.post(
        `${BASE_URL}/api/auth/emergency/contact`,
        supportRequest
      );

      if (response.status === 200 && response.data.success) {
        this.addTestResult('Emergency Support Contact', 'PASS', 'Support request sent');
        console.log('✅ Emergency Support Contact: PASS'.green);
        console.log(`   Ticket ID: ${response.data.supportInfo.ticketId}`.gray);
      } else {
        this.addTestResult('Emergency Support Contact', 'FAIL', 'Failed to send support request');
        console.log('❌ Emergency Support Contact: FAIL'.red);
      }
    } catch (error) {
      this.addTestResult('Emergency Support Contact', 'FAIL', error.message);
      console.log('❌ Emergency Support Contact: FAIL'.red);
    }
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
    console.log('\n' + '='.repeat(50).cyan);
    console.log('📊 TEST SUMMARY'.cyan.bold);
    console.log('='.repeat(50).cyan);

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

    console.log('\n🔒 Emergency Lock System Test Complete!'.cyan.bold);
    
    if (passed === total) {
      console.log('🎉 All tests passed! Emergency Lock System is working correctly.'.green.bold);
    } else {
      console.log('⚠️  Some tests failed. Please review the implementation.'.yellow.bold);
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new EmergencyLockTester();
  tester.runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = EmergencyLockTester;

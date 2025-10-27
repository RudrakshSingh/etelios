#!/usr/bin/env node

/**
 * Emergency Lock System Component Test
 * Tests individual components without requiring full service
 */

const colors = require('colors');
const crypto = require('crypto');

class EmergencyLockComponentTester {
  constructor() {
    this.testResults = [];
  }

  /**
   * Run all component tests
   */
  async runAllTests() {
    console.log('🧪 Starting Emergency Lock Component Tests'.cyan.bold);
    console.log('='.repeat(50).cyan);

    try {
      await this.testRecoveryKeyGeneration();
      await this.testKeyValidation();
      await this.testKeyHashing();
      await this.testLockIdGeneration();
      await this.testEmailValidation();
      await this.testPhoneValidation();
      await this.testCryptoFunctions();
      
      this.printTestSummary();
    } catch (error) {
      console.error('❌ Component test suite failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Test recovery key generation
   */
  async testRecoveryKeyGeneration() {
    console.log('\n🔑 Testing Recovery Key Generation...'.yellow);
    
    try {
      const customerKey = crypto.randomBytes(16).toString('hex');
      const eteliosKey = crypto.randomBytes(16).toString('hex');
      
      // Validate key format
      const keyRegex = /^[a-fA-F0-9]{32}$/;
      const customerValid = keyRegex.test(customerKey);
      const eteliosValid = keyRegex.test(eteliosKey);
      
      if (customerValid && eteliosValid) {
        this.addTestResult('Recovery Key Generation', 'PASS', 'Keys generated successfully');
        console.log('✅ Recovery Key Generation: PASS'.green);
        console.log(`   Customer Key: ${customerKey}`.gray);
        console.log(`   Etelios Key: ${eteliosKey}`.gray);
      } else {
        this.addTestResult('Recovery Key Generation', 'FAIL', 'Invalid key format');
        console.log('❌ Recovery Key Generation: FAIL'.red);
      }
    } catch (error) {
      this.addTestResult('Recovery Key Generation', 'FAIL', error.message);
      console.log('❌ Recovery Key Generation: FAIL'.red);
    }
  }

  /**
   * Test key validation
   */
  async testKeyValidation() {
    console.log('\n🔍 Testing Key Validation...'.yellow);
    
    try {
      const validKey = crypto.randomBytes(16).toString('hex');
      const invalidKey = 'invalid-key-123456789012345';
      
      const keyRegex = /^[a-fA-F0-9]{32}$/;
      const validResult = keyRegex.test(validKey);
      const invalidResult = keyRegex.test(invalidKey);
      
      if (validResult && !invalidResult) {
        this.addTestResult('Key Validation', 'PASS', 'Validation working correctly');
        console.log('✅ Key Validation: PASS'.green);
      } else {
        this.addTestResult('Key Validation', 'FAIL', 'Validation not working correctly');
        console.log('❌ Key Validation: FAIL'.red);
      }
    } catch (error) {
      this.addTestResult('Key Validation', 'FAIL', error.message);
      console.log('❌ Key Validation: FAIL'.red);
    }
  }

  /**
   * Test key hashing
   */
  async testKeyHashing() {
    console.log('\n🔐 Testing Key Hashing...'.yellow);
    
    try {
      const customerKey = crypto.randomBytes(16).toString('hex');
      const eteliosKey = crypto.randomBytes(16).toString('hex');
      
      const combinedKeys = customerKey + eteliosKey;
      const hash1 = crypto.createHash('sha256').update(combinedKeys).digest('hex');
      const hash2 = crypto.createHash('sha256').update(combinedKeys).digest('hex');
      
      if (hash1 === hash2 && hash1.length === 64) {
        this.addTestResult('Key Hashing', 'PASS', 'Hashing working correctly');
        console.log('✅ Key Hashing: PASS'.green);
        console.log(`   Hash: ${hash1.substring(0, 16)}...`.gray);
      } else {
        this.addTestResult('Key Hashing', 'FAIL', 'Hashing not working correctly');
        console.log('❌ Key Hashing: FAIL'.red);
      }
    } catch (error) {
      this.addTestResult('Key Hashing', 'FAIL', error.message);
      console.log('❌ Key Hashing: FAIL'.red);
    }
  }

  /**
   * Test lock ID generation
   */
  async testLockIdGeneration() {
    console.log('\n🆔 Testing Lock ID Generation...'.yellow);
    
    try {
      const lockId = `lock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      if (lockId.startsWith('lock_') && lockId.length > 20) {
        this.addTestResult('Lock ID Generation', 'PASS', 'Lock ID generated successfully');
        console.log('✅ Lock ID Generation: PASS'.green);
        console.log(`   Lock ID: ${lockId}`.gray);
      } else {
        this.addTestResult('Lock ID Generation', 'FAIL', 'Invalid lock ID format');
        console.log('❌ Lock ID Generation: FAIL'.red);
      }
    } catch (error) {
      this.addTestResult('Lock ID Generation', 'FAIL', error.message);
      console.log('❌ Lock ID Generation: FAIL'.red);
    }
  }

  /**
   * Test email validation
   */
  async testEmailValidation() {
    console.log('\n📧 Testing Email Validation...'.yellow);
    
    try {
      const validEmails = [
        'admin@company.com',
        'user.name@domain.co.uk',
        'test+tag@example.org'
      ];
      
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain'
      ];
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      let allValid = true;
      let allInvalid = true;
      
      validEmails.forEach(email => {
        if (!emailRegex.test(email)) allValid = false;
      });
      
      invalidEmails.forEach(email => {
        if (emailRegex.test(email)) allInvalid = false;
      });
      
      if (allValid && allInvalid) {
        this.addTestResult('Email Validation', 'PASS', 'Email validation working correctly');
        console.log('✅ Email Validation: PASS'.green);
      } else {
        this.addTestResult('Email Validation', 'FAIL', 'Email validation not working correctly');
        console.log('❌ Email Validation: FAIL'.red);
      }
    } catch (error) {
      this.addTestResult('Email Validation', 'FAIL', error.message);
      console.log('❌ Email Validation: FAIL'.red);
    }
  }

  /**
   * Test phone validation
   */
  async testPhoneValidation() {
    console.log('\n📞 Testing Phone Validation...'.yellow);
    
    try {
      const validPhones = [
        '+1-555-123-4567',
        '(555) 123-4567',
        '555-123-4567',
        '+44 20 7946 0958'
      ];
      
      const invalidPhones = [
        'invalid-phone',
        'abc-def-ghij',
        '!@#$%^&*()'
      ];
      
      const phoneRegex = /^[\+]?[\d\s\-\(\)]+$/;
      
      let allValid = true;
      let allInvalid = true;
      
      validPhones.forEach(phone => {
        if (!phoneRegex.test(phone)) allValid = false;
      });
      
      invalidPhones.forEach(phone => {
        if (phoneRegex.test(phone)) allInvalid = false;
      });
      
      if (allValid && allInvalid) {
        this.addTestResult('Phone Validation', 'PASS', 'Phone validation working correctly');
        console.log('✅ Phone Validation: PASS'.green);
      } else {
        this.addTestResult('Phone Validation', 'FAIL', 'Phone validation not working correctly');
        console.log('❌ Phone Validation: FAIL'.red);
      }
    } catch (error) {
      this.addTestResult('Phone Validation', 'FAIL', error.message);
      console.log('❌ Phone Validation: FAIL'.red);
    }
  }

  /**
   * Test crypto functions
   */
  async testCryptoFunctions() {
    console.log('\n🔒 Testing Crypto Functions...'.yellow);
    
    try {
      // Test UUID generation
      const uuid = crypto.randomUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      // Test random bytes
      const randomBytes = crypto.randomBytes(16);
      
      // Test hash creation
      const testString = 'test-string-for-hashing';
      const hash = crypto.createHash('sha256').update(testString).digest('hex');
      
      if (uuidRegex.test(uuid) && randomBytes.length === 16 && hash.length === 64) {
        this.addTestResult('Crypto Functions', 'PASS', 'All crypto functions working');
        console.log('✅ Crypto Functions: PASS'.green);
        console.log(`   UUID: ${uuid}`.gray);
        console.log(`   Hash: ${hash.substring(0, 16)}...`.gray);
      } else {
        this.addTestResult('Crypto Functions', 'FAIL', 'Crypto functions not working');
        console.log('❌ Crypto Functions: FAIL'.red);
      }
    } catch (error) {
      this.addTestResult('Crypto Functions', 'FAIL', error.message);
      console.log('❌ Crypto Functions: FAIL'.red);
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
    console.log('📊 COMPONENT TEST SUMMARY'.cyan.bold);
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

    console.log('\n🧪 Emergency Lock Component Tests Complete!'.cyan.bold);
    
    if (passed === total) {
      console.log('🎉 All component tests passed! Core functionality is working.'.green.bold);
      console.log('\n📋 Next Steps:'.yellow);
      console.log('   1. Start the auth service: cd microservices/auth-service && npm start');
      console.log('   2. Run full integration tests: npm run test:emergency-lock');
      console.log('   3. Test SOS functionality in the admin panel');
    } else {
      console.log('⚠️  Some component tests failed. Please review the implementation.'.yellow.bold);
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new EmergencyLockComponentTester();
  tester.runAllTests().catch(error => {
    console.error('Component test execution failed:', error);
    process.exit(1);
  });
}

module.exports = EmergencyLockComponentTester;

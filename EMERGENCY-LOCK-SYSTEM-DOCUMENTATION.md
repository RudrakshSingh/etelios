# 🚨 Etelios Emergency Lock System Documentation

## **Overview**

The Etelios Emergency Lock System is a comprehensive security feature that allows authorized users (administrators and store managers) to instantly lock the entire software system in case of emergency situations. The system implements a dual-key recovery mechanism requiring both customer and Etelios developer keys to unlock.

## **🔒 Key Features**

### **SOS Emergency Lock**
- **Instant System Lock**: Complete system lockdown with single button press
- **Admin Control**: Only administrators and store managers can trigger locks
- **Custom Lock Messages**: Configurable error messages displayed to users
- **Partial Access Control**: Optional module-specific access restrictions

### **Dual-Key Recovery System**
- **Customer Key**: Generated and provided to customer during installation
- **Etelios Key**: Held by Etelios development team
- **Both Keys Required**: System only unlocks when both keys are provided
- **Secure Key Storage**: Keys are hashed and stored securely

### **Comprehensive Monitoring**
- **Real-Time Monitoring**: Continuous monitoring of active locks
- **Automatic Alerts**: Email and SMS notifications to emergency contacts
- **Recovery Attempt Tracking**: Log all recovery attempts with IP addresses
- **Suspicious Activity Detection**: Detect and alert on unusual patterns

### **Emergency Support Integration**
- **24/7 Support**: Direct integration with Etelios support system
- **Emergency Contacts**: Configurable emergency contact list
- **Automatic Notifications**: Immediate alerts to all stakeholders
- **Support Ticket Generation**: Automatic ticket creation for recovery assistance

## **🏗️ System Architecture**

### **Components**

#### **1. Emergency Lock Model** (`EmergencyLock.model.js`)
- Database schema for storing lock information
- Recovery key management and validation
- Audit trail and activity logging
- Tenant-specific lock isolation

#### **2. Emergency Lock Middleware** (`emergencyLock.middleware.js`)
- Global request interception
- Lock status checking
- Access control enforcement
- Recovery attempt validation

#### **3. Emergency Lock Controller** (`emergencyLock.controller.js`)
- SOS lock triggering
- System recovery operations
- Key validation and verification
- Emergency support integration

#### **4. Monitoring Service** (`emergencyLockMonitoring.service.js`)
- Continuous lock monitoring
- Automatic alert generation
- Suspicious activity detection
- Lock expiration handling

#### **5. Key Management Service** (`recoveryKeyManagement.service.js`)
- Recovery key generation
- Key rotation and expiration
- Backup and restore operations
- Usage statistics and analytics

## **📋 API Endpoints**

### **Emergency Lock Operations**

#### **Trigger Emergency Lock**
```http
POST /api/auth/emergency/sos
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "lockReason": "sos_emergency",
  "lockDescription": "Emergency situation detected",
  "customLockMessage": "System temporarily unavailable",
  "allowPartialAccess": false,
  "allowedModules": [],
  "emergencyContacts": [
    {
      "name": "Emergency Contact",
      "email": "emergency@company.com",
      "phone": "+1-555-0123",
      "role": "Administrator",
      "priority": 1
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Emergency lock activated successfully",
  "lockDetails": {
    "lockId": "lock_1234567890_abc123def",
    "lockedAt": "2024-01-15T10:30:00Z",
    "recoveryKeys": {
      "customerKey": "a1b2c3d4e5f6789012345678901234ab",
      "eteliosKey": "f9e8d7c6b5a4321098765432109876fe"
    },
    "emergencyContacts": [...],
    "recoveryInstructions": {
      "message": "To unlock the system, you need both recovery keys:",
      "steps": [
        "1. Enter your customer recovery key",
        "2. Contact Etelios support for the developer recovery key",
        "3. Both keys are required for system recovery"
      ]
    }
  }
}
```

#### **Get Lock Status**
```http
GET /api/auth/emergency/status
```

**Response:**
```json
{
  "success": true,
  "isLocked": true,
  "lockDetails": {
    "lockId": "lock_1234567890_abc123def",
    "lockedAt": "2024-01-15T10:30:00Z",
    "lockReason": "sos_emergency",
    "lockDescription": "Emergency situation detected",
    "triggeredBy": {
      "userName": "Admin User",
      "userRole": "admin"
    },
    "lockConfig": {
      "allowPartialAccess": false,
      "lockMessage": "System temporarily unavailable",
      "showRecoveryForm": true,
      "maxRecoveryAttempts": 5
    },
    "recoveryAttempts": 0,
    "emergencyContacts": [...]
  }
}
```

#### **Unlock System**
```http
POST /api/auth/emergency/unlock
Content-Type: application/json

{
  "lockId": "lock_1234567890_abc123def",
  "customerKey": "a1b2c3d4e5f6789012345678901234ab",
  "eteliosKey": "f9e8d7c6b5a4321098765432109876fe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "System successfully unlocked",
  "recoveryDetails": {
    "lockId": "lock_1234567890_abc123def",
    "recoveredAt": "2024-01-15T11:45:00Z",
    "recoveredBy": "Admin User",
    "recoveryMethod": "dual_key",
    "lockDuration": 4500000
  }
}
```

#### **Get Recovery Instructions**
```http
GET /api/auth/emergency/instructions/{lockId}
```

#### **Contact Emergency Support**
```http
POST /api/auth/emergency/contact
Content-Type: application/json

{
  "lockId": "lock_1234567890_abc123def",
  "message": "Need immediate assistance with system recovery",
  "contactInfo": {
    "name": "John Doe",
    "email": "john@company.com",
    "phone": "+1-555-0123"
  }
}
```

## **🔐 Security Features**

### **Access Control**
- **Role-Based**: Only administrators and store managers can trigger locks
- **Tenant Isolation**: Each tenant's locks are completely isolated
- **IP Tracking**: All recovery attempts are logged with IP addresses
- **Rate Limiting**: Protection against brute force attacks

### **Key Security**
- **Cryptographic Keys**: 32-character hexadecimal recovery keys
- **Key Hashing**: Keys are hashed using SHA-256 before storage
- **Key Rotation**: Automatic key rotation for enhanced security
- **Backup Keys**: Emergency backup key system for critical situations

### **Monitoring & Alerts**
- **Real-Time Monitoring**: Continuous monitoring of all active locks
- **Suspicious Activity Detection**: Automatic detection of unusual patterns
- **Multi-Channel Alerts**: Email, SMS, and in-app notifications
- **Audit Trail**: Complete logging of all lock-related activities

## **🚀 Usage Instructions**

### **For Administrators**

#### **Triggering Emergency Lock**
1. **Access Admin Panel**: Navigate to the emergency lock section
2. **Click SOS Button**: Press the emergency lock button
3. **Provide Details**: Enter lock reason and description
4. **Configure Settings**: Set partial access and emergency contacts
5. **Confirm Lock**: System will be locked immediately

#### **System Recovery**
1. **Obtain Customer Key**: Use the key provided during installation
2. **Contact Etelios Support**: Request the developer recovery key
3. **Enter Both Keys**: Provide both keys in the recovery form
4. **System Unlock**: System will be unlocked upon successful validation

### **For End Users**

#### **When System is Locked**
1. **See Lock Message**: Custom message explaining the situation
2. **Contact Administrator**: Reach out to your system administrator
3. **Wait for Recovery**: System will be unlocked by authorized personnel
4. **Resume Work**: Continue normal operations once unlocked

## **⚙️ Configuration**

### **Environment Variables**
```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@etelios.com

# Monitoring Configuration
LOCK_MONITORING_INTERVAL=300000  # 5 minutes
LOCK_ALERT_INTERVAL=3600000     # 1 hour
MAX_LOCK_DURATION=86400000      # 24 hours
MAX_RECOVERY_ATTEMPTS=5

# Key Management
KEY_ROTATION_INTERVAL=86400000  # 24 hours
MAX_KEY_AGE=604800000          # 7 days
```

### **Lock Configuration Options**
```javascript
{
  "allowPartialAccess": false,           // Allow limited module access
  "allowedModules": ["auth", "health"],  // Modules accessible during lock
  "customLockMessage": "Custom message",  // Custom lock message
  "showRecoveryForm": true,              // Show recovery form to users
  "maxRecoveryAttempts": 5,              // Maximum recovery attempts
  "lockTimeout": 86400000                // Lock timeout (24 hours)
}
```

## **🧪 Testing**

### **Run Emergency Lock Tests**
```bash
# Test the complete emergency lock system
npm run test:emergency-lock

# Test specific components
node test-emergency-lock-system.js
```

### **Test Scenarios**
1. **Service Health Check**: Verify service is running
2. **Initial Lock Status**: Confirm system is unlocked
3. **SOS Lock Trigger**: Test emergency lock activation
4. **Lock Status Verification**: Confirm system is locked
5. **Recovery Instructions**: Test instruction retrieval
6. **Invalid Key Testing**: Test with incorrect keys
7. **Valid Key Testing**: Test with correct keys
8. **System Unlock**: Verify successful recovery
9. **Post-Recovery Status**: Confirm system is operational
10. **Emergency Support**: Test support contact functionality

## **📊 Monitoring & Analytics**

### **Lock Statistics**
- **Active Locks**: Number of currently active locks
- **Recovery Success Rate**: Percentage of successful recoveries
- **Average Lock Duration**: Mean time locks remain active
- **Recovery Attempts**: Number of recovery attempts per lock

### **Security Metrics**
- **Suspicious Activity**: Detection of unusual patterns
- **Failed Recovery Attempts**: Tracking of invalid key attempts
- **IP Address Tracking**: Monitoring of recovery attempt sources
- **Alert Response Times**: Time to respond to emergency alerts

## **🔧 Troubleshooting**

### **Common Issues**

#### **Lock Not Triggering**
- **Check Permissions**: Ensure user has admin or store manager role
- **Verify Service**: Confirm auth service is running
- **Check Database**: Verify MongoDB connection is active

#### **Recovery Keys Not Working**
- **Key Format**: Ensure keys are 32-character hexadecimal strings
- **Key Validity**: Check if keys have expired or been deactivated
- **Case Sensitivity**: Keys are case-insensitive but must be exact

#### **Monitoring Not Working**
- **Service Status**: Verify monitoring service is started
- **Email Configuration**: Check SMTP settings
- **Database Connection**: Ensure MongoDB is accessible

### **Error Codes**
- **SYSTEM_LOCKED**: System is currently locked
- **INSUFFICIENT_PERMISSIONS**: User lacks required permissions
- **LOCK_NOT_FOUND**: Specified lock ID not found
- **INVALID_KEYS**: Recovery keys are invalid
- **MAX_ATTEMPTS_EXCEEDED**: Too many recovery attempts
- **KEYS_EXPIRED**: Recovery keys have expired

## **📞 Support**

### **Emergency Contacts**
- **Email**: emergency@etelios.com
- **Phone**: +1-800-ETELIOS
- **24/7 Support**: Available around the clock
- **Critical Issues**: Immediate escalation for urgent problems

### **Documentation**
- **API Reference**: Complete API documentation
- **User Guide**: Step-by-step user instructions
- **Admin Guide**: Administrator configuration guide
- **Troubleshooting**: Common issues and solutions

## **🔄 Maintenance**

### **Regular Tasks**
- **Key Rotation**: Automatic key rotation every 24 hours
- **Cleanup Expired Keys**: Remove expired keys from storage
- **Monitor Alerts**: Review and respond to monitoring alerts
- **Update Emergency Contacts**: Keep contact information current

### **Backup & Recovery**
- **Key Backup**: Regular backup of recovery keys
- **Database Backup**: Backup of lock history and audit logs
- **Configuration Backup**: Backup of system configuration
- **Disaster Recovery**: Complete system recovery procedures

---

**🚨 The Emergency Lock System is a critical security feature. Ensure all administrators understand its operation and have access to recovery procedures.**

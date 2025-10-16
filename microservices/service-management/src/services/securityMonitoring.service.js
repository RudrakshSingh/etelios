const logger = require('../config/logger');
const securityConfig = require('../config/security.config');

class SecurityMonitoringService {
  constructor() {
    this.suspiciousIPs = new Map();
    this.failedLoginAttempts = new Map();
    this.anomalyThresholds = {
      failedLogins: 5,
      suspiciousIPs: 3,
      dataAccessAnomalies: 10,
      requestFrequency: 100
    };
    this.alertThresholds = {
      critical: 10,
      warning: 5,
      info: 3
    };
  }

  // Monitor failed login attempts
  monitorFailedLogin(userId, ip, userAgent) {
    const key = `${ip}_${userId}`;
    const attempts = this.failedLoginAttempts.get(key) || 0;
    this.failedLoginAttempts.set(key, attempts + 1);

    if (attempts + 1 >= this.anomalyThresholds.failedLogins) {
      this.triggerAlert('brute_force_attempt', {
        userId,
        ip,
        userAgent,
        attempts: attempts + 1,
        severity: 'critical'
      });
    }

    logger.warn('Failed login attempt detected', {
      userId,
      ip,
      userAgent,
      attempts: attempts + 1
    });
  }

  // Monitor suspicious IPs
  monitorSuspiciousIP(ip, reason, details = {}) {
    const suspiciousData = this.suspiciousIPs.get(ip) || {
      count: 0,
      reasons: [],
      firstSeen: new Date(),
      lastSeen: new Date()
    };

    suspiciousData.count += 1;
    suspiciousData.reasons.push(reason);
    suspiciousData.lastSeen = new Date();

    this.suspiciousIPs.set(ip, suspiciousData);

    if (suspiciousData.count >= this.anomalyThresholds.suspiciousIPs) {
      this.triggerAlert('suspicious_ip', {
        ip,
        count: suspiciousData.count,
        reasons: suspiciousData.reasons,
        details,
        severity: 'warning'
      });
    }

    logger.warn('Suspicious IP detected', {
      ip,
      reason,
      count: suspiciousData.count,
      details
    });
  }

  // Monitor data access patterns
  monitorDataAccess(userId, resource, action, metadata = {}) {
    const key = `${userId}_${resource}`;
    const accessData = this.dataAccessPatterns?.get(key) || {
      count: 0,
      actions: [],
      firstAccess: new Date(),
      lastAccess: new Date()
    };

    accessData.count += 1;
    accessData.actions.push(action);
    accessData.lastAccess = new Date();

    if (!this.dataAccessPatterns) {
      this.dataAccessPatterns = new Map();
    }
    this.dataAccessPatterns.set(key, accessData);

    // Check for unusual access patterns
    if (accessData.count > this.anomalyThresholds.dataAccessAnomalies) {
      this.triggerAlert('unusual_data_access', {
        userId,
        resource,
        action,
        count: accessData.count,
        metadata,
        severity: 'warning'
      });
    }

    logger.info('Data access monitored', {
      userId,
      resource,
      action,
      count: accessData.count,
      metadata
    });
  }

  // Monitor request frequency
  monitorRequestFrequency(ip, endpoint, method) {
    const key = `${ip}_${endpoint}_${method}`;
    const requestData = this.requestFrequency?.get(key) || {
      count: 0,
      firstRequest: new Date(),
      lastRequest: new Date()
    };

    requestData.count += 1;
    requestData.lastRequest = new Date();

    if (!this.requestFrequency) {
      this.requestFrequency = new Map();
    }
    this.requestFrequency.set(key, requestData);

    // Check for high frequency requests
    const timeDiff = requestData.lastRequest - requestData.firstRequest;
    const requestsPerMinute = (requestData.count / timeDiff) * 60000;

    if (requestsPerMinute > this.anomalyThresholds.requestFrequency) {
      this.triggerAlert('high_frequency_requests', {
        ip,
        endpoint,
        method,
        requestsPerMinute,
        severity: 'warning'
      });
    }
  }

  // Detect intrusion attempts
  detectIntrusion(req, res, next) {
    const ip = req.ip;
    const userAgent = req.get('User-Agent');
    const endpoint = req.path;
    const method = req.method;

    // Check for common attack patterns
    const attackPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(\b(OR|AND)\s+['"]\s*=\s*['"])/i,
      /(\b(OR|AND)\s+['"]\s*LIKE\s*['"])/i,
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /eval\s*\(/gi,
      /expression\s*\(/gi
    ];

    const checkForAttacks = (obj) => {
      if (typeof obj === 'string') {
        for (const pattern of attackPatterns) {
          if (pattern.test(obj)) {
            return true;
          }
        }
      } else if (typeof obj === 'object' && obj !== null) {
        for (const key in obj) {
          if (obj.hasOwnProperty(key) && checkForAttacks(obj[key])) {
            return true;
          }
        }
      }
      return false;
    };

    if (checkForAttacks(req.body) || checkForAttacks(req.query) || checkForAttacks(req.params)) {
      this.triggerAlert('intrusion_attempt', {
        ip,
        userAgent,
        endpoint,
        method,
        severity: 'critical'
      });

      logger.error('Intrusion attempt detected', {
        ip,
        userAgent,
        endpoint,
        method,
        body: req.body,
        query: req.query,
        params: req.params
      });

      return res.status(403).json({
        success: false,
        message: 'Access denied - suspicious activity detected'
      });
    }

    next();
  }

  // Detect anomalies in user behavior
  detectAnomalies(userId, action, metadata = {}) {
    const userBehavior = this.userBehaviorPatterns?.get(userId) || {
      actions: [],
      loginTimes: [],
      ipAddresses: [],
      userAgents: []
    };

    userBehavior.actions.push({
      action,
      timestamp: new Date(),
      metadata
    });

    if (!this.userBehaviorPatterns) {
      this.userBehaviorPatterns = new Map();
    }
    this.userBehaviorPatterns.set(userId, userBehavior);

    // Check for unusual login times
    if (action === 'login') {
      const loginTime = new Date();
      const hour = loginTime.getHours();
      
      if (hour < 6 || hour > 22) {
        this.triggerAlert('unusual_login_time', {
          userId,
          loginTime: hour,
          severity: 'info'
        });
      }
    }

    // Check for multiple IP addresses
    if (metadata.ip && !userBehavior.ipAddresses.includes(metadata.ip)) {
      userBehavior.ipAddresses.push(metadata.ip);
      
      if (userBehavior.ipAddresses.length > 3) {
        this.triggerAlert('multiple_ip_addresses', {
          userId,
          ipAddresses: userBehavior.ipAddresses,
          severity: 'warning'
        });
      }
    }
  }

  // Trigger security alerts
  triggerAlert(type, data) {
    const alert = {
      type,
      data,
      timestamp: new Date(),
      severity: data.severity || 'info'
    };

    // Log the alert
    logger.error('Security alert triggered', alert);

    // Send to monitoring system
    this.sendToMonitoringSystem(alert);

    // Send notifications if critical
    if (data.severity === 'critical') {
      this.sendCriticalAlert(alert);
    }
  }

  // Send to monitoring system
  sendToMonitoringSystem(alert) {
    // Implementation for sending to external monitoring systems
    // This could be integrated with services like DataDog, New Relic, etc.
    logger.info('Alert sent to monitoring system', { alert });
  }

  // Send critical alerts
  sendCriticalAlert(alert) {
    // Implementation for sending critical alerts
    // This could be integrated with email, SMS, Slack, etc.
    logger.error('Critical security alert', { alert });
  }

  // Generate security report
  generateSecurityReport() {
    const report = {
      timestamp: new Date().toISOString(),
      suspiciousIPs: Array.from(this.suspiciousIPs.entries()),
      failedLoginAttempts: Array.from(this.failedLoginAttempts.entries()),
      dataAccessPatterns: this.dataAccessPatterns ? Array.from(this.dataAccessPatterns.entries()) : [],
      requestFrequency: this.requestFrequency ? Array.from(this.requestFrequency.entries()) : [],
      userBehaviorPatterns: this.userBehaviorPatterns ? Array.from(this.userBehaviorPatterns.entries()) : [],
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  // Generate security recommendations
  generateRecommendations() {
    const recommendations = [];

    // Check for high number of suspicious IPs
    if (this.suspiciousIPs.size > 10) {
      recommendations.push('Consider implementing IP blacklisting for suspicious IPs');
    }

    // Check for high number of failed login attempts
    if (this.failedLoginAttempts.size > 20) {
      recommendations.push('Consider implementing account lockout policies');
    }

    // Check for unusual data access patterns
    if (this.dataAccessPatterns && this.dataAccessPatterns.size > 50) {
      recommendations.push('Review data access patterns for potential security issues');
    }

    return recommendations;
  }

  // Clear old data
  clearOldData() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Clear old failed login attempts
    for (const [key, data] of this.failedLoginAttempts.entries()) {
      if (data.timestamp && data.timestamp < oneHourAgo) {
        this.failedLoginAttempts.delete(key);
      }
    }

    // Clear old suspicious IPs
    for (const [ip, data] of this.suspiciousIPs.entries()) {
      if (data.lastSeen < oneHourAgo) {
        this.suspiciousIPs.delete(ip);
      }
    }
  }

  // Get security metrics
  getSecurityMetrics() {
    return {
      suspiciousIPs: this.suspiciousIPs.size,
      failedLoginAttempts: this.failedLoginAttempts.size,
      dataAccessPatterns: this.dataAccessPatterns?.size || 0,
      requestFrequency: this.requestFrequency?.size || 0,
      userBehaviorPatterns: this.userBehaviorPatterns?.size || 0
    };
  }
}

// Create singleton instance
const securityMonitoringService = new SecurityMonitoringService();

// Clear old data every hour
setInterval(() => {
  securityMonitoringService.clearOldData();
}, 60 * 60 * 1000);

module.exports = securityMonitoringService;

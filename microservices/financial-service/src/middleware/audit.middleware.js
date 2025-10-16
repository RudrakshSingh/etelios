const AuditLog = require('../models/AuditLog.model');
const logger = require('../config/logger');

// Enhanced audit logging middleware
const auditLogger = (action, resource, additionalData = {}) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.send;
    
    // Capture response data
    let responseData = null;
    res.send = function(data) {
      responseData = data;
      return originalSend.call(this, data);
    };

    res.on('finish', async () => {
      try {
        const duration = Date.now() - startTime;
        const userId = req.user?.id || null;
        const userRole = req.user?.role || null;
        const employeeId = req.user?.employeeId || null;
        
        // Create audit log entry
        const auditEntry = {
          action,
          resource,
          userId,
          userRole,
          employeeId,
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          requestBody: sanitizeRequestBody(req.body),
          queryParams: sanitizeQueryParams(req.query),
          responseData: sanitizeResponseData(responseData),
          additionalData,
          timestamp: new Date(),
          sessionId: req.sessionID,
          referer: req.get('Referer'),
          origin: req.get('Origin')
        };

        // Save to database
        await AuditLog.create(auditEntry);
        
        // Log security events
        if (res.statusCode >= 400) {
          logger.warn('Security event detected', {
            action,
            resource,
            userId,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            statusCode: res.statusCode,
            url: req.url,
            method: req.method
          });
        }

        // Log critical security events
        if (isCriticalSecurityEvent(action, res.statusCode)) {
          logger.error('Critical security event', auditEntry);
        }

      } catch (error) {
        logger.error('Audit logging failed', { error: error.message });
      }
    });

    next();
  };
};

// Sanitize request body for audit logging
const sanitizeRequestBody = (body) => {
  if (!body) return null;
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'ssn', 'bankAccount', 'creditCard', 'personalInfo', 'token'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
};

// Sanitize query parameters for audit logging
const sanitizeQueryParams = (query) => {
  if (!query) return null;
  
  const sanitized = { ...query };
  const sensitiveFields = ['password', 'token', 'key'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
};

// Sanitize response data for audit logging
const sanitizeResponseData = (data) => {
  if (!data) return null;
  
  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    const sanitized = { ...parsed };
    
    const sensitiveFields = ['password', 'ssn', 'bankAccount', 'creditCard', 'personalInfo', 'token'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  } catch (error) {
    return '[REDACTED]';
  }
};

// Check if event is critical security event
const isCriticalSecurityEvent = (action, statusCode) => {
  const criticalActions = [
    'failed_login',
    'unauthorized_access',
    'privilege_escalation',
    'data_breach',
    'suspicious_activity'
  ];
  
  const criticalStatusCodes = [401, 403, 429, 500];
  
  return criticalActions.includes(action) || criticalStatusCodes.includes(statusCode);
};

// Authentication audit logger
const authAuditLogger = (req, res, next) => {
  return auditLogger('authentication', 'auth')(req, res, next);
};

// Authorization audit logger
const authzAuditLogger = (req, res, next) => {
  return auditLogger('authorization', 'access_control')(req, res, next);
};

// Data access audit logger
const dataAccessAuditLogger = (req, res, next) => {
  return auditLogger('data_access', 'data')(req, res, next);
};

// File operation audit logger
const fileOperationAuditLogger = (req, res, next) => {
  return auditLogger('file_operation', 'files')(req, res, next);
};

// Admin operation audit logger
const adminOperationAuditLogger = (req, res, next) => {
  return auditLogger('admin_operation', 'administration')(req, res, next);
};

// Security event logger
const securityEventLogger = (event, details = {}) => {
  logger.error('Security event', {
    event,
    details,
    timestamp: new Date().toISOString()
  });
};

// Failed login attempt logger
const failedLoginLogger = (req, res, next) => {
  return auditLogger('failed_login', 'authentication', {
    reason: 'invalid_credentials',
    attemptCount: req.session?.loginAttempts || 1
  })(req, res, next);
};

// Successful login logger
const successfulLoginLogger = (req, res, next) => {
  return auditLogger('successful_login', 'authentication', {
    loginMethod: req.body.email ? 'email' : 'employee_id',
    userAgent: req.get('User-Agent')
  })(req, res, next);
};

// Logout logger
const logoutLogger = (req, res, next) => {
  return auditLogger('logout', 'authentication', {
    sessionDuration: req.session?.loginTime ? Date.now() - req.session.loginTime : null
  })(req, res, next);
};

// Password change logger
const passwordChangeLogger = (req, res, next) => {
  return auditLogger('password_change', 'authentication', {
    userId: req.user?.id,
    employeeId: req.user?.employeeId
  })(req, res, next);
};

// Permission change logger
const permissionChangeLogger = (req, res, next) => {
  return auditLogger('permission_change', 'authorization', {
    targetUserId: req.params.userId,
    newPermissions: req.body.permissions,
    changedBy: req.user?.id
  })(req, res, next);
};

// Data export logger
const dataExportLogger = (req, res, next) => {
  return auditLogger('data_export', 'data', {
    exportType: req.body.exportType,
    recordCount: req.body.recordCount,
    format: req.body.format
  })(req, res, next);
};

// System configuration change logger
const systemConfigChangeLogger = (req, res, next) => {
  return auditLogger('system_config_change', 'administration', {
    configType: req.body.configType,
    oldValue: req.body.oldValue,
    newValue: req.body.newValue,
    changedBy: req.user?.id
  })(req, res, next);
};

// Audit log query middleware
const auditLogQuery = async (req, res, next) => {
  try {
    const { action, resource, userId, startDate, endDate, limit = 100, page = 1 } = req.query;
    
    const query = {};
    
    if (action) query.action = action;
    if (resource) query.resource = resource;
    if (userId) query.userId = userId;
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    const skip = (page - 1) * limit;
    
    const auditLogs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-requestBody -responseData'); // Exclude sensitive data
    
    const total = await AuditLog.countDocuments(query);
    
    res.json({
      success: true,
      data: auditLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    logger.error('Audit log query failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit logs'
    });
  }
};

// Security metrics middleware
const securityMetrics = async (req, res, next) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const metrics = await AuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: last7Days }
        }
      },
      {
        $group: {
          _id: {
            action: '$action',
            statusCode: '$statusCode'
          },
          count: { $sum: 1 },
          avgDuration: { $avg: '$duration' }
        }
      },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: '$count' },
          failedLogins: {
            $sum: {
              $cond: [
                { $eq: ['$_id.action', 'failed_login'] },
                '$count',
                0
              ]
            }
          },
          unauthorizedAccess: {
            $sum: {
              $cond: [
                { $eq: ['$_id.statusCode', 401] },
                '$count',
                0
              ]
            }
          },
          forbiddenAccess: {
            $sum: {
              $cond: [
                { $eq: ['$_id.statusCode', 403] },
                '$count',
                0
              ]
            }
          },
          rateLimitExceeded: {
            $sum: {
              $cond: [
                { $eq: ['$_id.statusCode', 429] },
                '$count',
                0
              ]
            }
          }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: metrics[0] || {
        totalEvents: 0,
        failedLogins: 0,
        unauthorizedAccess: 0,
        forbiddenAccess: 0,
        rateLimitExceeded: 0
      }
    });
    
  } catch (error) {
    logger.error('Security metrics failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve security metrics'
    });
  }
};

module.exports = {
  auditLogger,
  authAuditLogger,
  authzAuditLogger,
  dataAccessAuditLogger,
  fileOperationAuditLogger,
  adminOperationAuditLogger,
  securityEventLogger,
  failedLoginLogger,
  successfulLoginLogger,
  logoutLogger,
  passwordChangeLogger,
  permissionChangeLogger,
  dataExportLogger,
  systemConfigChangeLogger,
  auditLogQuery,
  securityMetrics
};

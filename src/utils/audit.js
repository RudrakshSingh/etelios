const logger = require('./logger');

class AuditService {
  constructor() {
    this.isEnabled = process.env.AUDIT_ENABLED !== 'false';
  }

  async recordAuditLog(action, userId, resource, details = {}) {
    if (!this.isEnabled) {
      return { success: true, message: 'Audit logging disabled' };
    }

    try {
      const auditEntry = {
        timestamp: new Date(),
        action,
        userId,
        resource,
        details,
        ipAddress: details.ipAddress || 'unknown',
        userAgent: details.userAgent || 'unknown'
      };

      // Log to console/file
      logger.info('Audit Log:', auditEntry);

      // In a real implementation, you would save this to a database
      // await AuditLog.create(auditEntry);

      return { success: true, auditId: `audit_${Date.now()}` };
    } catch (error) {
      logger.error('Failed to record audit log:', error);
      return { success: false, error: error.message };
    }
  }

  async recordLogin(userId, success, details = {}) {
    return this.recordAuditLog(
      success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
      userId,
      'authentication',
      { ...details, success }
    );
  }

  async recordLogout(userId, details = {}) {
    return this.recordAuditLog('LOGOUT', userId, 'authentication', details);
  }

  async recordDataAccess(userId, resource, action, details = {}) {
    return this.recordAuditLog(
      `DATA_${action.toUpperCase()}`,
      userId,
      resource,
      details
    );
  }

  async recordSystemEvent(event, details = {}) {
    return this.recordAuditLog(
      `SYSTEM_${event.toUpperCase()}`,
      'system',
      'system',
      details
    );
  }
}

// Create singleton instance
const auditService = new AuditService();

module.exports = {
  auditService,
  recordAuditLog: (action, userId, resource, details) => 
    auditService.recordAuditLog(action, userId, resource, details),
  recordLogin: (userId, success, details) => 
    auditService.recordLogin(userId, success, details),
  recordLogout: (userId, details) => 
    auditService.recordLogout(userId, details),
  recordDataAccess: (userId, resource, action, details) => 
    auditService.recordDataAccess(userId, resource, action, details),
  recordSystemEvent: (event, details) => 
    auditService.recordSystemEvent(event, details)
};

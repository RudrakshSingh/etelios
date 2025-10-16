const logger = require('../config/logger');

/**
 * Audit logging utility
 * Logs all important actions for compliance and security
 */

/**
 * Log audit event
 * @param {object} event - Audit event details
 * @param {string} event.action - Action performed
 * @param {string} event.resource - Resource affected
 * @param {string} event.userId - User who performed the action
 * @param {object} event.details - Additional details
 * @param {string} event.ip - IP address
 * @param {string} event.userAgent - User agent
 * @returns {void}
 */
function logAuditEvent(event) {
  try {
    const {
      action,
      resource,
      userId,
      details = {},
      ip,
      userAgent,
      timestamp = new Date().toISOString()
    } = event;

    if (!action || !resource || !userId) {
      throw new Error('Missing required audit event fields');
    }

    const auditLog = {
      timestamp,
      action,
      resource,
      userId,
      details,
      ip,
      userAgent,
      level: 'audit'
    };

    // Log to Winston with audit level
    logger.info('Audit event', auditLog);

  } catch (error) {
    logger.error('Error logging audit event', { 
      error: error.message,
      event
    });
  }
}

/**
 * Log user authentication events
 * @param {string} action - Authentication action (login, logout, failed_login)
 * @param {string} userId - User ID
 * @param {object} details - Additional details
 * @param {string} ip - IP address
 * @param {string} userAgent - User agent
 * @returns {void}
 */
function logAuthEvent(action, userId, details = {}, ip, userAgent) {
  logAuditEvent({
    action,
    resource: 'authentication',
    userId,
    details,
    ip,
    userAgent
  });
}

/**
 * Log user management events
 * @param {string} action - Action performed (create, update, delete, activate, deactivate)
 * @param {string} userId - User who performed the action
 * @param {string} targetUserId - Target user ID
 * @param {object} details - Additional details
 * @param {string} ip - IP address
 * @param {string} userAgent - User agent
 * @returns {void}
 */
function logUserManagementEvent(action, userId, targetUserId, details = {}, ip, userAgent) {
  logAuditEvent({
    action,
    resource: 'user_management',
    userId,
    details: {
      targetUserId,
      ...details
    },
    ip,
    userAgent
  });
}

/**
 * Log attendance events
 * @param {string} action - Action performed (checkin, checkout, edit, approve)
 * @param {string} userId - User who performed the action
 * @param {string} attendanceId - Attendance record ID
 * @param {object} details - Additional details
 * @param {string} ip - IP address
 * @param {string} userAgent - User agent
 * @returns {void}
 */
function logAttendanceEvent(action, userId, attendanceId, details = {}, ip, userAgent) {
  logAuditEvent({
    action,
    resource: 'attendance',
    userId,
    details: {
      attendanceId,
      ...details
    },
    ip,
    userAgent
  });
}

/**
 * Log transfer events
 * @param {string} action - Action performed (create, approve, reject, cancel)
 * @param {string} userId - User who performed the action
 * @param {string} transferId - Transfer request ID
 * @param {object} details - Additional details
 * @param {string} ip - IP address
 * @param {string} userAgent - User agent
 * @returns {void}
 */
function logTransferEvent(action, userId, transferId, details = {}, ip, userAgent) {
  logAuditEvent({
    action,
    resource: 'transfer',
    userId,
    details: {
      transferId,
      ...details
    },
    ip,
    userAgent
  });
}

/**
 * Log asset management events
 * @param {string} action - Action performed (assign, return, update, delete)
 * @param {string} userId - User who performed the action
 * @param {string} assetId - Asset ID
 * @param {object} details - Additional details
 * @param {string} ip - IP address
 * @param {string} userAgent - User agent
 * @returns {void}
 */
function logAssetEvent(action, userId, assetId, details = {}, ip, userAgent) {
  logAuditEvent({
    action,
    resource: 'asset',
    userId,
    details: {
      assetId,
      ...details
    },
    ip,
    userAgent
  });
}

/**
 * Log document events
 * @param {string} action - Action performed (upload, download, delete, update)
 * @param {string} userId - User who performed the action
 * @param {string} documentId - Document ID
 * @param {object} details - Additional details
 * @param {string} ip - IP address
 * @param {string} userAgent - User agent
 * @returns {void}
 */
function logDocumentEvent(action, userId, documentId, details = {}, ip, userAgent) {
  logAuditEvent({
    action,
    resource: 'document',
    userId,
    details: {
      documentId,
      ...details
    },
    ip,
    userAgent
  });
}

/**
 * Log role and permission events
 * @param {string} action - Action performed (assign, revoke, update)
 * @param {string} userId - User who performed the action
 * @param {string} targetUserId - Target user ID
 * @param {object} details - Additional details
 * @param {string} ip - IP address
 * @param {string} userAgent - User agent
 * @returns {void}
 */
function logRoleEvent(action, userId, targetUserId, details = {}, ip, userAgent) {
  logAuditEvent({
    action,
    resource: 'role_permission',
    userId,
    details: {
      targetUserId,
      ...details
    },
    ip,
    userAgent
  });
}

/**
 * Log system events
 * @param {string} action - Action performed (startup, shutdown, error, maintenance)
 * @param {string} userId - User who performed the action (system for automated events)
 * @param {object} details - Additional details
 * @param {string} ip - IP address
 * @param {string} userAgent - User agent
 * @returns {void}
 */
function logSystemEvent(action, userId = 'system', details = {}, ip, userAgent) {
  logAuditEvent({
    action,
    resource: 'system',
    userId,
    details,
    ip,
    userAgent
  });
}

/**
 * Log data access events
 * @param {string} action - Action performed (view, export, report)
 * @param {string} userId - User who performed the action
 * @param {string} resource - Resource accessed
 * @param {object} details - Additional details
 * @param {string} ip - IP address
 * @param {string} userAgent - User agent
 * @returns {void}
 */
function logDataAccessEvent(action, userId, resource, details = {}, ip, userAgent) {
  logAuditEvent({
    action,
    resource: `data_access_${resource}`,
    userId,
    details,
    ip,
    userAgent
  });
}

/**
 * Create audit middleware for Express routes
 * @param {string} action - Action to log
 * @param {string} resource - Resource being accessed
 * @returns {function} Express middleware
 */
function createAuditMiddleware(action, resource) {
  return (req, res, next) => {
    // Log the audit event
    logAuditEvent({
      action,
      resource,
      userId: req.user?.id || 'anonymous',
      details: {
        method: req.method,
        path: req.originalUrl,
        params: req.params,
        query: req.query
      },
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    next();
  };
}

module.exports = {
  logAuditEvent,
  logAuthEvent,
  logUserManagementEvent,
  logAttendanceEvent,
  logTransferEvent,
  logAssetEvent,
  logDocumentEvent,
  logRoleEvent,
  logSystemEvent,
  logDataAccessEvent,
  createAuditMiddleware
};

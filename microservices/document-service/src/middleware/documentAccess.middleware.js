const Document = require('../models/Document.model');
const AuditLog = require('../models/AuditLog.model');
const logger = require('../config/logger');

/**
 * Middleware to check document access permissions
 */
const checkDocumentAccess = (requiredPermission = 'read') => {
  return async (req, res, next) => {
    try {
      const { documentId } = req.params;
      const user = req.user;
      
      if (!documentId) {
        return res.status(400).json({
          success: false,
          message: 'Document ID is required'
        });
      }

      // Find the document
      const document = await Document.findById(documentId)
        .populate('employee', 'name email employee_id department role')
        .populate('created_by', 'name email role');

      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      // Check if document is deleted
      if (document.is_deleted) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      // Check access permissions
      const hasAccess = await checkAccessPermission(document, user, requiredPermission);
      
      if (!hasAccess) {
        // Log unauthorized access attempt
        await AuditLog.logAction({
          document: document._id,
          document_id: document.document_id,
          user: user._id,
          user_id: user.employee_id,
          user_name: user.name,
          user_email: user.email,
          user_role: user.role,
          action: 'unauthorized_access_attempt',
          action_description: `Unauthorized attempt to ${requiredPermission} document`,
          document_title: document.title,
          document_type: document.document_type,
          document_status: document.status,
          document_version: document.version,
          employee: document.employee._id,
          employee_id: document.employee.employee_id,
          employee_name: document.employee.name,
          employee_email: document.employee.email,
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          metadata: {
            required_permission: requiredPermission,
            access_denied: true
          }
        });

        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not have permission to access this document.'
        });
      }

      // Attach document to request for use in controllers
      req.document = document;
      
      // Log successful access
      await AuditLog.logAction({
        document: document._id,
        document_id: document.document_id,
        user: user._id,
        user_id: user.employee_id,
        user_name: user.name,
        user_email: user.email,
        user_role: user.role,
        action: requiredPermission,
        action_description: `Document ${requiredPermission} access granted`,
        document_title: document.title,
        document_type: document.document_type,
        document_status: document.status,
        document_version: document.version,
        employee: document.employee._id,
        employee_id: document.employee.employee_id,
        employee_name: document.employee.name,
        employee_email: document.employee.email,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        metadata: {
          permission: requiredPermission,
          access_granted: true
        }
      });

      next();
    } catch (error) {
      logger.error('Document access check failed', { 
        error: error.message, 
        documentId: req.params.documentId,
        userId: req.user?._id 
      });
      next(error);
    }
  };
};

/**
 * Check if user has specific permission for document
 */
const checkAccessPermission = async (document, user, permission) => {
  try {
    // Super Admin has full access
    if (user.role === 'admin') {
      return true;
    }

    // HR has full access to all documents
    if (user.role === 'hr') {
      return true;
    }

    // Employee can access their own documents
    if (document.employee._id.toString() === user._id.toString()) {
      return checkEmployeePermission(document, user, permission);
    }

    // Manager can access team member documents (limited permissions)
    if (user.role === 'manager') {
      return checkManagerPermission(document, user, permission);
    }

    // Check role-based access
    if (document.role_access && document.role_access.length > 0) {
      if (document.role_access.includes(user.role)) {
        return checkRoleBasedPermission(document, user, permission);
      }
    }

    // Check department-based access
    if (document.department_access && document.department_access.length > 0) {
      if (document.department_access.includes(user.department)) {
        return checkDepartmentBasedPermission(document, user, permission);
      }
    }

    return false;
  } catch (error) {
    logger.error('Permission check failed', { error: error.message });
    return false;
  }
};

/**
 * Check employee permissions for their own documents
 */
const checkEmployeePermission = (document, user, permission) => {
  switch (permission) {
    case 'read':
    case 'download':
      return true;
    case 'sign':
      return document.signature_required && !document.is_signed;
    case 'update':
      return false; // Employees cannot update their documents
    case 'delete':
      return false; // Employees cannot delete documents
    case 'approve':
      return false; // Employees cannot approve documents
    default:
      return false;
  }
};

/**
 * Check manager permissions
 */
const checkManagerPermission = (document, user, permission) => {
  // Managers can only see acknowledgment status, not document content
  switch (permission) {
    case 'read':
      return false; // Managers cannot read document content
    case 'status':
      return true; // Managers can see status
    case 'approve':
      return document.workflow_assignee && document.workflow_assignee.toString() === user._id.toString();
    default:
      return false;
  }
};

/**
 * Check role-based permissions
 */
const checkRoleBasedPermission = (document, user, permission) => {
  switch (user.role) {
    case 'hr':
    case 'admin':
      return true;
    case 'manager':
      return ['read', 'status', 'approve'].includes(permission);
    case 'employee':
      return ['read', 'download', 'sign'].includes(permission);
    default:
      return false;
  }
};

/**
 * Check department-based permissions
 */
const checkDepartmentBasedPermission = (document, user, permission) => {
  // Department access is more restrictive
  switch (permission) {
    case 'read':
    case 'download':
      return document.access_level !== 'secret';
    case 'sign':
      return document.signature_required && !document.is_signed;
    default:
      return false;
  }
};

/**
 * Middleware to check document creation permissions
 */
const checkDocumentCreationPermission = (req, res, next) => {
  const user = req.user;
  
  // Only HR and Admin can create documents
  if (!['hr', 'admin'].includes(user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only HR and Admin can create documents.'
    });
  }

  next();
};

/**
 * Middleware to check document update permissions
 */
const checkDocumentUpdatePermission = (req, res, next) => {
  const user = req.user;
  
  // Only HR and Admin can update documents
  if (!['hr', 'admin'].includes(user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only HR and Admin can update documents.'
    });
  }

  next();
};

/**
 * Middleware to check document deletion permissions
 */
const checkDocumentDeletionPermission = (req, res, next) => {
  const user = req.user;
  
  // Only Admin can delete documents
  if (user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only Admin can delete documents.'
    });
  }

  next();
};

/**
 * Middleware to check signature permissions
 */
const checkSignaturePermission = (req, res, next) => {
  const user = req.user;
  const document = req.document;
  
  // Check if user can sign this document
  if (!document.canSign(user)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You cannot sign this document.'
    });
  }

  next();
};

/**
 * Middleware to check compliance access
 */
const checkComplianceAccess = (req, res, next) => {
  const user = req.user;
  
  // Only HR, Admin, and Managers can access compliance reports
  if (!['hr', 'admin', 'manager'].includes(user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not have permission to access compliance information.'
    });
  }

  next();
};

/**
 * Middleware to check audit log access
 */
const checkAuditLogAccess = (req, res, next) => {
  const user = req.user;
  
  // Only HR and Admin can access audit logs
  if (!['hr', 'admin'].includes(user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not have permission to access audit logs.'
    });
  }

  next();
};

/**
 * Middleware to check document sharing permissions
 */
const checkDocumentSharingPermission = (req, res, next) => {
  const user = req.user;
  const document = req.document;
  
  // Check if document can be shared
  if (document.access_level === 'secret') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. This document cannot be shared.'
    });
  }

  // Only HR and Admin can share documents
  if (!['hr', 'admin'].includes(user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only HR and Admin can share documents.'
    });
  }

  next();
};

/**
 * Middleware to check document export permissions
 */
const checkDocumentExportPermission = (req, res, next) => {
  const user = req.user;
  
  // Only HR and Admin can export documents
  if (!['hr', 'admin'].includes(user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only HR and Admin can export documents.'
    });
  }

  next();
};

/**
 * Middleware to check workflow permissions
 */
const checkWorkflowPermission = (action) => {
  return (req, res, next) => {
    const user = req.user;
    const document = req.document;
    
    // Check if user can perform workflow action
    switch (action) {
      case 'approve':
        if (document.workflow_assignee && document.workflow_assignee.toString() === user._id.toString()) {
          return next();
        }
        if (['hr', 'admin'].includes(user.role)) {
          return next();
        }
        break;
      case 'reject':
        if (['hr', 'admin'].includes(user.role)) {
          return next();
        }
        break;
      case 'assign':
        if (['hr', 'admin'].includes(user.role)) {
          return next();
        }
        break;
      default:
        break;
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. You cannot ${action} this document.`
    });
  };
};

module.exports = {
  checkDocumentAccess,
  checkDocumentCreationPermission,
  checkDocumentUpdatePermission,
  checkDocumentDeletionPermission,
  checkSignaturePermission,
  checkComplianceAccess,
  checkAuditLogAccess,
  checkDocumentSharingPermission,
  checkDocumentExportPermission,
  checkWorkflowPermission
};

const Document = require('../models/Document.model');
const AuditLog = require('../models/AuditLog.model');
const User = require('../models/User.model');
const storageService = require('../utils/storage');
const logger = require('../config/logger');

class DocumentsService {
  /**
   * Create a new document
   */
  static async createDocument(documentData, user) {
    try {
      const document = new Document(documentData);
      await document.save();

      // Log creation
      await AuditLog.logAction({
        document: document._id,
        document_id: document.document_id,
        user: user._id,
        user_id: user.employee_id,
        user_name: user.name,
        user_email: user.email,
        user_role: user.role,
        action: 'create',
        action_description: `Document created: ${document.title}`,
        document_title: document.title,
        document_type: document.document_type,
        document_status: document.status,
        document_version: document.version,
        employee: document.employee,
        employee_id: document.employee_id,
        ip_address: user.ip_address,
        user_agent: user.user_agent
      });

      return document;
    } catch (error) {
      logger.error('Document creation failed', { error: error.message, documentData });
      throw error;
    }
  }

  /**
   * Get documents with advanced filtering
   */
  static async getDocuments(filters, user, pagination = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        document_type,
        category,
        status,
        employee_id,
        compliance_required,
        signature_required,
        search,
        sort_by = 'created_at',
        sort_order = 'desc',
        date_from,
        date_to
      } = filters;

      // Build query
      const query = { is_deleted: false };

      // Role-based access control
      if (user.role === 'employee') {
        query.employee = user._id;
      } else if (user.role === 'manager') {
        // Get team members
        const teamMembers = await this.getTeamMembers(user._id);
        query.employee = { $in: teamMembers };
      }

      // Apply filters
      if (document_type) query.document_type = document_type;
      if (category) query.category = category;
      if (status) query.status = status;
      if (employee_id) query.employee_id = employee_id;
      if (compliance_required !== undefined) query.compliance_required = compliance_required;
      if (signature_required !== undefined) query.signature_required = signature_required;

      // Date range filtering
      if (date_from || date_to) {
        query.created_at = {};
        if (date_from) query.created_at.$gte = new Date(date_from);
        if (date_to) query.created_at.$lte = new Date(date_to);
      }

      // Search functionality
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { document_id: { $regex: search, $options: 'i' } },
          { employee_id: { $regex: search, $options: 'i' } },
          { 'employee.name': { $regex: search, $options: 'i' } }
        ];
      }

      // Sorting
      const sortOptions = {};
      sortOptions[sort_by] = sort_order === 'desc' ? -1 : 1;

      // Pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Execute query
      const [documents, total] = await Promise.all([
        Document.find(query)
          .populate('employee', 'name email employee_id department')
          .populate('created_by', 'name email')
          .populate('signed_by', 'name email')
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit)),
        Document.countDocuments(query)
      ]);

      return {
        documents,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      };
    } catch (error) {
      logger.error('Get documents failed', { error: error.message, filters });
      throw error;
    }
  }

  /**
   * Get document by ID with access control
   */
  static async getDocumentById(documentId, user) {
    try {
      const document = await Document.findById(documentId)
        .populate('employee', 'name email employee_id department')
        .populate('created_by', 'name email')
        .populate('signed_by', 'name email');

      if (!document || document.is_deleted) {
        throw new Error('Document not found');
      }

      // Check access permissions
      if (!this.canAccessDocument(document, user)) {
        throw new Error('Access denied');
      }

      return document;
    } catch (error) {
      logger.error('Get document by ID failed', { error: error.message, documentId, userId: user._id });
      throw error;
    }
  }

  /**
   * Update document
   */
  static async updateDocument(documentId, updateData, user) {
    try {
      const document = await Document.findById(documentId);
      
      if (!document || document.is_deleted) {
        throw new Error('Document not found');
      }

      // Check permissions
      if (!this.canModifyDocument(document, user)) {
        throw new Error('Access denied');
      }

      // Update document
      Object.assign(document, updateData, {
        updated_by: user._id,
        updated_at: new Date()
      });

      await document.save();

      // Log update
      await AuditLog.logAction({
        document: document._id,
        document_id: document.document_id,
        user: user._id,
        user_id: user.employee_id,
        user_name: user.name,
        user_email: user.email,
        user_role: user.role,
        action: 'update',
        action_description: `Document updated: ${document.title}`,
        document_title: document.title,
        document_type: document.document_type,
        document_status: document.status,
        document_version: document.version,
        employee: document.employee,
        employee_id: document.employee_id,
        ip_address: user.ip_address,
        user_agent: user.user_agent,
        metadata: {
          updated_fields: Object.keys(updateData)
        }
      });

      return document;
    } catch (error) {
      logger.error('Update document failed', { error: error.message, documentId, userId: user._id });
      throw error;
    }
  }

  /**
   * Delete document (soft delete)
   */
  static async deleteDocument(documentId, user) {
    try {
      const document = await Document.findById(documentId);
      
      if (!document || document.is_deleted) {
        throw new Error('Document not found');
      }

      // Check permissions
      if (!this.canModifyDocument(document, user)) {
        throw new Error('Access denied');
      }

      // Soft delete
      document.is_deleted = true;
      document.deleted_by = user._id;
      document.deleted_at = new Date();
      await document.save();

      // Log deletion
      await AuditLog.logAction({
        document: document._id,
        document_id: document.document_id,
        user: user._id,
        user_id: user.employee_id,
        user_name: user.name,
        user_email: user.email,
        user_role: user.role,
        action: 'delete',
        action_description: `Document deleted: ${document.title}`,
        document_title: document.title,
        document_type: document.document_type,
        document_status: document.status,
        document_version: document.version,
        employee: document.employee,
        employee_id: document.employee_id,
        ip_address: user.ip_address,
        user_agent: user.user_agent
      });

      return document;
    } catch (error) {
      logger.error('Delete document failed', { error: error.message, documentId, userId: user._id });
      throw error;
    }
  }

  /**
   * Sign document
   */
  static async signDocument(documentId, user, signatureData = {}) {
    try {
      const document = await Document.findById(documentId);
      
      if (!document || document.is_deleted) {
        throw new Error('Document not found');
      }

      // Check if document can be signed
      if (!document.canSign(user)) {
        throw new Error('You cannot sign this document');
      }

      // Sign the document
      await document.sign(user, {
        ip: signatureData.ip,
        device: signatureData.device,
        metadata: signatureData.metadata || {}
      });

      // Log signature
      await AuditLog.logAction({
        document: document._id,
        document_id: document.document_id,
        user: user._id,
        user_id: user.employee_id,
        user_name: user.name,
        user_email: user.email,
        user_role: user.role,
        action: 'sign',
        action_description: `Document signed: ${document.title}`,
        document_title: document.title,
        document_type: document.document_type,
        document_status: document.status,
        document_version: document.version,
        employee: document.employee,
        employee_id: document.employee_id,
        ip_address: signatureData.ip,
        user_agent: signatureData.device,
        signature_info: {
          signature_timestamp: document.signed_at,
          signature_ip: signatureData.ip,
          signature_device: signatureData.device,
          signature_metadata: signatureData.metadata || {}
        }
      });

      return document;
    } catch (error) {
      logger.error('Sign document failed', { error: error.message, documentId, userId: user._id });
      throw error;
    }
  }

  /**
   * Get document audit history
   */
  static async getDocumentHistory(documentId, filters = {}) {
    try {
      const { page = 1, limit = 10, action } = filters;

      const query = { document: documentId };
      if (action) query.action = action;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [auditLogs, total] = await Promise.all([
        AuditLog.find(query)
          .populate('user', 'name email role')
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        AuditLog.countDocuments(query)
      ]);

      return {
        auditLogs,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      };
    } catch (error) {
      logger.error('Get document history failed', { error: error.message, documentId });
      throw error;
    }
  }

  /**
   * Get compliance reports
   */
  static async getComplianceReport(filters = {}) {
    try {
      const {
        department,
        compliance_type,
        date_from,
        date_to
      } = filters;

      const query = {
        compliance_required: true,
        is_deleted: false,
        is_latest: true
      };

      if (department) {
        query['employee.department'] = department;
      }

      if (compliance_type) {
        query.compliance_type = compliance_type;
      }

      if (date_from || date_to) {
        query.created_at = {};
        if (date_from) query.created_at.$gte = new Date(date_from);
        if (date_to) query.created_at.$lte = new Date(date_to);
      }

      const documents = await Document.find(query)
        .populate('employee', 'name email employee_id department')
        .populate('signed_by', 'name email');

      // Calculate compliance statistics
      const total = documents.length;
      const signed = documents.filter(doc => doc.is_signed).length;
      const pending = total - signed;
      const complianceRate = total > 0 ? (signed / total) * 100 : 0;

      // Group by compliance type
      const byType = documents.reduce((acc, doc) => {
        const type = doc.compliance_type || 'general';
        if (!acc[type]) {
          acc[type] = { total: 0, signed: 0, pending: 0 };
        }
        acc[type].total++;
        if (doc.is_signed) acc[type].signed++;
        else acc[type].pending++;
        return acc;
      }, {});

      // Group by department
      const byDepartment = documents.reduce((acc, doc) => {
        const dept = doc.employee.department || 'unknown';
        if (!acc[dept]) {
          acc[dept] = { total: 0, signed: 0, pending: 0 };
        }
        acc[dept].total++;
        if (doc.is_signed) acc[dept].signed++;
        else acc[dept].pending++;
        return acc;
      }, {});

      return {
        summary: {
          total,
          signed,
          pending,
          complianceRate: Math.round(complianceRate * 100) / 100
        },
        byType,
        byDepartment,
        documents: documents.map(doc => ({
          _id: doc._id,
          document_id: doc.document_id,
          title: doc.title,
          compliance_type: doc.compliance_type,
          employee: doc.employee,
          is_signed: doc.is_signed,
          signed_at: doc.signed_at,
          created_at: doc.created_at
        }))
      };
    } catch (error) {
      logger.error('Get compliance report failed', { error: error.message, filters });
      throw error;
    }
  }

  /**
   * Get pending signatures
   */
  static async getPendingSignatures(user, filters = {}) {
    try {
      const { page = 1, limit = 10 } = filters;

      const query = {
        signature_required: true,
        status: 'pending_signature',
        is_deleted: false,
        is_latest: true
      };

      // Role-based filtering
      if (user.role === 'employee') {
        query.employee = user._id;
      } else if (user.role === 'manager') {
        const teamMembers = await this.getTeamMembers(user._id);
        query.employee = { $in: teamMembers };
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [documents, total] = await Promise.all([
        Document.find(query)
          .populate('employee', 'name email employee_id')
          .populate('created_by', 'name email')
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Document.countDocuments(query)
      ]);

      return {
        documents,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      };
    } catch (error) {
      logger.error('Get pending signatures failed', { error: error.message, userId: user._id });
      throw error;
    }
  }

  /**
   * Get expiring documents
   */
  static async getExpiringDocuments(days = 30) {
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);

      const documents = await Document.find({
        expiry_date: { $lte: expiryDate, $gte: new Date() },
        is_deleted: false,
        is_latest: true
      })
        .populate('employee', 'name email employee_id department')
        .populate('created_by', 'name email')
        .sort({ expiry_date: 1 });

      return documents;
    } catch (error) {
      logger.error('Get expiring documents failed', { error: error.message, days });
      throw error;
    }
  }

  /**
   * Check if user can access document
   */
  static canAccessDocument(document, user) {
    // HR/Admin have full access
    if (['admin', 'hr', 'superadmin'].includes(user.role)) {
      return true;
    }

    // Employee can access their own documents
    if (user.role === 'employee' && document.employee.toString() === user._id.toString()) {
      return true;
    }

    // Manager can access team documents
    if (user.role === 'manager' && document.access_level === 'manager_view_status') {
      return true;
    }

    // Accounts can access financial documents
    if (user.role === 'accounts' && document.access_level === 'accounts') {
      return true;
    }

    return false;
  }

  /**
   * Check if user can modify document
   */
  static canModifyDocument(document, user) {
    // HR/Admin can modify all documents
    if (['admin', 'hr', 'superadmin'].includes(user.role)) {
      return true;
    }

    // Employee can modify their own documents (if not signed)
    if (user.role === 'employee' && 
        document.employee.toString() === user._id.toString() && 
        !document.is_signed) {
      return true;
    }

    return false;
  }

  /**
   * Get team members for manager
   */
  static async getTeamMembers(managerId) {
    try {
      // This should be implemented based on your organization structure
      // For now, return empty array
      return [];
    } catch (error) {
      logger.error('Get team members failed', { error: error.message, managerId });
      return [];
    }
  }
}

module.exports = DocumentsService;

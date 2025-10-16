const Document = require('../models/Document.model');
const AuditLog = require('../models/AuditLog.model');
const User = require('../models/User.model');
const storageService = require('../utils/storage');
const logger = require('../config/logger');

/**
 * Upload a new document
 */
const uploadDocument = async (req, res, next) => {
  try {
    const user = req.user;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      });
    }

    const {
      title,
      document_type,
      category,
      employee_id,
      signature_required,
      compliance_required,
      compliance_type,
      expiry_date,
      access_level,
      department_access,
      role_access,
      workflow_assignee
    } = req.body;

    // Find the employee
    const employee = await User.findOne({ employee_id });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Upload file to storage
    const uploadResult = await storageService.uploadFile(file, {
      documentId: `DOC_${Date.now()}`,
      employeeId: employee_id,
      mimeType: file.mimetype
    });

    // Create document record
    const document = new Document({
      title,
      document_type,
      category,
      employee: employee._id,
      employee_id,
      file_name: uploadResult.filename,
      original_name: file.originalname,
      file_size: file.size,
      mime_type: file.mimetype,
      file_extension: file.originalname.split('.').pop(),
      storage_provider: process.env.STORAGE_PROVIDER || 'local',
      storage_path: uploadResult.storagePath,
      storage_url: uploadResult.storageUrl,
      encrypted: uploadResult.encrypted,
      encryption_key: uploadResult.encryptionKey,
      signature_required: signature_required === 'true',
      compliance_required: compliance_required === 'true',
      compliance_type: compliance_type || null,
      expiry_date: expiry_date ? new Date(expiry_date) : null,
      access_level: access_level || 'restricted',
      department_access: department_access ? department_access.split(',') : [],
      role_access: role_access ? role_access.split(',') : [],
      workflow_assignee: workflow_assignee || null,
      created_by: user._id
    });

    await document.save();

    // Log audit trail
    await AuditLog.logAction({
      document: document._id,
      document_id: document.document_id,
      user: user._id,
      user_id: user.employee_id,
      user_name: user.name,
      user_email: user.email,
      user_role: user.role,
      action: 'upload',
      action_description: `Document uploaded: ${title}`,
      document_title: document.title,
      document_type: document.document_type,
      document_status: document.status,
      document_version: document.version,
      employee: employee._id,
      employee_id: employee.employee_id,
      employee_name: employee.name,
      employee_email: employee.email,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      file_info: {
        file_name: file.originalname,
        file_size: file.size,
        mime_type: file.mimetype,
        checksum: uploadResult.checksum
      },
      metadata: {
        storage_provider: uploadResult.storagePath,
        encrypted: uploadResult.encrypted
      }
    });

    logger.info('Document uploaded successfully', {
      documentId: document._id,
      title: document.title,
      employeeId: employee_id,
      uploadedBy: user._id
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        document_id: document.document_id,
        title: document.title,
        document_type: document.document_type,
        status: document.status,
        uploaded_at: document.created_at,
        download_url: document.download_url
      }
    });

  } catch (error) {
    logger.error('Document upload failed', { 
      error: error.message, 
      userId: req.user?._id,
      fileName: req.file?.originalname 
    });
    next(error);
  }
};

/**
 * Get all documents with filtering and pagination
 */
const getDocuments = async (req, res, next) => {
  try {
    const user = req.user;
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
      sort_order = 'desc'
    } = req.query;

    // Build query
    const query = { is_deleted: false };

    // Role-based filtering
    if (user.role === 'employee') {
      query.employee = user._id;
    } else if (user.role === 'manager') {
      // Managers can see team documents (implement team logic)
      query.employee = { $in: await getTeamMemberIds(user._id) };
    }

    // Apply filters
    if (document_type) query.document_type = document_type;
    if (category) query.category = category;
    if (status) query.status = status;
    if (employee_id) query.employee_id = employee_id;
    if (compliance_required) query.compliance_required = compliance_required === 'true';
    if (signature_required) query.signature_required = signature_required === 'true';

    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { document_id: { $regex: search, $options: 'i' } },
        { employee_id: { $regex: search, $options: 'i' } }
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

    // Calculate pagination info
    const totalPages = Math.ceil(total / parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Documents retrieved successfully',
      data: {
        documents: documents.map(doc => ({
          _id: doc._id,
          document_id: doc.document_id,
          title: doc.title,
          document_type: doc.document_type,
          category: doc.category,
          status: doc.status,
          employee: doc.employee,
          file_size: doc.file_size,
          mime_type: doc.mime_type,
          signature_required: doc.signature_required,
          is_signed: doc.is_signed,
          signed_at: doc.signed_at,
          compliance_required: doc.compliance_required,
          expiry_date: doc.expiry_date,
          is_expired: doc.is_expired,
          created_at: doc.created_at,
          download_url: doc.download_url
        })),
        pagination: {
          current: parseInt(page),
          pages: totalPages,
          total: total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    logger.error('Get documents failed', { 
      error: error.message, 
      userId: req.user?._id,
      query: req.query 
    });
    next(error);
  }
};

/**
 * Get document by ID
 */
const getDocumentById = async (req, res, next) => {
  try {
    const document = req.document; // From middleware

    res.status(200).json({
      success: true,
      message: 'Document retrieved successfully',
      data: {
        _id: document._id,
        document_id: document.document_id,
        title: document.title,
        document_type: document.document_type,
        category: document.category,
        status: document.status,
        employee: document.employee,
        file_name: document.file_name,
        original_name: document.original_name,
        file_size: document.file_size,
        mime_type: document.mime_type,
        signature_required: document.signature_required,
        is_signed: document.is_signed,
        signed_at: document.signed_at,
        signed_by: document.signed_by,
        compliance_required: document.compliance_required,
        compliance_type: document.compliance_type,
        expiry_date: document.expiry_date,
        is_expired: document.is_expired,
        days_until_expiry: document.days_until_expiry,
        access_level: document.access_level,
        version: document.version,
        is_latest: document.is_latest,
        created_at: document.created_at,
        updated_at: document.updated_at,
        download_url: document.download_url
      }
    });

  } catch (error) {
    logger.error('Get document by ID failed', { 
      error: error.message, 
      documentId: req.params.documentId,
      userId: req.user?._id 
    });
    next(error);
  }
};

/**
 * Download document
 */
const downloadDocument = async (req, res, next) => {
  try {
    const document = req.document; // From middleware
    const user = req.user;

    // Download file from storage
    const fileData = await storageService.downloadFile(document.storage_path, {
      encrypted: document.encrypted,
      encryptionKey: document.encryption_key
    });

    // Log download action
    await AuditLog.logAction({
      document: document._id,
      document_id: document.document_id,
      user: user._id,
      user_id: user.employee_id,
      user_name: user.name,
      user_email: user.email,
      user_role: user.role,
      action: 'download',
      action_description: `Document downloaded: ${document.title}`,
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
      file_info: {
        file_name: document.original_name,
        file_size: document.file_size,
        mime_type: document.mime_type
      }
    });

    // Set response headers
    res.setHeader('Content-Type', document.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${document.original_name}"`);
    res.setHeader('Content-Length', fileData.length);

    // Send file
    res.send(fileData);

  } catch (error) {
    logger.error('Document download failed', { 
      error: error.message, 
      documentId: req.params.documentId,
      userId: req.user?._id 
    });
    next(error);
  }
};

/**
 * Update document
 */
const updateDocument = async (req, res, next) => {
  try {
    const document = req.document; // From middleware
    const user = req.user;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData._id;
    delete updateData.document_id;
    delete updateData.employee;
    delete updateData.created_by;
    delete updateData.created_at;

    // Update document
    Object.assign(document, updateData, {
      updated_by: user._id,
      updated_at: new Date()
    });

    await document.save();

    // Log update action
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
      employee: document.employee._id,
      employee_id: document.employee.employee_id,
      employee_name: document.employee.name,
      employee_email: document.employee.email,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      metadata: {
        updated_fields: Object.keys(updateData)
      }
    });

    logger.info('Document updated successfully', {
      documentId: document._id,
      updatedBy: user._id
    });

    res.status(200).json({
      success: true,
      message: 'Document updated successfully',
      data: {
        document_id: document.document_id,
        title: document.title,
        status: document.status,
        updated_at: document.updated_at
      }
    });

  } catch (error) {
    logger.error('Document update failed', { 
      error: error.message, 
      documentId: req.params.documentId,
      userId: req.user?._id 
    });
    next(error);
  }
};

/**
 * Delete document (soft delete)
 */
const deleteDocument = async (req, res, next) => {
  try {
    const document = req.document; // From middleware
    const user = req.user;

    // Soft delete
    document.is_deleted = true;
    document.deleted_by = user._id;
    document.deleted_at = new Date();
    await document.save();

    // Log deletion action
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
      employee: document.employee._id,
      employee_id: document.employee.employee_id,
      employee_name: document.employee.name,
      employee_email: document.employee.email,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    logger.info('Document deleted successfully', {
      documentId: document._id,
      deletedBy: user._id
    });

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    logger.error('Document deletion failed', { 
      error: error.message, 
      documentId: req.params.documentId,
      userId: req.user?._id 
    });
    next(error);
  }
};

/**
 * Sign document
 */
const signDocument = async (req, res, next) => {
  try {
    const document = req.document; // From middleware
    const user = req.user;
    const { signature_method = 'checkbox', signature_metadata = {} } = req.body;

    // Check if document can be signed
    if (!document.canSign(user)) {
      return res.status(403).json({
        success: false,
        message: 'You cannot sign this document'
      });
    }

    // Sign the document
    await document.sign(user, {
      ip: req.ip,
      device: req.get('User-Agent'),
      metadata: {
        signature_method,
        ...signature_metadata
      }
    });

    // Log signature action
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
      employee: document.employee._id,
      employee_id: document.employee.employee_id,
      employee_name: document.employee.name,
      employee_email: document.employee.email,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      signature_info: {
        signature_method,
        signature_timestamp: document.signed_at,
        signature_ip: req.ip,
        signature_device: req.get('User-Agent'),
        signature_metadata: {
          signature_method,
          ...signature_metadata
        }
      }
    });

    logger.info('Document signed successfully', {
      documentId: document._id,
      signedBy: user._id
    });

    res.status(200).json({
      success: true,
      message: 'Document signed successfully',
      data: {
        document_id: document.document_id,
        signed_at: document.signed_at,
        signature_method
      }
    });

  } catch (error) {
    logger.error('Document signing failed', { 
      error: error.message, 
      documentId: req.params.documentId,
      userId: req.user?._id 
    });
    next(error);
  }
};

/**
 * Get document audit history
 */
const getDocumentHistory = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { page = 1, limit = 10, action } = req.query;

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

    const totalPages = Math.ceil(total / parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Document history retrieved successfully',
      data: {
        audit_logs: auditLogs,
        pagination: {
          current: parseInt(page),
          pages: totalPages,
          total: total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    logger.error('Get document history failed', { 
      error: error.message, 
      documentId: req.params.documentId,
      userId: req.user?._id 
    });
    next(error);
  }
};

/**
 * Get pending signatures
 */
const getPendingSignatures = async (req, res, next) => {
  try {
    const user = req.user;
    const { page = 1, limit = 10 } = req.query;

    const query = {
      signature_required: true,
      status: 'pending_signature',
      is_deleted: false,
      is_latest: true
    };

    // Role-based filtering
    if (user.role === 'employee') {
      query.employee = user._id;
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

    const totalPages = Math.ceil(total / parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Pending signatures retrieved successfully',
      data: {
        documents: documents.map(doc => ({
          _id: doc._id,
          document_id: doc.document_id,
          title: doc.title,
          document_type: doc.document_type,
          employee: doc.employee,
          created_by: doc.created_by,
          created_at: doc.created_at,
          download_url: doc.download_url
        })),
        pagination: {
          current: parseInt(page),
          pages: totalPages,
          total: total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    logger.error('Get pending signatures failed', { 
      error: error.message, 
      userId: req.user?._id 
    });
    next(error);
  }
};

// Helper function to get team member IDs (implement based on your org structure)
const getTeamMemberIds = async (managerId) => {
  // This should be implemented based on your organization structure
  // For now, return empty array
  return [];
};

module.exports = {
  uploadDocument,
  getDocuments,
  getDocumentById,
  downloadDocument,
  updateDocument,
  deleteDocument,
  signDocument,
  getDocumentHistory,
  getPendingSignatures
};
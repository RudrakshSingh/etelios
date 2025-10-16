const Document = require('../models/Document.model');
const User = require('../models/User.model');
const logger = require('../config/logger');
const { recordAuditLog } = require('../utils/audit');

/**
 * Uploads a document for an employee
 * @param {string} employeeId - Employee ID
 * @param {Object} documentData - Document data
 * @param {string} uploadedBy - ID of the user uploading
 * @returns {Promise<Object>} Created document
 */
const uploadDocument = async (employeeId, documentData, uploadedBy) => {
  try {
    const { title, documentType, fileUrl, filePublicId, isPrivate = false } = documentData;

    // Verify employee exists
    const employee = await User.findById(employeeId);
    if (!employee) {
      const error = new Error('Employee not found');
      error.statusCode = 404;
      throw error;
    }

    const document = new Document({
      employee: employeeId,
      title,
      documentType,
      file: {
        url: fileUrl,
        public_id: filePublicId
      },
      uploadedBy,
      isPrivate
    });

    await document.save();
    await recordAuditLog(uploadedBy, 'DOCUMENT_UPLOADED', { 
      documentId: document._id, 
      employeeId,
      documentType,
      title 
    });

    logger.info('Document uploaded successfully', { 
      documentId: document._id, 
      employeeId,
      uploadedBy 
    });

    return document;
  } catch (error) {
    logger.error('Error in uploadDocument service', { error: error.message, employeeId, uploadedBy });
    throw error;
  }
};

/**
 * Gets documents for an employee
 * @param {string} employeeId - Employee ID
 * @param {string} documentType - Document type filter (optional)
 * @param {number} page - Page number
 * @param {number} limit - Records per page
 * @returns {Promise<Object>} Paginated documents
 */
const getEmployeeDocuments = async (employeeId, documentType = null, page = 1, limit = 10) => {
  try {
    const query = { employee: employeeId };
    if (documentType) {
      query.documentType = documentType;
    }

    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      Document.find(query)
        .populate('uploadedBy', 'firstName lastName email')
        .sort({ uploadDate: -1 })
        .skip(skip)
        .limit(limit),
      Document.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      documents,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  } catch (error) {
    logger.error('Error in getEmployeeDocuments service', { error: error.message, employeeId });
    throw error;
  }
};

/**
 * Gets all documents with filtering
 * @param {Object} filters - Filter options
 * @param {number} page - Page number
 * @param {number} limit - Records per page
 * @returns {Promise<Object>} Paginated documents
 */
const getAllDocuments = async (filters = {}, page = 1, limit = 10) => {
  try {
    const query = {};

    // Apply filters
    if (filters.employee) {
      query.employee = filters.employee;
    }
    if (filters.documentType) {
      query.documentType = filters.documentType;
    }
    if (filters.isPrivate !== undefined) {
      query.isPrivate = filters.isPrivate;
    }
    if (filters.search) {
      query.$or = [
        { title: new RegExp(filters.search, 'i') },
        { documentType: new RegExp(filters.search, 'i') }
      ];
    }

    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      Document.find(query)
        .populate('employee', 'firstName lastName employeeId email')
        .populate('uploadedBy', 'firstName lastName email')
        .sort({ uploadDate: -1 })
        .skip(skip)
        .limit(limit),
      Document.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      documents,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  } catch (error) {
    logger.error('Error in getAllDocuments service', { error: error.message });
    throw error;
  }
};

/**
 * Updates a document
 * @param {string} documentId - Document ID
 * @param {Object} updateData - Update data
 * @param {string} updatedBy - ID of the user updating
 * @returns {Promise<Object>} Updated document
 */
const updateDocument = async (documentId, updateData, updatedBy) => {
  try {
    const document = await Document.findById(documentId);
    if (!document) {
      const error = new Error('Document not found');
      error.statusCode = 404;
      throw error;
    }

    const updatedDocument = await Document.findByIdAndUpdate(
      documentId,
      updateData,
      { new: true, runValidators: true }
    ).populate('employee', 'firstName lastName employeeId email')
     .populate('uploadedBy', 'firstName lastName email');

    await recordAuditLog(updatedBy, 'DOCUMENT_UPDATED', { 
      documentId, 
      changes: Object.keys(updateData) 
    });

    logger.info('Document updated successfully', { 
      documentId, 
      updatedBy,
      changes: Object.keys(updateData) 
    });

    return updatedDocument;
  } catch (error) {
    logger.error('Error in updateDocument service', { error: error.message, documentId, updatedBy });
    throw error;
  }
};

/**
 * Deletes a document
 * @param {string} documentId - Document ID
 * @param {string} deletedBy - ID of the user deleting
 * @returns {Promise<Object>} Deletion result
 */
const deleteDocument = async (documentId, deletedBy) => {
  try {
    const document = await Document.findById(documentId);
    if (!document) {
      const error = new Error('Document not found');
      error.statusCode = 404;
      throw error;
    }

    await Document.findByIdAndDelete(documentId);

    await recordAuditLog(deletedBy, 'DOCUMENT_DELETED', { 
      documentId, 
      employeeId: document.employee,
      title: document.title 
    });

    logger.info('Document deleted successfully', { 
      documentId, 
      deletedBy 
    });

    return { success: true, message: 'Document deleted successfully' };
  } catch (error) {
    logger.error('Error in deleteDocument service', { error: error.message, documentId, deletedBy });
    throw error;
  }
};

/**
 * Gets document statistics
 * @returns {Promise<Object>} Document statistics
 */
const getDocumentStatistics = async () => {
  try {
    const totalDocuments = await Document.countDocuments();
    
    const documentTypeStats = await Document.aggregate([
      { $group: { _id: '$documentType', count: { $sum: 1 } } }
    ]);

    const privateDocuments = await Document.countDocuments({ isPrivate: true });
    const publicDocuments = await Document.countDocuments({ isPrivate: false });

    const recentUploads = await Document.countDocuments({
      uploadDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    });

    return {
      totalDocuments,
      documentTypeBreakdown: documentTypeStats,
      privateDocuments,
      publicDocuments,
      recentUploads
    };
  } catch (error) {
    logger.error('Error in getDocumentStatistics service', { error: error.message });
    throw error;
  }
};

module.exports = {
  uploadDocument,
  getEmployeeDocuments,
  getAllDocuments,
  updateDocument,
  deleteDocument,
  getDocumentStatistics
};
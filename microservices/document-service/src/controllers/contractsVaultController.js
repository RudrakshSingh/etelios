const EmployeeDocument = require('../models/EmployeeDocument.model');
const DocumentType = require('../models/DocumentType.model');
const User = require('../models/User.model');
const DigiLockerService = require('../services/digilocker.service');
const { logger } = require('../config/logger');
const path = require('path');
const fs = require('fs').promises;

/**
 * Get all document types
 */
const getDocumentTypes = async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = { is_active: true };
    if (category) {
      query.category = category.toUpperCase();
    }

    const documentTypes = await DocumentType.find(query).sort({ name: 1 });

    res.json({
      success: true,
      data: documentTypes,
      count: documentTypes.length
    });
  } catch (error) {
    logger.error('Error getting document types', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get document types',
      error: error.message
    });
  }
};

/**
 * Create new document type
 */
const createDocumentType = async (req, res) => {
  try {
    const documentTypeData = {
      ...req.body,
      created_by: req.user.userId
    };

    const documentType = new DocumentType(documentTypeData);
    await documentType.save();

    logger.info('Document type created', {
      documentTypeId: documentType._id,
      name: documentType.name,
      createdBy: req.user.userId
    });

    res.status(201).json({
      success: true,
      message: 'Document type created successfully',
      data: documentType
    });
  } catch (error) {
    logger.error('Error creating document type', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to create document type',
      error: error.message
    });
  }
};

/**
 * Upload employee document
 */
const uploadDocument = async (req, res) => {
  try {
    const { employeeId, documentTypeId, comments } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Get document type details
    const documentType = await DocumentType.findById(documentTypeId);
    if (!documentType) {
      return res.status(404).json({
        success: false,
        message: 'Document type not found'
      });
    }

    // Check file format
    const fileExtension = path.extname(file.originalname).toUpperCase().slice(1);
    if (!documentType.allowed_formats.includes(fileExtension)) {
      return res.status(400).json({
        success: false,
        message: `File format ${fileExtension} not allowed for this document type`
      });
    }

    // Check file size
    if (file.size > documentType.max_file_size) {
      return res.status(400).json({
        success: false,
        message: `File size exceeds limit of ${documentType.max_file_size / 1024 / 1024}MB`
      });
    }

    // Archive old versions
    const oldDocuments = await EmployeeDocument.find({
      employee_id: employeeId,
      document_type: documentTypeId,
      is_latest: true
    });

    for (const doc of oldDocuments) {
      await doc.archiveOldVersions();
    }

    // Create new document record
    const employeeDocument = new EmployeeDocument({
      employee_id: employeeId,
      document_type: documentTypeId,
      document_name: documentType.name,
      file_path: file.path,
      file_name: file.originalname,
      file_size: file.size,
      file_type: fileExtension,
      status: documentType.requires_esign ? 'PENDING_SIGNATURE' : 'SIGNED',
      esign_status: documentType.requires_esign ? 'PENDING' : 'SIGNED',
      expiry_date: documentType.expiry_days ? 
        new Date(Date.now() + documentType.expiry_days * 24 * 60 * 60 * 1000) : null,
      uploaded_by: req.user.userId,
      comments: comments ? [{
        comment: comments,
        added_by: req.user.userId
      }] : []
    });

    await employeeDocument.save();

    logger.info('Document uploaded', {
      documentId: employeeDocument._id,
      employeeId,
      documentType: documentType.name,
      uploadedBy: req.user.userId
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: employeeDocument
    });
  } catch (error) {
    logger.error('Error uploading document', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to upload document',
      error: error.message
    });
  }
};

/**
 * Get employee documents
 */
const getEmployeeDocuments = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { status, documentType, includeArchived } = req.query;

    let query = { employee_id: employeeId };
    
    if (!includeArchived) {
      query.is_latest = true;
    }
    
    if (status) {
      query.status = status.toUpperCase();
    }
    
    if (documentType) {
      query.document_type = documentType;
    }

    const documents = await EmployeeDocument.find(query)
      .populate('document_type', 'name category is_mandatory')
      .populate('employee_id', 'name employee_id email')
      .populate('uploaded_by', 'name employee_id')
      .populate('signed_by', 'name employee_id')
      .sort({ created_at: -1 });

    res.json({
      success: true,
      data: documents,
      count: documents.length
    });
  } catch (error) {
    logger.error('Error getting employee documents', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get employee documents',
      error: error.message
    });
  }
};

/**
 * E-sign document
 */
const esignDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { esignProvider, digilockerToken } = req.body;

    const document = await EmployeeDocument.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    if (document.esign_status === 'SIGNED') {
      return res.status(400).json({
        success: false,
        message: 'Document already signed'
      });
    }

    // Handle different e-sign providers
    let esignData = {
      signed_at: new Date(),
      signer_ip: req.ip,
      signer_device: req.get('User-Agent'),
      verification_status: 'PENDING'
    };

    if (esignProvider === 'DIGILOCKER' && digilockerToken) {
      try {
        // Verify with DigiLocker
        const verificationResult = await DigiLockerService.verifyDocument(digilockerToken, documentId);
        
        if (verificationResult.valid) {
          esignData.esign_provider = 'DIGILOCKER';
          esignData.signature_id = verificationResult.signature_id;
          esignData.transaction_id = verificationResult.transaction_id;
          esignData.verification_status = 'VERIFIED';
          esignData.digilocker_verification = {
            is_verified: true,
            verification_id: verificationResult.verification_id,
            verified_at: new Date(),
            aadhaar_verified: verificationResult.aadhaar_verified,
            document_hash: verificationResult.document_hash
          };
        } else {
          throw new Error('DigiLocker verification failed');
        }
      } catch (error) {
        logger.error('DigiLocker verification failed', { error: error.message });
        return res.status(400).json({
          success: false,
          message: 'DigiLocker verification failed'
        });
      }
    } else {
      // Manual e-sign (checkbox agreement)
      esignData.esign_provider = 'MANUAL';
      esignData.verification_status = 'VERIFIED';
    }

    // Update document
    document.esign_status = 'SIGNED';
    document.status = 'SIGNED';
    document.signed_by = req.user.userId;
    document.signed_at = new Date();
    document.esign_data = esignData;

    // Add to change log
    document.change_log.push({
      action: 'SIGNED',
      performed_by: req.user.userId,
      details: `Document signed using ${esignProvider || 'MANUAL'}`
    });

    await document.save();

    logger.info('Document e-signed', {
      documentId: document._id,
      employeeId: document.employee_id,
      esignProvider: esignProvider || 'MANUAL',
      signedBy: req.user.userId
    });

    res.json({
      success: true,
      message: 'Document signed successfully',
      data: document
    });
  } catch (error) {
    logger.error('Error e-signing document', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to e-sign document',
      error: error.message
    });
  }
};

/**
 * Get DigiLocker authentication URL
 */
const getDigilockerAuthURL = async (req, res) => {
  try {
    if (!DigiLockerService.isConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'DigiLocker is not configured'
      });
    }

    const state = crypto.randomBytes(16).toString('hex');
    const authURL = DigiLockerService.generateAuthURL(state);

    // Store state in session or database for verification
    req.session.digilockerState = state;

    res.json({
      success: true,
      data: {
        authURL,
        state
      }
    });
  } catch (error) {
    logger.error('Error generating DigiLocker auth URL', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to generate DigiLocker auth URL',
      error: error.message
    });
  }
};

/**
 * Handle DigiLocker callback
 */
const handleDigilockerCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (state !== req.session.digilockerState) {
      return res.status(400).json({
        success: false,
        message: 'Invalid state parameter'
      });
    }

    const tokenData = await DigiLockerService.getAccessToken(code);
    const userProfile = await DigiLockerService.getUserProfile(tokenData.access_token);

    // Store token data in session or database
    req.session.digilockerToken = tokenData.access_token;
    req.session.digilockerUser = userProfile;

    res.json({
      success: true,
      message: 'DigiLocker authentication successful',
      data: {
        user: userProfile,
        token: tokenData.access_token
      }
    });
  } catch (error) {
    logger.error('Error handling DigiLocker callback', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to handle DigiLocker callback',
      error: error.message
    });
  }
};

/**
 * Get compliance status
 */
const getComplianceStatus = async (req, res) => {
  try {
    const complianceData = await EmployeeDocument.getComplianceStatus();

    res.json({
      success: true,
      data: complianceData
    });
  } catch (error) {
    logger.error('Error getting compliance status', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get compliance status',
      error: error.message
    });
  }
};

/**
 * Get pending signatures
 */
const getPendingSignatures = async (req, res) => {
  try {
    const { employeeId } = req.query;
    
    const pendingDocuments = await EmployeeDocument.getPendingSignatures(employeeId);

    res.json({
      success: true,
      data: pendingDocuments,
      count: pendingDocuments.length
    });
  } catch (error) {
    logger.error('Error getting pending signatures', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get pending signatures',
      error: error.message
    });
  }
};

/**
 * Get expiring documents
 */
const getExpiringDocuments = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const expiringDocuments = await EmployeeDocument.getExpiringDocuments(parseInt(days));

    res.json({
      success: true,
      data: expiringDocuments,
      count: expiringDocuments.length
    });
  } catch (error) {
    logger.error('Error getting expiring documents', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get expiring documents',
      error: error.message
    });
  }
};

/**
 * Download document
 */
const downloadDocument = async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await EmployeeDocument.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check permissions
    const user = req.user;
    if (user.role !== 'admin' && user.role !== 'hr' && document.employee_id.toString() !== user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if file exists
    try {
      await fs.access(document.file_path);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    res.download(document.file_path, document.file_name);
  } catch (error) {
    logger.error('Error downloading document', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to download document',
      error: error.message
    });
  }
};

module.exports = {
  getDocumentTypes,
  createDocumentType,
  uploadDocument,
  getEmployeeDocuments,
  esignDocument,
  getDigilockerAuthURL,
  handleDigilockerCallback,
  getComplianceStatus,
  getPendingSignatures,
  getExpiringDocuments,
  downloadDocument
};

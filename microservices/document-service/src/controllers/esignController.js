const ESignService = require('../services/esign.service');
const Document = require('../models/Document.model');
const logger = require('../config/logger');

/**
 * Initiate e-signature process
 */
const initiateSignature = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { signature_method, signature_metadata } = req.body;
    const user = req.user;

    let result;

    switch (signature_method) {
      case 'checkbox':
        result = await ESignService.basicSignature(documentId, user, {
          ip: req.ip,
          device: req.get('User-Agent'),
          metadata: signature_metadata
        });
        break;

      case 'docusign':
        result = await ESignService.docusignSignature(documentId, user, {
          ip: req.ip,
          device: req.get('User-Agent'),
          metadata: signature_metadata
        });
        break;

      case 'digio':
        result = await ESignService.digioSignature(documentId, user, {
          ip: req.ip,
          device: req.get('User-Agent'),
          metadata: signature_metadata
        });
        break;

      case 'aadhaar_esign':
        result = await ESignService.aadhaarESign(documentId, user, {
          ip: req.ip,
          device: req.get('User-Agent'),
          aadhaar_number: signature_metadata?.aadhaar_number,
          metadata: signature_metadata
        });
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid signature method'
        });
    }

    res.status(200).json({
      success: true,
      message: 'Signature process initiated successfully',
      data: result
    });

  } catch (error) {
    logger.error('Initiate signature failed', { 
      error: error.message, 
      documentId: req.params.documentId,
      userId: req.user?._id 
    });
    next(error);
  }
};

/**
 * Handle DocuSign callback
 */
const handleDocuSignCallback = async (req, res, next) => {
  try {
    const { envelopeId } = req.params;
    const { event } = req.body;

    const document = await ESignService.handleDocuSignCallback(envelopeId, event);

    res.status(200).json({
      success: true,
      message: 'DocuSign callback processed successfully',
      data: {
        document_id: document.document_id,
        status: document.signature_status
      }
    });

  } catch (error) {
    logger.error('DocuSign callback failed', { 
      error: error.message, 
      envelopeId: req.params.envelopeId 
    });
    next(error);
  }
};

/**
 * Handle Digio callback
 */
const handleDigioCallback = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    const document = await ESignService.handleDigioCallback(requestId, status);

    res.status(200).json({
      success: true,
      message: 'Digio callback processed successfully',
      data: {
        document_id: document.document_id,
        status: document.signature_status
      }
    });

  } catch (error) {
    logger.error('Digio callback failed', { 
      error: error.message, 
      requestId: req.params.requestId 
    });
    next(error);
  }
};

/**
 * Handle Aadhaar e-sign callback
 */
const handleAadhaarCallback = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    const document = await ESignService.handleAadhaarCallback(requestId, status);

    res.status(200).json({
      success: true,
      message: 'Aadhaar e-sign callback processed successfully',
      data: {
        document_id: document.document_id,
        status: document.signature_status
      }
    });

  } catch (error) {
    logger.error('Aadhaar e-sign callback failed', { 
      error: error.message, 
      requestId: req.params.requestId 
    });
    next(error);
  }
};

/**
 * Get signature status
 */
const getSignatureStatus = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    const status = await ESignService.getSignatureStatus(documentId);

    res.status(200).json({
      success: true,
      message: 'Signature status retrieved successfully',
      data: status
    });

  } catch (error) {
    logger.error('Get signature status failed', { 
      error: error.message, 
      documentId: req.params.documentId 
    });
    next(error);
  }
};

/**
 * Cancel signature process
 */
const cancelSignature = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const user = req.user;

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check permissions
    if (document.employee.toString() !== user._id.toString() && !['hr', 'admin', 'superadmin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Cancel signature process
    document.signature_status = 'cancelled';
    document.status = 'draft';
    await document.save();

    logger.info('Signature process cancelled', {
      documentId: document._id,
      cancelledBy: user._id
    });

    res.status(200).json({
      success: true,
      message: 'Signature process cancelled successfully'
    });

  } catch (error) {
    logger.error('Cancel signature failed', { 
      error: error.message, 
      documentId: req.params.documentId,
      userId: req.user?._id 
    });
    next(error);
  }
};

/**
 * Resend signature request
 */
const resendSignatureRequest = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const user = req.user;

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check if signature is pending
    if (document.signature_status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Document is not in pending signature status'
      });
    }

    // Resend based on signature method
    let result;
    switch (document.signature_method) {
      case 'docusign':
        result = await ESignService.docusignSignature(documentId, user, {
          ip: req.ip,
          device: req.get('User-Agent')
        });
        break;

      case 'digio':
        result = await ESignService.digioSignature(documentId, user, {
          ip: req.ip,
          device: req.get('User-Agent')
        });
        break;

      case 'aadhaar_esign':
        result = await ESignService.aadhaarESign(documentId, user, {
          ip: req.ip,
          device: req.get('User-Agent')
        });
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Cannot resend signature request for this method'
        });
    }

    logger.info('Signature request resent', {
      documentId: document._id,
      resentBy: user._id,
      method: document.signature_method
    });

    res.status(200).json({
      success: true,
      message: 'Signature request resent successfully',
      data: result
    });

  } catch (error) {
    logger.error('Resend signature request failed', { 
      error: error.message, 
      documentId: req.params.documentId,
      userId: req.user?._id 
    });
    next(error);
  }
};

module.exports = {
  initiateSignature,
  handleDocuSignCallback,
  handleDigioCallback,
  handleAadhaarCallback,
  getSignatureStatus,
  cancelSignature,
  resendSignatureRequest
};

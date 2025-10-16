const Document = require('../models/Document.model');
const AuditLog = require('../models/AuditLog.model');
const User = require('../models/User.model');
const logger = require('../config/logger');

class ESignService {
  /**
   * Basic checkbox signature
   */
  static async basicSignature(documentId, user, signatureData = {}) {
    try {
      const document = await Document.findById(documentId);
      
      if (!document) {
        throw new Error('Document not found');
      }

      if (!document.canSign(user)) {
        throw new Error('You cannot sign this document');
      }

      // Update document with signature
      document.is_signed = true;
      document.signed_at = new Date();
      document.signed_by = user._id;
      document.signature_method = 'checkbox';
      document.signature_metadata = {
        ip_address: signatureData.ip,
        device_info: signatureData.device,
        signature_timestamp: new Date(),
        user_consent: true,
        ...signatureData.metadata
      };

      // Update status based on compliance requirements
      if (document.compliance_required) {
        document.status = 'active';
      } else {
        document.status = 'signed';
      }

      await document.save();

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
        action_description: `Document signed with basic signature: ${document.title}`,
        document_title: document.title,
        document_type: document.document_type,
        document_status: document.status,
        document_version: document.version,
        employee: document.employee,
        employee_id: document.employee_id,
        ip_address: signatureData.ip,
        user_agent: signatureData.device,
        signature_info: {
          signature_method: 'checkbox',
          signature_timestamp: document.signed_at,
          signature_ip: signatureData.ip,
          signature_device: signatureData.device,
          signature_metadata: document.signature_metadata
        }
      });

      logger.info('Document signed with basic signature', {
        documentId: document._id,
        signedBy: user._id,
        signatureMethod: 'checkbox'
      });

      return document;
    } catch (error) {
      logger.error('Basic signature failed', { error: error.message, documentId, userId: user._id });
      throw error;
    }
  }

  /**
   * DocuSign integration
   */
  static async docusignSignature(documentId, user, signatureData = {}) {
    try {
      const document = await Document.findById(documentId);
      
      if (!document) {
        throw new Error('Document not found');
      }

      // Initialize DocuSign client
      const docusign = require('docusign-esign');
      const apiClient = new docusign.ApiClient();
      
      // Configure DocuSign
      apiClient.setBasePath(process.env.DOCUSIGN_BASE_URL);
      apiClient.addDefaultHeader('Authorization', `Bearer ${await this.getDocuSignToken()}`);

      const envelopesApi = new docusign.EnvelopesApi(apiClient);

      // Create envelope
      const envelope = new docusign.EnvelopeDefinition();
      envelope.emailSubject = `Please sign: ${document.title}`;
      envelope.documents = [{
        documentBase64: await this.getDocumentBase64(document.storage_path),
        name: document.original_name,
        fileExtension: document.file_extension,
        documentId: '1'
      }];

      // Add recipients
      envelope.recipients = new docusign.Recipients();
      envelope.recipients.signers = [{
        email: user.email,
        name: user.name,
        recipientId: '1',
        routingOrder: '1',
        tabs: {
          signHereTabs: [{
            documentId: '1',
            pageNumber: '1',
            recipientId: '1',
            xPosition: '100',
            yPosition: '100'
          }]
        }
      }];

      // Send envelope
      const results = await envelopesApi.createEnvelope(process.env.DOCUSIGN_ACCOUNT_ID, {
        envelopeDefinition: envelope
      });

      // Update document with DocuSign envelope ID
      document.docusign_envelope_id = results.envelopeId;
      document.signature_status = 'pending';
      document.signature_method = 'docusign';
      await document.save();

      // Log DocuSign initiation
      await AuditLog.logAction({
        document: document._id,
        document_id: document.document_id,
        user: user._id,
        user_id: user.employee_id,
        user_name: user.name,
        user_email: user.email,
        user_role: user.role,
        action: 'esign_initiate',
        action_description: `DocuSign signature initiated: ${document.title}`,
        document_title: document.title,
        document_type: document.document_type,
        document_status: document.status,
        document_version: document.version,
        employee: document.employee,
        employee_id: document.employee_id,
        ip_address: signatureData.ip,
        user_agent: signatureData.device,
        signature_info: {
          signature_method: 'docusign',
          envelope_id: results.envelopeId,
          signature_status: 'pending',
          signature_url: results.recipientsViewUrl
        }
      });

      return {
        envelopeId: results.envelopeId,
        redirectUrl: results.recipientsViewUrl
      };
    } catch (error) {
      logger.error('DocuSign signature failed', { error: error.message, documentId, userId: user._id });
      throw error;
    }
  }

  /**
   * Digio integration
   */
  static async digioSignature(documentId, user, signatureData = {}) {
    try {
      const document = await Document.findById(documentId);
      
      if (!document) {
        throw new Error('Document not found');
      }

      // Initialize Digio client
      const axios = require('axios');
      
      const digioConfig = {
        baseURL: process.env.DIGIO_BASE_URL,
        headers: {
          'Authorization': `Bearer ${await this.getDigioToken()}`,
          'Content-Type': 'application/json'
        }
      };

      // Create signing request
      const signingRequest = {
        document: {
          name: document.original_name,
          content: await this.getDocumentBase64(document.storage_path)
        },
        signers: [{
          email: user.email,
          name: user.name,
          phone: user.phone || null
        }],
        callback_url: `${process.env.APP_URL}/api/documents/digio/callback`,
        expires_in: 7 // days
      };

      const response = await axios.post('/api/v1/sign', signingRequest, digioConfig);

      // Update document with Digio request ID
      document.digio_request_id = response.data.request_id;
      document.signature_status = 'pending';
      document.signature_method = 'digio';
      await document.save();

      // Log Digio initiation
      await AuditLog.logAction({
        document: document._id,
        document_id: document.document_id,
        user: user._id,
        user_id: user.employee_id,
        user_name: user.name,
        user_email: user.email,
        user_role: user.role,
        action: 'esign_initiate',
        action_description: `Digio signature initiated: ${document.title}`,
        document_title: document.title,
        document_type: document.document_type,
        document_status: document.status,
        document_version: document.version,
        employee: document.employee,
        employee_id: document.employee_id,
        ip_address: signatureData.ip,
        user_agent: signatureData.device,
        signature_info: {
          signature_method: 'digio',
          request_id: response.data.request_id,
          signature_status: 'pending',
          signature_url: response.data.signing_url
        }
      });

      return {
        requestId: response.data.request_id,
        signingUrl: response.data.signing_url
      };
    } catch (error) {
      logger.error('Digio signature failed', { error: error.message, documentId, userId: user._id });
      throw error;
    }
  }

  /**
   * Aadhaar e-sign integration
   */
  static async aadhaarESign(documentId, user, signatureData = {}) {
    try {
      const document = await Document.findById(documentId);
      
      if (!document) {
        throw new Error('Document not found');
      }

      // Initialize Aadhaar e-sign client
      const axios = require('axios');
      
      const aadhaarConfig = {
        baseURL: process.env.AADHAAR_ESIGN_BASE_URL,
        headers: {
          'Authorization': `Bearer ${await this.getAadhaarToken()}`,
          'Content-Type': 'application/json'
        }
      };

      // Create e-sign request
      const esignRequest = {
        document: {
          name: document.original_name,
          content: await this.getDocumentBase64(document.storage_path)
        },
        signer: {
          aadhaar_number: signatureData.aadhaar_number,
          name: user.name,
          email: user.email,
          phone: user.phone || null
        },
        callback_url: `${process.env.APP_URL}/api/documents/aadhaar/callback`,
        expires_in: 7 // days
      };

      const response = await axios.post('/api/v1/esign', esignRequest, aadhaarConfig);

      // Update document with Aadhaar request ID
      document.aadhaar_request_id = response.data.request_id;
      document.signature_status = 'pending';
      document.signature_method = 'aadhaar_esign';
      await document.save();

      // Log Aadhaar e-sign initiation
      await AuditLog.logAction({
        document: document._id,
        document_id: document.document_id,
        user: user._id,
        user_id: user.employee_id,
        user_name: user.name,
        user_email: user.email,
        user_role: user.role,
        action: 'esign_initiate',
        action_description: `Aadhaar e-sign initiated: ${document.title}`,
        document_title: document.title,
        document_type: document.document_type,
        document_status: document.status,
        document_version: document.version,
        employee: document.employee,
        employee_id: document.employee_id,
        ip_address: signatureData.ip,
        user_agent: signatureData.device,
        signature_info: {
          signature_method: 'aadhaar_esign',
          request_id: response.data.request_id,
          signature_status: 'pending',
          signature_url: response.data.signing_url
        }
      });

      return {
        requestId: response.data.request_id,
        signingUrl: response.data.signing_url
      };
    } catch (error) {
      logger.error('Aadhaar e-sign failed', { error: error.message, documentId, userId: user._id });
      throw error;
    }
  }

  /**
   * Handle DocuSign callback
   */
  static async handleDocuSignCallback(envelopeId, event) {
    try {
      const document = await Document.findOne({ docusign_envelope_id: envelopeId });
      
      if (!document) {
        throw new Error('Document not found for DocuSign envelope');
      }

      if (event === 'completed') {
        document.is_signed = true;
        document.signed_at = new Date();
        document.signature_status = 'completed';
        document.status = document.compliance_required ? 'active' : 'signed';
      } else if (event === 'declined') {
        document.signature_status = 'declined';
      } else if (event === 'voided') {
        document.signature_status = 'voided';
      }

      await document.save();

      // Log callback
      await AuditLog.logAction({
        document: document._id,
        document_id: document.document_id,
        user: document.employee,
        user_id: document.employee_id,
        action: 'esign_callback',
        action_description: `DocuSign callback received: ${event}`,
        document_title: document.title,
        document_type: document.document_type,
        document_status: document.status,
        document_version: document.version,
        employee: document.employee,
        employee_id: document.employee_id,
        signature_info: {
          signature_method: 'docusign',
          envelope_id: envelopeId,
          signature_status: document.signature_status,
          callback_event: event
        }
      });

      logger.info('DocuSign callback processed', {
        documentId: document._id,
        envelopeId,
        event,
        status: document.signature_status
      });

      return document;
    } catch (error) {
      logger.error('DocuSign callback failed', { error: error.message, envelopeId, event });
      throw error;
    }
  }

  /**
   * Handle Digio callback
   */
  static async handleDigioCallback(requestId, status) {
    try {
      const document = await Document.findOne({ digio_request_id: requestId });
      
      if (!document) {
        throw new Error('Document not found for Digio request');
      }

      if (status === 'completed') {
        document.is_signed = true;
        document.signed_at = new Date();
        document.signature_status = 'completed';
        document.status = document.compliance_required ? 'active' : 'signed';
      } else if (status === 'declined') {
        document.signature_status = 'declined';
      } else if (status === 'expired') {
        document.signature_status = 'expired';
      }

      await document.save();

      // Log callback
      await AuditLog.logAction({
        document: document._id,
        document_id: document.document_id,
        user: document.employee,
        user_id: document.employee_id,
        action: 'esign_callback',
        action_description: `Digio callback received: ${status}`,
        document_title: document.title,
        document_type: document.document_type,
        document_status: document.status,
        document_version: document.version,
        employee: document.employee,
        employee_id: document.employee_id,
        signature_info: {
          signature_method: 'digio',
          request_id: requestId,
          signature_status: document.signature_status,
          callback_status: status
        }
      });

      logger.info('Digio callback processed', {
        documentId: document._id,
        requestId,
        status,
        signatureStatus: document.signature_status
      });

      return document;
    } catch (error) {
      logger.error('Digio callback failed', { error: error.message, requestId, status });
      throw error;
    }
  }

  /**
   * Handle Aadhaar e-sign callback
   */
  static async handleAadhaarCallback(requestId, status) {
    try {
      const document = await Document.findOne({ aadhaar_request_id: requestId });
      
      if (!document) {
        throw new Error('Document not found for Aadhaar request');
      }

      if (status === 'completed') {
        document.is_signed = true;
        document.signed_at = new Date();
        document.signature_status = 'completed';
        document.status = document.compliance_required ? 'active' : 'signed';
      } else if (status === 'declined') {
        document.signature_status = 'declined';
      } else if (status === 'expired') {
        document.signature_status = 'expired';
      }

      await document.save();

      // Log callback
      await AuditLog.logAction({
        document: document._id,
        document_id: document.document_id,
        user: document.employee,
        user_id: document.employee_id,
        action: 'esign_callback',
        action_description: `Aadhaar e-sign callback received: ${status}`,
        document_title: document.title,
        document_type: document.document_type,
        document_status: document.status,
        document_version: document.version,
        employee: document.employee,
        employee_id: document.employee_id,
        signature_info: {
          signature_method: 'aadhaar_esign',
          request_id: requestId,
          signature_status: document.signature_status,
          callback_status: status
        }
      });

      logger.info('Aadhaar e-sign callback processed', {
        documentId: document._id,
        requestId,
        status,
        signatureStatus: document.signature_status
      });

      return document;
    } catch (error) {
      logger.error('Aadhaar e-sign callback failed', { error: error.message, requestId, status });
      throw error;
    }
  }

  /**
   * Get DocuSign access token
   */
  static async getDocuSignToken() {
    try {
      const jwt = require('jsonwebtoken');
      const axios = require('axios');

      // Create JWT assertion
      const assertion = jwt.sign({
        iss: process.env.DOCUSIGN_CLIENT_ID,
        sub: process.env.DOCUSIGN_USER_ID,
        aud: 'account-d.docusign.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      }, process.env.DOCUSIGN_PRIVATE_KEY, { algorithm: 'RS256' });

      // Exchange JWT for access token
      const response = await axios.post('https://account-d.docusign.com/oauth/token', {
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: assertion
      });

      return response.data.access_token;
    } catch (error) {
      logger.error('DocuSign token generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get Digio access token
   */
  static async getDigioToken() {
    try {
      const axios = require('axios');

      const response = await axios.post(`${process.env.DIGIO_BASE_URL}/oauth/token`, {
        grant_type: 'client_credentials',
        client_id: process.env.DIGIO_CLIENT_ID,
        client_secret: process.env.DIGIO_CLIENT_SECRET
      });

      return response.data.access_token;
    } catch (error) {
      logger.error('Digio token generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get Aadhaar e-sign access token
   */
  static async getAadhaarToken() {
    try {
      const axios = require('axios');

      const response = await axios.post(`${process.env.AADHAAR_ESIGN_BASE_URL}/oauth/token`, {
        grant_type: 'client_credentials',
        client_id: process.env.AADHAAR_ESIGN_CLIENT_ID,
        client_secret: process.env.AADHAAR_ESIGN_CLIENT_SECRET
      });

      return response.data.access_token;
    } catch (error) {
      logger.error('Aadhaar e-sign token generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get document as base64
   */
  static async getDocumentBase64(storagePath) {
    try {
      const storageService = require('../utils/storage');
      const fileData = await storageService.downloadFile(storagePath);
      return fileData.toString('base64');
    } catch (error) {
      logger.error('Get document base64 failed', { error: error.message, storagePath });
      throw error;
    }
  }

  /**
   * Get signature status
   */
  static async getSignatureStatus(documentId) {
    try {
      const document = await Document.findById(documentId);
      
      if (!document) {
        throw new Error('Document not found');
      }

      return {
        is_signed: document.is_signed,
        signed_at: document.signed_at,
        signature_method: document.signature_method,
        signature_status: document.signature_status,
        signature_metadata: document.signature_metadata
      };
    } catch (error) {
      logger.error('Get signature status failed', { error: error.message, documentId });
      throw error;
    }
  }
}

module.exports = ESignService;

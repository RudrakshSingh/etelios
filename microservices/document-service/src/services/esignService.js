const crypto = require('crypto');
const logger = require('../config/logger');

class ESignService {
  constructor() {
    this.providers = {
      'EMUDHRA': this.emudhraSign,
      'DIGIO': this.digioSign,
      'ESIGN_AADHAAR': this.aadhaarESign
    };
  }

  // Initiate e-signature
  async initiateESign(letterId, signatory, provider = 'ESIGN_AADHAAR') {
    try {
      const signRequest = {
        letterId,
        signatory,
        provider,
        requestId: this.generateRequestId(),
        timestamp: new Date(),
        status: 'PENDING'
      };

      // Store sign request (in real implementation, save to database)
      await this.storeSignRequest(signRequest);

      // Generate signing URL
      const signingUrl = await this.generateSigningUrl(signRequest);

      return {
        requestId: signRequest.requestId,
        signingUrl,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };
    } catch (error) {
      logger.error('Error initiating e-signature:', error);
      throw error;
    }
  }

  // Generate signing URL
  async generateSigningUrl(signRequest) {
    try {
      const baseUrl = process.env.ESIGN_BASE_URL || 'https://esign.example.com';
      const params = new URLSearchParams({
        requestId: signRequest.requestId,
        letterId: signRequest.letterId,
        signatory: signRequest.signatory,
        provider: signRequest.provider,
        timestamp: signRequest.timestamp.getTime(),
        signature: this.generateSignature(signRequest)
      });

      return `${baseUrl}/sign?${params.toString()}`;
    } catch (error) {
      logger.error('Error generating signing URL:', error);
      throw error;
    }
  }

  // Generate signature for request
  generateSignature(signRequest) {
    const secret = process.env.ESIGN_SECRET || 'default-secret';
    const data = `${signRequest.requestId}${signRequest.letterId}${signRequest.timestamp.getTime()}`;
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  // Generate request ID
  generateRequestId() {
    return `ESIGN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Store sign request
  async storeSignRequest(signRequest) {
    // In real implementation, save to database
    logger.info('Storing sign request:', signRequest.requestId);
  }

  // Verify signature
  async verifySignature(requestId, signature) {
    try {
      // In real implementation, verify with e-sign provider
      const isValid = this.validateSignature(requestId, signature);
      
      if (isValid) {
        await this.updateSignRequestStatus(requestId, 'COMPLETED');
        return { success: true, message: 'Signature verified successfully' };
      } else {
        await this.updateSignRequestStatus(requestId, 'FAILED');
        return { success: false, message: 'Invalid signature' };
      }
    } catch (error) {
      logger.error('Error verifying signature:', error);
      throw error;
    }
  }

  // Validate signature
  validateSignature(requestId, signature) {
    // In real implementation, validate with e-sign provider
    // For now, return true for demo purposes
    return true;
  }

  // Update sign request status
  async updateSignRequestStatus(requestId, status) {
    // In real implementation, update database
    logger.info(`Updating sign request ${requestId} status to ${status}`);
  }

  // Get signature status
  async getSignatureStatus(requestId) {
    try {
      // In real implementation, query database
      return {
        requestId,
        status: 'COMPLETED',
        signedAt: new Date(),
        signatureUrl: `/api/signatures/${requestId}/download`
      };
    } catch (error) {
      logger.error('Error getting signature status:', error);
      throw error;
    }
  }

  // Cancel signature
  async cancelSignature(requestId, reason) {
    try {
      await this.updateSignRequestStatus(requestId, 'CANCELLED');
      return { success: true, message: 'Signature cancelled successfully' };
    } catch (error) {
      logger.error('Error cancelling signature:', error);
      throw error;
    }
  }

  // E-Mudhra integration
  async emudhraSign(signRequest) {
    try {
      // E-Mudhra specific implementation
      const apiKey = process.env.EMUDHRA_API_KEY;
      const apiSecret = process.env.EMUDHRA_API_SECRET;
      
      // Make API call to E-Mudhra
      const response = await this.makeAPICall('https://api.emudhra.com/sign', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requestId: signRequest.requestId,
          documentId: signRequest.letterId,
          signatory: signRequest.signatory
        })
      });

      return response;
    } catch (error) {
      logger.error('Error with E-Mudhra signing:', error);
      throw error;
    }
  }

  // Digio integration
  async digioSign(signRequest) {
    try {
      // Digio specific implementation
      const apiKey = process.env.DIGIO_API_KEY;
      const apiSecret = process.env.DIGIO_API_SECRET;
      
      // Make API call to Digio
      const response = await this.makeAPICall('https://api.digio.in/sign', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requestId: signRequest.requestId,
          documentId: signRequest.letterId,
          signatory: signRequest.signatory
        })
      });

      return response;
    } catch (error) {
      logger.error('Error with Digio signing:', error);
      throw error;
    }
  }

  // Aadhaar eSign integration
  async aadhaarESign(signRequest) {
    try {
      // Aadhaar eSign specific implementation
      const apiKey = process.env.AADHAAR_ESIGN_API_KEY;
      const apiSecret = process.env.AADHAAR_ESIGN_API_SECRET;
      
      // Make API call to Aadhaar eSign
      const response = await this.makeAPICall('https://api.aadhaar-esign.in/sign', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requestId: signRequest.requestId,
          documentId: signRequest.letterId,
          signatory: signRequest.signatory
        })
      });

      return response;
    } catch (error) {
      logger.error('Error with Aadhaar eSign:', error);
      throw error;
    }
  }

  // Make API call
  async makeAPICall(url, options) {
    try {
      const fetch = require('node-fetch');
      const response = await fetch(url, options);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`API call failed: ${data.message || response.statusText}`);
      }
      
      return data;
    } catch (error) {
      logger.error('Error making API call:', error);
      throw error;
    }
  }

  // Webhook handler for e-sign providers
  async handleWebhook(provider, payload) {
    try {
      const { requestId, status, signatureUrl, signedAt } = payload;
      
      // Update sign request status
      await this.updateSignRequestStatus(requestId, status);
      
      if (status === 'COMPLETED') {
        // Update letter with signature
        await this.updateLetterWithSignature(requestId, signatureUrl, signedAt);
      }
      
      return { success: true };
    } catch (error) {
      logger.error('Error handling webhook:', error);
      throw error;
    }
  }

  // Update letter with signature
  async updateLetterWithSignature(requestId, signatureUrl, signedAt) {
    try {
      const HRLetter = require('../models/HRLetter.model');
      
      // Find letter by request ID (in real implementation, store mapping)
      const letter = await HRLetter.findOne({ 'signatories.requestId': requestId });
      
      if (letter) {
        // Update signatory with signature
        const signatory = letter.signatories.find(s => s.requestId === requestId);
        if (signatory) {
          signatory.signedAt = new Date(signedAt);
          signatory.signatureUrl = signatureUrl;
          await letter.save();
        }
      }
    } catch (error) {
      logger.error('Error updating letter with signature:', error);
      throw error;
    }
  }
}

module.exports = new ESignService();

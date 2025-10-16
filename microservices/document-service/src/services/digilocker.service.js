const axios = require('axios');
const crypto = require('crypto');
const { logger } = require('../config/logger');

class DigiLockerService {
  constructor() {
    this.baseURL = process.env.DIGILOCKER_BASE_URL || 'https://api.digilocker.gov.in';
    this.clientId = process.env.DIGILOCKER_CLIENT_ID;
    this.clientSecret = process.env.DIGILOCKER_CLIENT_SECRET;
    this.redirectURI = process.env.DIGILOCKER_REDIRECT_URI;
    this.apiKey = process.env.DIGILOCKER_API_KEY;
  }

  /**
   * Generate OAuth URL for DigiLocker authentication
   */
  generateAuthURL(state) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectURI,
      state: state,
      scope: 'read write'
    });

    return `${this.baseURL}/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async getAccessToken(code) {
    try {
      const response = await axios.post(`${this.baseURL}/oauth/token`, {
        grant_type: 'authorization_code',
        code: code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectURI
      });

      return response.data;
    } catch (error) {
      logger.error('DigiLocker token exchange failed', { error: error.message });
      throw new Error('Failed to get DigiLocker access token');
    }
  }

  /**
   * Get user profile from DigiLocker
   */
  async getUserProfile(accessToken) {
    try {
      const response = await axios.get(`${this.baseURL}/api/user/profile`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-API-Key': this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      logger.error('DigiLocker profile fetch failed', { error: error.message });
      throw new Error('Failed to get user profile from DigiLocker');
    }
  }

  /**
   * Upload document to DigiLocker
   */
  async uploadDocument(accessToken, documentData) {
    try {
      const formData = new FormData();
      formData.append('file', documentData.file);
      formData.append('name', documentData.name);
      formData.append('type', documentData.type);
      formData.append('description', documentData.description);

      const response = await axios.post(`${this.baseURL}/api/documents/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-API-Key': this.apiKey,
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data;
    } catch (error) {
      logger.error('DigiLocker document upload failed', { error: error.message });
      throw new Error('Failed to upload document to DigiLocker');
    }
  }

  /**
   * Get document from DigiLocker
   */
  async getDocument(accessToken, documentId) {
    try {
      const response = await axios.get(`${this.baseURL}/api/documents/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-API-Key': this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      logger.error('DigiLocker document fetch failed', { error: error.message });
      throw new Error('Failed to get document from DigiLocker');
    }
  }

  /**
   * Verify document authenticity using DigiLocker
   */
  async verifyDocument(accessToken, documentId) {
    try {
      const response = await axios.post(`${this.baseURL}/api/documents/${documentId}/verify`, {}, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-API-Key': this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      logger.error('DigiLocker document verification failed', { error: error.message });
      throw new Error('Failed to verify document in DigiLocker');
    }
  }

  /**
   * Generate document hash for verification
   */
  generateDocumentHash(fileBuffer) {
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Verify document hash
   */
  verifyDocumentHash(fileBuffer, expectedHash) {
    const actualHash = this.generateDocumentHash(fileBuffer);
    return actualHash === expectedHash;
  }

  /**
   * Sync document with DigiLocker
   */
  async syncDocument(accessToken, documentId, localDocument) {
    try {
      const digilockerDocument = await this.getDocument(accessToken, documentId);
      
      // Verify document integrity
      const isVerified = await this.verifyDocument(accessToken, documentId);
      
      if (!isVerified.valid) {
        throw new Error('Document verification failed in DigiLocker');
      }

      return {
        digilocker_id: documentId,
        document_uri: digilockerDocument.uri,
        verification_status: 'VERIFIED',
        verified_at: new Date(),
        document_hash: digilockerDocument.hash,
        sync_status: 'SYNCED',
        last_sync: new Date()
      };
    } catch (error) {
      logger.error('DigiLocker document sync failed', { error: error.message });
      throw new Error('Failed to sync document with DigiLocker');
    }
  }

  /**
   * Get user's documents from DigiLocker
   */
  async getUserDocuments(accessToken, limit = 50, offset = 0) {
    try {
      const response = await axios.get(`${this.baseURL}/api/documents`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-API-Key': this.apiKey
        },
        params: {
          limit,
          offset
        }
      });

      return response.data;
    } catch (error) {
      logger.error('DigiLocker documents fetch failed', { error: error.message });
      throw new Error('Failed to get user documents from DigiLocker');
    }
  }

  /**
   * Revoke access token
   */
  async revokeToken(accessToken) {
    try {
      await axios.post(`${this.baseURL}/oauth/revoke`, {
        token: accessToken,
        client_id: this.clientId,
        client_secret: this.clientSecret
      });

      return true;
    } catch (error) {
      logger.error('DigiLocker token revocation failed', { error: error.message });
      throw new Error('Failed to revoke DigiLocker token');
    }
  }

  /**
   * Check if DigiLocker is configured
   */
  isConfigured() {
    return !!(this.clientId && this.clientSecret && this.apiKey);
  }

  /**
   * Get DigiLocker configuration status
   */
  getConfigurationStatus() {
    return {
      baseURL: this.baseURL,
      clientId: !!this.clientId,
      clientSecret: !!this.clientSecret,
      apiKey: !!this.apiKey,
      redirectURI: this.redirectURI,
      isConfigured: this.isConfigured()
    };
  }
}

module.exports = new DigiLockerService();

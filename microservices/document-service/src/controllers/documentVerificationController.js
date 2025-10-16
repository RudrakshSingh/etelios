const Document = require('../models/Document.model');
const EmployeeDocument = require('../models/EmployeeDocument.model');
const logger = require('../config/logger');

class DocumentVerificationController {
  /**
   * Reject document verification
   */
  async rejectDocumentVerification(req, res) {
    try {
      const { documentId } = req.params;
      const { rejectionReason, verificationNotes } = req.body;
      const rejectedBy = req.user._id;

      if (!rejectionReason) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required'
        });
      }

      // Find the document
      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      // Check if document is in a state that can be rejected
      if (!['pending_signature', 'pending_approval'].includes(document.status)) {
        return res.status(400).json({
          success: false,
          message: 'Document cannot be rejected in current status'
        });
      }

      // Update document status to rejected
      document.status = 'rejected';
      document.workflow_stage = 'rejected';
      document.rejection_reason = rejectionReason;
      document.rejected_by = rejectedBy;
      document.rejected_at = new Date();
      document.verification_notes = verificationNotes || '';

      // Add audit entry
      document.audit_log.push({
        action: 'VERIFICATION_REJECTED',
        user: rejectedBy,
        timestamp: new Date(),
        details: {
          rejection_reason: rejectionReason,
          verification_notes: verificationNotes
        }
      });

      await document.save();

      logger.info('Document verification rejected', {
        documentId: document._id,
        rejectedBy,
        rejectionReason
      });

      res.status(200).json({
        success: true,
        message: 'Document verification rejected successfully',
        data: {
          documentId: document._id,
          status: document.status,
          rejectionReason,
          rejectedAt: document.rejected_at
        }
      });

    } catch (error) {
      logger.error('Error rejecting document verification:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Reject employee document verification
   */
  async rejectEmployeeDocumentVerification(req, res) {
    try {
      const { documentId } = req.params;
      const { rejectionReason, verificationNotes } = req.body;
      const rejectedBy = req.user._id;

      if (!rejectionReason) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required'
        });
      }

      // Find the employee document
      const employeeDocument = await EmployeeDocument.findById(documentId);
      if (!employeeDocument) {
        return res.status(404).json({
          success: false,
          message: 'Employee document not found'
        });
      }

      // Check if document is in a state that can be rejected
      if (!['PENDING_SIGNATURE', 'DRAFT'].includes(employeeDocument.status)) {
        return res.status(400).json({
          success: false,
          message: 'Employee document cannot be rejected in current status'
        });
      }

      // Update document status to rejected
      employeeDocument.status = 'REJECTED';
      employeeDocument.esign_status = 'FAILED';
      employeeDocument.esign_data.verification_status = 'FAILED';
      employeeDocument.rejection_reason = rejectionReason;
      employeeDocument.rejected_by = rejectedBy;
      employeeDocument.rejected_at = new Date();
      employeeDocument.verification_notes = verificationNotes || '';

      // Add audit entry
      employeeDocument.audit_log.push({
        action: 'VERIFICATION_REJECTED',
        user: rejectedBy,
        timestamp: new Date(),
        details: {
          rejection_reason: rejectionReason,
          verification_notes: verificationNotes
        }
      });

      await employeeDocument.save();

      logger.info('Employee document verification rejected', {
        documentId: employeeDocument._id,
        employeeId: employeeDocument.employee_id,
        rejectedBy,
        rejectionReason
      });

      res.status(200).json({
        success: true,
        message: 'Employee document verification rejected successfully',
        data: {
          documentId: employeeDocument._id,
          status: employeeDocument.status,
          rejectionReason,
          rejectedAt: employeeDocument.rejected_at
        }
      });

    } catch (error) {
      logger.error('Error rejecting employee document verification:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Get rejected documents
   */
  async getRejectedDocuments(req, res) {
    try {
      const { page = 1, limit = 10, documentType, employeeId } = req.query;
      const skip = (page - 1) * limit;

      const filter = {
        status: 'rejected'
      };

      if (documentType) {
        filter.document_type = documentType;
      }

      if (employeeId) {
        filter.employee_id = employeeId;
      }

      const documents = await Document.find(filter)
        .populate('employee_id', 'name employee_id email')
        .populate('document_type', 'name description')
        .populate('rejected_by', 'name employee_id')
        .sort({ rejected_at: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Document.countDocuments(filter);

      res.status(200).json({
        success: true,
        data: {
          documents,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total
          }
        }
      });

    } catch (error) {
      logger.error('Error getting rejected documents:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Get rejected employee documents
   */
  async getRejectedEmployeeDocuments(req, res) {
    try {
      const { page = 1, limit = 10, documentType, employeeId } = req.query;
      const skip = (page - 1) * limit;

      const filter = {
        status: 'REJECTED'
      };

      if (documentType) {
        filter.document_type = documentType;
      }

      if (employeeId) {
        filter.employee_id = employeeId;
      }

      const documents = await EmployeeDocument.find(filter)
        .populate('employee_id', 'name employee_id email')
        .populate('document_type', 'name description')
        .populate('rejected_by', 'name employee_id')
        .sort({ rejected_at: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await EmployeeDocument.countDocuments(filter);

      res.status(200).json({
        success: true,
        data: {
          documents,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total
          }
        }
      });

    } catch (error) {
      logger.error('Error getting rejected employee documents:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }
}

module.exports = new DocumentVerificationController();

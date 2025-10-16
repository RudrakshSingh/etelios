const Document = require('../models/Document.model');
const User = require('../models/User.model');
const AuditLog = require('../models/AuditLog.model');
const logger = require('../config/logger');
const emailService = require('../utils/email');
const smsService = require('../utils/sms');

class DocumentWorkflows {
  /**
   * Onboarding workflow - auto-assign documents to new employees
   */
  static async onboardingWorkflow(employeeId) {
    try {
      const employee = await User.findById(employeeId);
      if (!employee) {
        throw new Error('Employee not found');
      }

      // Define onboarding documents based on role/department
      const onboardingDocuments = await this.getOnboardingDocuments(employee);

      // Create document assignments
      for (const docTemplate of onboardingDocuments) {
        const document = new Document({
          title: docTemplate.title,
          document_type: docTemplate.document_type,
          category: docTemplate.category,
          employee: employee._id,
          employee_id: employee.employee_id,
          file_name: docTemplate.file_name,
          original_name: docTemplate.original_name,
          file_size: docTemplate.file_size,
          mime_type: docTemplate.mime_type,
          file_extension: docTemplate.file_extension,
          storage_provider: docTemplate.storage_provider,
          storage_path: docTemplate.storage_path,
          storage_url: docTemplate.storage_url,
          signature_required: docTemplate.signature_required,
          compliance_required: docTemplate.compliance_required,
          compliance_type: docTemplate.compliance_type,
          expiry_date: docTemplate.expiry_date,
          access_level: docTemplate.access_level,
          department_access: docTemplate.department_access,
          role_access: docTemplate.role_access,
          workflow_assignee: docTemplate.workflow_assignee,
          status: 'pending_signature',
          created_by: docTemplate.created_by
        });

        await document.save();

        // Log document creation
        await AuditLog.logAction({
          document: document._id,
          document_id: document.document_id,
          user: docTemplate.created_by,
          user_id: 'SYSTEM',
          user_name: 'System',
          user_email: 'system@hrms.com',
          user_role: 'system',
          action: 'auto_assign',
          action_description: `Onboarding document auto-assigned: ${document.title}`,
          document_title: document.title,
          document_type: document.document_type,
          document_status: document.status,
          document_version: document.version,
          employee: employee._id,
          employee_id: employee.employee_id,
          employee_name: employee.name,
          employee_email: employee.email,
          workflow_info: {
            workflow_type: 'onboarding',
            auto_assigned: true,
            template_id: docTemplate._id
          }
        });
      }

      // Send onboarding notification
      await this.sendOnboardingNotification(employee, onboardingDocuments.length);

      logger.info('Onboarding workflow completed', {
        employeeId: employee._id,
        documentsAssigned: onboardingDocuments.length
      });

      return onboardingDocuments.length;
    } catch (error) {
      logger.error('Onboarding workflow failed', { error: error.message, employeeId });
      throw error;
    }
  }

  /**
   * Promotion/Transfer workflow - auto-trigger new documents
   */
  static async promotionTransferWorkflow(employeeId, newRole, newDepartment, effectiveDate) {
    try {
      const employee = await User.findById(employeeId);
      if (!employee) {
        throw new Error('Employee not found');
      }

      // Define promotion/transfer documents
      const promotionDocuments = await this.getPromotionDocuments(employee, newRole, newDepartment);

      // Create document assignments
      for (const docTemplate of promotionDocuments) {
        const document = new Document({
          title: docTemplate.title,
          document_type: docTemplate.document_type,
          category: docTemplate.category,
          employee: employee._id,
          employee_id: employee.employee_id,
          file_name: docTemplate.file_name,
          original_name: docTemplate.original_name,
          file_size: docTemplate.file_size,
          mime_type: docTemplate.mime_type,
          file_extension: docTemplate.file_extension,
          storage_provider: docTemplate.storage_provider,
          storage_path: docTemplate.storage_path,
          storage_url: docTemplate.storage_url,
          signature_required: docTemplate.signature_required,
          compliance_required: docTemplate.compliance_required,
          compliance_type: docTemplate.compliance_type,
          expiry_date: docTemplate.expiry_date,
          access_level: docTemplate.access_level,
          department_access: docTemplate.department_access,
          role_access: docTemplate.role_access,
          workflow_assignee: docTemplate.workflow_assignee,
          status: 'pending_signature',
          created_by: docTemplate.created_by
        });

        await document.save();

        // Log document creation
        await AuditLog.logAction({
          document: document._id,
          document_id: document.document_id,
          user: docTemplate.created_by,
          user_id: 'SYSTEM',
          user_name: 'System',
          user_email: 'system@hrms.com',
          user_role: 'system',
          action: 'auto_assign',
          action_description: `Promotion/Transfer document auto-assigned: ${document.title}`,
          document_title: document.title,
          document_type: document.document_type,
          document_status: document.status,
          document_version: document.version,
          employee: employee._id,
          employee_id: employee.employee_id,
          employee_name: employee.name,
          employee_email: employee.email,
          workflow_info: {
            workflow_type: 'promotion_transfer',
            auto_assigned: true,
            new_role: newRole,
            new_department: newDepartment,
            effective_date: effectiveDate,
            template_id: docTemplate._id
          }
        });
      }

      // Send promotion/transfer notification
      await this.sendPromotionTransferNotification(employee, promotionDocuments.length, newRole, newDepartment);

      logger.info('Promotion/Transfer workflow completed', {
        employeeId: employee._id,
        newRole,
        newDepartment,
        documentsAssigned: promotionDocuments.length
      });

      return promotionDocuments.length;
    } catch (error) {
      logger.error('Promotion/Transfer workflow failed', { error: error.message, employeeId });
      throw error;
    }
  }

  /**
   * Exit workflow - auto-assign exit documents
   */
  static async exitWorkflow(employeeId, lastWorkingDate) {
    try {
      const employee = await User.findById(employeeId);
      if (!employee) {
        throw new Error('Employee not found');
      }

      // Define exit documents
      const exitDocuments = await this.getExitDocuments(employee);

      // Create document assignments
      for (const docTemplate of exitDocuments) {
        const document = new Document({
          title: docTemplate.title,
          document_type: docTemplate.document_type,
          category: docTemplate.category,
          employee: employee._id,
          employee_id: employee.employee_id,
          file_name: docTemplate.file_name,
          original_name: docTemplate.original_name,
          file_size: docTemplate.file_size,
          mime_type: docTemplate.mime_type,
          file_extension: docTemplate.file_extension,
          storage_provider: docTemplate.storage_provider,
          storage_path: docTemplate.storage_path,
          storage_url: docTemplate.storage_url,
          signature_required: docTemplate.signature_required,
          compliance_required: docTemplate.compliance_required,
          compliance_type: docTemplate.compliance_type,
          expiry_date: docTemplate.expiry_date,
          access_level: docTemplate.access_level,
          department_access: docTemplate.department_access,
          role_access: docTemplate.role_access,
          workflow_assignee: docTemplate.workflow_assignee,
          status: 'pending_signature',
          created_by: docTemplate.created_by
        });

        await document.save();

        // Log document creation
        await AuditLog.logAction({
          document: document._id,
          document_id: document.document_id,
          user: docTemplate.created_by,
          user_id: 'SYSTEM',
          user_name: 'System',
          user_email: 'system@hrms.com',
          user_role: 'system',
          action: 'auto_assign',
          action_description: `Exit document auto-assigned: ${document.title}`,
          document_title: document.title,
          document_type: document.document_type,
          document_status: document.status,
          document_version: document.version,
          employee: employee._id,
          employee_id: employee.employee_id,
          employee_name: employee.name,
          employee_email: employee.email,
          workflow_info: {
            workflow_type: 'exit',
            auto_assigned: true,
            last_working_date: lastWorkingDate,
            template_id: docTemplate._id
          }
        });
      }

      // Send exit notification
      await this.sendExitNotification(employee, exitDocuments.length, lastWorkingDate);

      logger.info('Exit workflow completed', {
        employeeId: employee._id,
        lastWorkingDate,
        documentsAssigned: exitDocuments.length
      });

      return exitDocuments.length;
    } catch (error) {
      logger.error('Exit workflow failed', { error: error.message, employeeId });
      throw error;
    }
  }

  /**
   * Send reminder notifications for pending signatures
   */
  static async sendSignatureReminders() {
    try {
      // Get documents pending signature for more than 24 hours
      const pendingDocuments = await Document.find({
        signature_required: true,
        status: 'pending_signature',
        is_deleted: false,
        is_latest: true,
        created_at: { $lte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // 24 hours ago
      }).populate('employee', 'name email phone');

      for (const document of pendingDocuments) {
        // Check if reminder was already sent today
        const lastReminder = await AuditLog.findOne({
          document: document._id,
          action: 'reminder_sent',
          timestamp: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        });

        if (!lastReminder) {
          await this.sendSignatureReminder(document);
        }
      }

      logger.info('Signature reminders processed', {
        pendingDocuments: pendingDocuments.length
      });

      return pendingDocuments.length;
    } catch (error) {
      logger.error('Send signature reminders failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Send escalation notifications for overdue signatures
   */
  static async sendEscalationNotifications() {
    try {
      // Get documents pending signature for more than 7 days
      const overdueDocuments = await Document.find({
        signature_required: true,
        status: 'pending_signature',
        is_deleted: false,
        is_latest: true,
        created_at: { $lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 7 days ago
      }).populate('employee', 'name email phone department')
        .populate('created_by', 'name email');

      for (const document of overdueDocuments) {
        await this.sendEscalationNotification(document);
      }

      logger.info('Escalation notifications processed', {
        overdueDocuments: overdueDocuments.length
      });

      return overdueDocuments.length;
    } catch (error) {
      logger.error('Send escalation notifications failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Send expiry notifications
   */
  static async sendExpiryNotifications() {
    try {
      // Get documents expiring in the next 30 days
      const expiringDocuments = await Document.find({
        expiry_date: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), $gte: new Date() },
        is_deleted: false,
        is_latest: true
      }).populate('employee', 'name email phone')
        .populate('created_by', 'name email');

      for (const document of expiringDocuments) {
        await this.sendExpiryNotification(document);
      }

      logger.info('Expiry notifications processed', {
        expiringDocuments: expiringDocuments.length
      });

      return expiringDocuments.length;
    } catch (error) {
      logger.error('Send expiry notifications failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get onboarding documents based on employee role/department
   */
  static async getOnboardingDocuments(employee) {
    // This should be implemented based on your organization's requirements
    // For now, return a basic set of onboarding documents
    return [
      {
        title: 'Offer Letter',
        document_type: 'offer_letter',
        category: 'employment',
        signature_required: true,
        compliance_required: false,
        access_level: 'restricted',
        created_by: 'SYSTEM'
      },
      {
        title: 'Non-Disclosure Agreement',
        document_type: 'nda',
        category: 'compliance',
        signature_required: true,
        compliance_required: true,
        compliance_type: 'nda',
        access_level: 'confidential',
        created_by: 'SYSTEM'
      },
      {
        title: 'POSH Acknowledgment',
        document_type: 'posh_acknowledgment',
        category: 'compliance',
        signature_required: true,
        compliance_required: true,
        compliance_type: 'posh',
        access_level: 'restricted',
        created_by: 'SYSTEM'
      },
      {
        title: 'Company Handbook',
        document_type: 'company_handbook',
        category: 'policies',
        signature_required: true,
        compliance_required: false,
        access_level: 'public',
        created_by: 'SYSTEM'
      }
    ];
  }

  /**
   * Get promotion documents
   */
  static async getPromotionDocuments(employee, newRole, newDepartment) {
    return [
      {
        title: 'Promotion Letter',
        document_type: 'promotion_letter',
        category: 'letters',
        signature_required: true,
        compliance_required: false,
        access_level: 'restricted',
        created_by: 'SYSTEM'
      },
      {
        title: 'Salary Revision Letter',
        document_type: 'salary_letter',
        category: 'letters',
        signature_required: true,
        compliance_required: false,
        access_level: 'confidential',
        created_by: 'SYSTEM'
      }
    ];
  }

  /**
   * Get exit documents
   */
  static async getExitDocuments(employee) {
    return [
      {
        title: 'No Dues Certificate',
        document_type: 'exit_document',
        category: 'exit',
        signature_required: true,
        compliance_required: false,
        access_level: 'restricted',
        created_by: 'SYSTEM'
      },
      {
        title: 'Full and Final Settlement',
        document_type: 'exit_document',
        category: 'exit',
        signature_required: true,
        compliance_required: false,
        access_level: 'confidential',
        created_by: 'SYSTEM'
      }
    ];
  }

  /**
   * Send onboarding notification
   */
  static async sendOnboardingNotification(employee, documentCount) {
    try {
      const emailData = {
        to: employee.email,
        subject: 'Welcome! Please sign your onboarding documents',
        template: 'onboarding',
        data: {
          name: employee.name,
          documentCount,
          loginUrl: `${process.env.FRONTEND_URL}/documents`
        }
      };

      await emailService.sendEmail(emailData);

      // Send SMS if phone number is available
      if (employee.phone) {
        await smsService.sendSMS({
          to: employee.phone,
          message: `Welcome to the team! Please sign your ${documentCount} onboarding documents. Login: ${process.env.FRONTEND_URL}/documents`
        });
      }

      logger.info('Onboarding notification sent', {
        employeeId: employee._id,
        email: employee.email,
        phone: employee.phone
      });
    } catch (error) {
      logger.error('Send onboarding notification failed', { error: error.message, employeeId: employee._id });
    }
  }

  /**
   * Send promotion/transfer notification
   */
  static async sendPromotionTransferNotification(employee, documentCount, newRole, newDepartment) {
    try {
      const emailData = {
        to: employee.email,
        subject: 'Congratulations! Please sign your promotion/transfer documents',
        template: 'promotion_transfer',
        data: {
          name: employee.name,
          newRole,
          newDepartment,
          documentCount,
          loginUrl: `${process.env.FRONTEND_URL}/documents`
        }
      };

      await emailService.sendEmail(emailData);

      logger.info('Promotion/Transfer notification sent', {
        employeeId: employee._id,
        newRole,
        newDepartment
      });
    } catch (error) {
      logger.error('Send promotion/transfer notification failed', { error: error.message, employeeId: employee._id });
    }
  }

  /**
   * Send exit notification
   */
  static async sendExitNotification(employee, documentCount, lastWorkingDate) {
    try {
      const emailData = {
        to: employee.email,
        subject: 'Exit Process - Please sign your exit documents',
        template: 'exit',
        data: {
          name: employee.name,
          lastWorkingDate,
          documentCount,
          loginUrl: `${process.env.FRONTEND_URL}/documents`
        }
      };

      await emailService.sendEmail(emailData);

      logger.info('Exit notification sent', {
        employeeId: employee._id,
        lastWorkingDate
      });
    } catch (error) {
      logger.error('Send exit notification failed', { error: error.message, employeeId: employee._id });
    }
  }

  /**
   * Send signature reminder
   */
  static async sendSignatureReminder(document) {
    try {
      const emailData = {
        to: document.employee.email,
        subject: 'Reminder: Please sign your pending document',
        template: 'signature_reminder',
        data: {
          name: document.employee.name,
          documentTitle: document.title,
          documentType: document.document_type,
          loginUrl: `${process.env.FRONTEND_URL}/documents/${document._id}`
        }
      };

      await emailService.sendEmail(emailData);

      // Log reminder sent
      await AuditLog.logAction({
        document: document._id,
        document_id: document.document_id,
        user: document.employee._id,
        user_id: document.employee.employee_id,
        user_name: document.employee.name,
        user_email: document.employee.email,
        user_role: document.employee.role,
        action: 'reminder_sent',
        action_description: `Signature reminder sent: ${document.title}`,
        document_title: document.title,
        document_type: document.document_type,
        document_status: document.status,
        document_version: document.version,
        employee: document.employee._id,
        employee_id: document.employee.employee_id,
        employee_name: document.employee.name,
        employee_email: document.employee.email
      });

      logger.info('Signature reminder sent', {
        documentId: document._id,
        employeeId: document.employee._id
      });
    } catch (error) {
      logger.error('Send signature reminder failed', { error: error.message, documentId: document._id });
    }
  }

  /**
   * Send escalation notification
   */
  static async sendEscalationNotification(document) {
    try {
      // Notify HR and manager
      const hrUsers = await User.find({ role: { $in: ['hr', 'admin'] } });
      const manager = await User.findById(document.employee.manager);

      const recipients = [...hrUsers, manager].filter(Boolean);

      for (const recipient of recipients) {
        const emailData = {
          to: recipient.email,
          subject: 'URGENT: Overdue document signature required',
          template: 'escalation',
          data: {
            name: recipient.name,
            employeeName: document.employee.name,
            documentTitle: document.title,
            documentType: document.document_type,
            daysOverdue: Math.floor((Date.now() - document.created_at) / (24 * 60 * 60 * 1000)),
            loginUrl: `${process.env.FRONTEND_URL}/documents/${document._id}`
          }
        };

        await emailService.sendEmail(emailData);
      }

      logger.info('Escalation notification sent', {
        documentId: document._id,
        recipients: recipients.length
      });
    } catch (error) {
      logger.error('Send escalation notification failed', { error: error.message, documentId: document._id });
    }
  }

  /**
   * Send expiry notification
   */
  static async sendExpiryNotification(document) {
    try {
      const daysUntilExpiry = Math.ceil((document.expiry_date - new Date()) / (24 * 60 * 60 * 1000));

      const emailData = {
        to: document.employee.email,
        subject: `Document expiring in ${daysUntilExpiry} days`,
        template: 'expiry_reminder',
        data: {
          name: document.employee.name,
          documentTitle: document.title,
          documentType: document.document_type,
          expiryDate: document.expiry_date,
          daysUntilExpiry,
          loginUrl: `${process.env.FRONTEND_URL}/documents/${document._id}`
        }
      };

      await emailService.sendEmail(emailData);

      logger.info('Expiry notification sent', {
        documentId: document._id,
        daysUntilExpiry
      });
    } catch (error) {
      logger.error('Send expiry notification failed', { error: error.message, documentId: document._id });
    }
  }
}

module.exports = DocumentWorkflows;

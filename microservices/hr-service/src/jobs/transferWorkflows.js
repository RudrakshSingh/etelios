const Transfer = require('../models/Transfer.model');
const User = require('../models/User.model');
const Store = require('../models/Store.model');
const AuditLog = require('../models/AuditLog.model');
const logger = require('../config/logger');
const emailService = require('../utils/email');
const smsService = require('../utils/sms');
const { addJob } = require('../utils/queueUtils');

/**
 * Transfer Workflow Automation Jobs
 * Handles automated transfer approval workflows, notifications, and escalations
 */
class TransferWorkflows {
  /**
   * Initiates transfer approval workflow
   * @param {string} transferId - Transfer request ID
   */
  static async initiateTransferApprovalWorkflow(transferId) {
    try {
      const transfer = await Transfer.findById(transferId)
        .populate('employee')
        .populate('from_store')
        .populate('to_store')
        .populate('from_manager')
        .populate('to_manager');

      if (!transfer) {
        throw new Error('Transfer request not found');
      }

      // Determine approval workflow based on transfer type
      const workflow = await this.determineApprovalWorkflow(transfer);
      
      // Set up approval workflow
      transfer.approval_workflow = workflow;
      await transfer.save();

      // Send notifications to approvers
      await this.notifyApprovers(transfer);

      // Schedule escalation checks
      await this.scheduleEscalationChecks(transfer);

      // Log workflow initiation
      await this.logWorkflowAction(transfer._id, 'WORKFLOW_INITIATED', {
        workflow_steps: workflow.length,
        transfer_type: transfer.transfer_type
      });

      logger.info('Transfer approval workflow initiated', {
        transferId: transfer._id,
        employeeId: transfer.employee._id,
        workflowSteps: workflow.length
      });

    } catch (error) {
      logger.error('Error initiating transfer approval workflow', {
        error: error.message,
        transferId
      });
      throw error;
    }
  }

  /**
   * Determines approval workflow based on transfer type and company policy
   * @param {Object} transfer - Transfer request
   * @returns {Array} Approval workflow steps
   */
  static async determineApprovalWorkflow(transfer) {
    const workflow = [];

    switch (transfer.transfer_type) {
      case 'store_transfer':
        // Store transfers require: Manager -> HR -> Admin
        workflow.push({
          approver: transfer.from_manager,
          approver_role: 'manager',
          status: 'pending',
          order: 1
        });
        workflow.push({
          approver: await this.getHRManager(),
          approver_role: 'hr',
          status: 'pending',
          order: 2
        });
        workflow.push({
          approver: await this.getAdminUser(),
          approver_role: 'admin',
          status: 'pending',
          order: 3
        });
        break;

      case 'department_transfer':
        // Department transfers require: Manager -> HR
        workflow.push({
          approver: transfer.from_manager,
          approver_role: 'manager',
          status: 'pending',
          order: 1
        });
        workflow.push({
          approver: await this.getHRManager(),
          approver_role: 'hr',
          status: 'pending',
          order: 2
        });
        break;

      case 'role_transfer':
        // Role transfers require: Manager -> HR -> Admin
        workflow.push({
          approver: transfer.from_manager,
          approver_role: 'manager',
          status: 'pending',
          order: 1
        });
        workflow.push({
          approver: await this.getHRManager(),
          approver_role: 'hr',
          status: 'pending',
          order: 2
        });
        workflow.push({
          approver: await this.getAdminUser(),
          approver_role: 'admin',
          status: 'pending',
          order: 3
        });
        break;

      case 'location_transfer':
        // Location transfers require: Manager -> HR
        workflow.push({
          approver: transfer.from_manager,
          approver_role: 'manager',
          status: 'pending',
          order: 1
        });
        workflow.push({
          approver: await this.getHRManager(),
          approver_role: 'hr',
          status: 'pending',
          order: 2
        });
        break;

      default:
        // Default workflow: Manager -> HR
        workflow.push({
          approver: transfer.from_manager,
          approver_role: 'manager',
          status: 'pending',
          order: 1
        });
        workflow.push({
          approver: await this.getHRManager(),
          approver_role: 'hr',
          status: 'pending',
          order: 2
        });
    }

    return workflow;
  }

  /**
   * Notifies all approvers in the workflow
   * @param {Object} transfer - Transfer request
   */
  static async notifyApprovers(transfer) {
    try {
      for (const approvalStep of transfer.approval_workflow) {
        if (approvalStep.status === 'pending') {
          const approver = await User.findById(approvalStep.approver);
          if (approver) {
            // Send email notification
            await this.sendApprovalNotificationEmail(approver, transfer);
            
            // Send SMS notification if enabled
            if (approver.phone && process.env.SMS_ENABLED === 'true') {
              await this.sendApprovalNotificationSMS(approver, transfer);
            }
          }
        }
      }
    } catch (error) {
      logger.error('Error notifying approvers', {
        error: error.message,
        transferId: transfer._id
      });
    }
  }

  /**
   * Sends approval notification email to approver
   * @param {Object} approver - Approver user object
   * @param {Object} transfer - Transfer request
   */
  static async sendApprovalNotificationEmail(approver, transfer) {
    try {
      const subject = `Transfer Approval Required - ${transfer.employee.first_name} ${transfer.employee.last_name}`;
      const html = `
        <h2>Transfer Approval Required</h2>
        <p>Dear ${approver.first_name},</p>
        <p>A transfer request requires your approval:</p>
        <ul>
          <li><strong>Employee:</strong> ${transfer.employee.first_name} ${transfer.employee.last_name} (${transfer.employee_id})</li>
          <li><strong>Transfer Type:</strong> ${transfer.transfer_type.replace('_', ' ').toUpperCase()}</li>
          <li><strong>From:</strong> ${transfer.from_store?.name || 'N/A'} - ${transfer.from_department}</li>
          <li><strong>To:</strong> ${transfer.to_store?.name || 'N/A'} - ${transfer.to_department}</li>
          <li><strong>Effective Date:</strong> ${new Date(transfer.effective_date).toLocaleDateString()}</li>
          <li><strong>Reason:</strong> ${transfer.reason}</li>
        </ul>
        <p>Please review and approve/reject this transfer request.</p>
        <p><a href="${process.env.FRONTEND_URL}/transfers/${transfer._id}/approve">Review Transfer Request</a></p>
        <p>Best regards,<br>HRMS System</p>
      `;

      await emailService.sendEmail(approver.email, subject, '', html);
      
      logger.info('Approval notification email sent', {
        approverId: approver._id,
        transferId: transfer._id
      });
    } catch (error) {
      logger.error('Error sending approval notification email', {
        error: error.message,
        approverId: approver._id,
        transferId: transfer._id
      });
    }
  }

  /**
   * Sends approval notification SMS to approver
   * @param {Object} approver - Approver user object
   * @param {Object} transfer - Transfer request
   */
  static async sendApprovalNotificationSMS(approver, transfer) {
    try {
      const message = `HRMS: Transfer approval required for ${transfer.employee.first_name} ${transfer.employee.last_name}. Please review at ${process.env.FRONTEND_URL}/transfers/${transfer._id}/approve`;
      
      await smsService.sendSMS(approver.phone, message);
      
      logger.info('Approval notification SMS sent', {
        approverId: approver._id,
        transferId: transfer._id
      });
    } catch (error) {
      logger.error('Error sending approval notification SMS', {
        error: error.message,
        approverId: approver._id,
        transferId: transfer._id
      });
    }
  }

  /**
   * Schedules escalation checks for pending approvals
   * @param {Object} transfer - Transfer request
   */
  static async scheduleEscalationChecks(transfer) {
    try {
      // Schedule escalation after 24 hours
      await addJob('transfer-queue', 'escalate-transfer-approval', {
        transferId: transfer._id,
        escalationLevel: 1
      }, {
        delay: 24 * 60 * 60 * 1000, // 24 hours
        attempts: 3
      });

      // Schedule final escalation after 72 hours
      await addJob('transfer-queue', 'escalate-transfer-approval', {
        transferId: transfer._id,
        escalationLevel: 2
      }, {
        delay: 72 * 60 * 60 * 1000, // 72 hours
        attempts: 3
      });

      logger.info('Escalation checks scheduled', {
        transferId: transfer._id
      });
    } catch (error) {
      logger.error('Error scheduling escalation checks', {
        error: error.message,
        transferId: transfer._id
      });
    }
  }

  /**
   * Handles transfer approval escalation
   * @param {string} transferId - Transfer request ID
   * @param {number} escalationLevel - Escalation level (1 or 2)
   */
  static async escalateTransferApproval(transferId, escalationLevel) {
    try {
      const transfer = await Transfer.findById(transferId)
        .populate('employee')
        .populate('from_store')
        .populate('to_store');

      if (!transfer) {
        throw new Error('Transfer request not found');
      }

      // Check if transfer is still pending
      if (transfer.status !== 'pending' && transfer.status !== 'approved_by_manager') {
        logger.info('Transfer no longer pending, skipping escalation', {
          transferId,
          status: transfer.status
        });
        return;
      }

      // Find pending approvers
      const pendingApprovers = transfer.approval_workflow.filter(
        step => step.status === 'pending'
      );

      if (pendingApprovers.length === 0) {
        logger.info('No pending approvers found, skipping escalation', { transferId });
        return;
      }

      // Send escalation notifications
      for (const pendingApproval of pendingApprovers) {
        const approver = await User.findById(pendingApproval.approver);
        if (approver) {
          await this.sendEscalationNotification(approver, transfer, escalationLevel);
        }
      }

      // Log escalation
      await this.logWorkflowAction(transferId, 'ESCALATION_SENT', {
        escalationLevel,
        pendingApprovers: pendingApprovers.length
      });

      logger.info('Transfer approval escalated', {
        transferId,
        escalationLevel,
        pendingApprovers: pendingApprovers.length
      });

    } catch (error) {
      logger.error('Error escalating transfer approval', {
        error: error.message,
        transferId,
        escalationLevel
      });
      throw error;
    }
  }

  /**
   * Sends escalation notification to approver
   * @param {Object} approver - Approver user object
   * @param {Object} transfer - Transfer request
   * @param {number} escalationLevel - Escalation level
   */
  static async sendEscalationNotification(approver, transfer, escalationLevel) {
    try {
      const urgency = escalationLevel === 1 ? 'URGENT' : 'CRITICAL';
      const subject = `${urgency}: Transfer Approval Overdue - ${transfer.employee.first_name} ${transfer.employee.last_name}`;
      
      const html = `
        <h2 style="color: ${escalationLevel === 1 ? 'orange' : 'red'};">${urgency} - Transfer Approval Overdue</h2>
        <p>Dear ${approver.first_name},</p>
        <p>This is an escalation notice for a pending transfer approval:</p>
        <ul>
          <li><strong>Employee:</strong> ${transfer.employee.first_name} ${transfer.employee.last_name} (${transfer.employee_id})</li>
          <li><strong>Transfer Type:</strong> ${transfer.transfer_type.replace('_', ' ').toUpperCase()}</li>
          <li><strong>Request Date:</strong> ${new Date(transfer.request_date).toLocaleDateString()}</li>
          <li><strong>Days Pending:</strong> ${Math.floor((new Date() - new Date(transfer.request_date)) / (1000 * 60 * 60 * 24))} days</li>
        </ul>
        <p style="color: ${escalationLevel === 1 ? 'orange' : 'red'}; font-weight: bold;">
          ${escalationLevel === 1 ? 'This approval is overdue. Please review immediately.' : 'This approval is critically overdue. Immediate action required.'}
        </p>
        <p><a href="${process.env.FRONTEND_URL}/transfers/${transfer._id}/approve" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Transfer Request</a></p>
        <p>Best regards,<br>HRMS System</p>
      `;

      await emailService.sendEmail(approver.email, subject, '', html);
      
      logger.info('Escalation notification sent', {
        approverId: approver._id,
        transferId: transfer._id,
        escalationLevel
      });
    } catch (error) {
      logger.error('Error sending escalation notification', {
        error: error.message,
        approverId: approver._id,
        transferId: transfer._id,
        escalationLevel
      });
    }
  }

  /**
   * Processes transfer approval
   * @param {string} transferId - Transfer request ID
   * @param {string} approverId - Approver user ID
   * @param {string} status - Approval status ('approved' or 'rejected')
   * @param {string} comments - Approval comments
   */
  static async processTransferApproval(transferId, approverId, status, comments) {
    try {
      const transfer = await Transfer.findById(transferId)
        .populate('employee')
        .populate('from_store')
        .populate('to_store');

      if (!transfer) {
        throw new Error('Transfer request not found');
      }

      // Find the approval step for this approver
      const approvalStep = transfer.approval_workflow.find(
        step => step.approver.toString() === approverId && step.status === 'pending'
      );

      if (!approvalStep) {
        throw new Error('No pending approval found for this approver');
      }

      // Update approval step
      approvalStep.status = status;
      approvalStep.comments = comments;
      approvalStep.approved_at = new Date();

      // Update overall transfer status
      if (status === 'approved') {
        if (approvalStep.approver_role === 'manager') {
          transfer.status = 'approved_by_manager';
        } else if (approvalStep.approver_role === 'hr' || approvalStep.approver_role === 'admin') {
          transfer.status = 'approved';
          transfer.approved_by = approverId;
          transfer.approved_at = new Date();
        }
      } else if (status === 'rejected') {
        transfer.status = 'rejected';
        transfer.rejected_by = approverId;
        transfer.rejected_at = new Date();
        transfer.rejection_reason = comments;
      }

      await transfer.save();

      // Send notifications
      await this.sendApprovalResultNotifications(transfer, status, comments);

      // If approved, schedule execution
      if (transfer.status === 'approved') {
        await this.scheduleTransferExecution(transfer);
      }

      // Log approval action
      await this.logWorkflowAction(transferId, status === 'approved' ? 'TRANSFER_APPROVED' : 'TRANSFER_REJECTED', {
        approverId,
        approverRole: approvalStep.approver_role,
        comments
      });

      logger.info('Transfer approval processed', {
        transferId,
        approverId,
        status,
        newTransferStatus: transfer.status
      });

      return transfer;

    } catch (error) {
      logger.error('Error processing transfer approval', {
        error: error.message,
        transferId,
        approverId,
        status
      });
      throw error;
    }
  }

  /**
   * Sends approval result notifications
   * @param {Object} transfer - Transfer request
   * @param {string} status - Approval status
   * @param {string} comments - Approval comments
   */
  static async sendApprovalResultNotifications(transfer, status, comments) {
    try {
      // Notify employee
      await this.sendEmployeeNotification(transfer, status, comments);

      // Notify HR team
      await this.sendHRNotification(transfer, status, comments);

      // If approved, notify both stores
      if (status === 'approved') {
        await this.sendStoreNotifications(transfer);
      }

    } catch (error) {
      logger.error('Error sending approval result notifications', {
        error: error.message,
        transferId: transfer._id,
        status
      });
    }
  }

  /**
   * Sends notification to employee about approval result
   * @param {Object} transfer - Transfer request
   * @param {string} status - Approval status
   * @param {string} comments - Approval comments
   */
  static async sendEmployeeNotification(transfer, status, comments) {
    try {
      const subject = status === 'approved' 
        ? 'Transfer Request Approved' 
        : 'Transfer Request Rejected';
      
      const html = `
        <h2>Transfer Request ${status === 'approved' ? 'Approved' : 'Rejected'}</h2>
        <p>Dear ${transfer.employee.first_name},</p>
        <p>Your transfer request has been ${status === 'approved' ? 'approved' : 'rejected'}:</p>
        <ul>
          <li><strong>Transfer Type:</strong> ${transfer.transfer_type.replace('_', ' ').toUpperCase()}</li>
          <li><strong>From:</strong> ${transfer.from_store?.name || 'N/A'} - ${transfer.from_department}</li>
          <li><strong>To:</strong> ${transfer.to_store?.name || 'N/A'} - ${transfer.to_department}</li>
          <li><strong>Effective Date:</strong> ${new Date(transfer.effective_date).toLocaleDateString()}</li>
          ${comments ? `<li><strong>Comments:</strong> ${comments}</li>` : ''}
        </ul>
        ${status === 'approved' 
          ? '<p>Your transfer will be processed on the effective date. Please prepare for the transition.</p>'
          : '<p>If you have any questions about this decision, please contact HR.</p>'
        }
        <p>Best regards,<br>HR Team</p>
      `;

      await emailService.sendEmail(transfer.employee.email, subject, '', html);
      
      logger.info('Employee notification sent', {
        transferId: transfer._id,
        employeeId: transfer.employee._id,
        status
      });
    } catch (error) {
      logger.error('Error sending employee notification', {
        error: error.message,
        transferId: transfer._id,
        status
      });
    }
  }

  /**
   * Schedules transfer execution
   * @param {Object} transfer - Transfer request
   */
  static async scheduleTransferExecution(transfer) {
    try {
      // Schedule execution for the effective date
      const executionDelay = new Date(transfer.effective_date) - new Date();
      
      if (executionDelay > 0) {
        await addJob('transfer-queue', 'execute-transfer', {
          transferId: transfer._id
        }, {
          delay: executionDelay,
          attempts: 3
        });

        logger.info('Transfer execution scheduled', {
          transferId: transfer._id,
          effectiveDate: transfer.effective_date,
          executionDelay: executionDelay
        });
      } else {
        // Execute immediately if effective date has passed
        await this.executeTransfer(transfer._id);
      }
    } catch (error) {
      logger.error('Error scheduling transfer execution', {
        error: error.message,
        transferId: transfer._id
      });
    }
  }

  /**
   * Executes the transfer
   * @param {string} transferId - Transfer request ID
   */
  static async executeTransfer(transferId) {
    try {
      const transfer = await Transfer.findById(transferId)
        .populate('employee')
        .populate('from_store')
        .populate('to_store');

      if (!transfer) {
        throw new Error('Transfer request not found');
      }

      if (transfer.status !== 'approved') {
        throw new Error('Transfer must be approved before execution');
      }

      if (transfer.is_executed) {
        logger.info('Transfer already executed', { transferId });
        return;
      }

      // Execute the transfer
      await transfer.executeTransfer(transfer.approved_by);

      // Send execution notifications
      await this.sendExecutionNotifications(transfer);

      // Log execution
      await this.logWorkflowAction(transferId, 'TRANSFER_EXECUTED', {
        executedBy: transfer.approved_by,
        effectiveDate: transfer.effective_date
      });

      logger.info('Transfer executed successfully', {
        transferId,
        employeeId: transfer.employee._id,
        fromStore: transfer.from_store?.name,
        toStore: transfer.to_store?.name
      });

    } catch (error) {
      logger.error('Error executing transfer', {
        error: error.message,
        transferId
      });
      throw error;
    }
  }

  /**
   * Helper method to get HR manager
   * @returns {string} HR manager user ID
   */
  static async getHRManager() {
    const hrManager = await User.findOne({ role: 'hr' }).sort({ created_at: 1 });
    return hrManager ? hrManager._id : null;
  }

  /**
   * Helper method to get admin user
   * @returns {string} Admin user ID
   */
  static async getAdminUser() {
    const admin = await User.findOne({ role: 'admin' }).sort({ created_at: 1 });
    return admin ? admin._id : null;
  }

  /**
   * Logs workflow actions
   * @param {string} transferId - Transfer request ID
   * @param {string} action - Action performed
   * @param {Object} details - Action details
   */
  static async logWorkflowAction(transferId, action, details) {
    try {
      const auditLog = new AuditLog({
        user: details.executedBy || details.approverId || 'system',
        action,
        resource: 'Transfer',
        resource_id: transferId,
        details,
        timestamp: new Date()
      });

      await auditLog.save();
    } catch (error) {
      logger.error('Error logging workflow action', {
        error: error.message,
        transferId,
        action
      });
    }
  }

  /**
   * Sends execution notifications
   * @param {Object} transfer - Transfer request
   */
  static async sendExecutionNotifications(transfer) {
    // Implementation for execution notifications
    // This would notify relevant parties about the completed transfer
  }

  /**
   * Sends HR notifications
   * @param {Object} transfer - Transfer request
   * @param {string} status - Approval status
   * @param {string} comments - Approval comments
   */
  static async sendHRNotification(transfer, status, comments) {
    // Implementation for HR notifications
  }

  /**
   * Sends store notifications
   * @param {Object} transfer - Transfer request
   */
  static async sendStoreNotifications(transfer) {
    // Implementation for store notifications
  }
}

module.exports = TransferWorkflows;

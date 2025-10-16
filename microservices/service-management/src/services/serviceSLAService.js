const Ticket = require('../models/Ticket.model');
const SLAPolicy = require('../models/SLAPolicy.model');
const EscalationMatrix = require('../models/EscalationMatrix.model');
const HolidayCalendar = require('../models/HolidayCalendar.model');
const User = require('../models/User.model');

class ServiceSLAService {
  // Ticket Management
  async createTicket(ticketData) {
    try {
      // Get SLA policy and calculate due dates
      const slaPolicy = await SLAPolicy.findById(ticketData.sla_policy_id);
      if (!slaPolicy) {
        throw new Error('SLA Policy not found');
      }

      const slaDueAt = this.calculateSLADueDate(
        ticketData.priority,
        slaPolicy,
        new Date()
      );

      const firstResponseDueAt = this.calculateFirstResponseDueDate(
        ticketData.priority,
        slaPolicy,
        new Date()
      );

      const ticket = new Ticket({
        ...ticketData,
        sla_due_at: slaDueAt,
        first_response_due_at: firstResponseDueAt
      });

      await ticket.save();
      return { success: true, data: ticket };
    } catch (error) {
      throw new Error(`Failed to create ticket: ${error.message}`);
    }
  }

  async getTickets(filters = {}) {
    try {
      const tickets = await Ticket.find(filters)
        .populate('assignee_id', 'name email')
        .populate('watchers', 'name email')
        .populate('created_by', 'name email')
        .populate('sla_policy_id', 'name targets');
      return { success: true, data: tickets };
    } catch (error) {
      throw new Error(`Failed to get tickets: ${error.message}`);
    }
  }

  async getTicketById(ticketId) {
    try {
      const ticket = await Ticket.findById(ticketId)
        .populate('assignee_id', 'name email')
        .populate('watchers', 'name email')
        .populate('created_by', 'name email')
        .populate('sla_policy_id', 'name targets');
      
      if (!ticket) {
        throw new Error('Ticket not found');
      }
      return { success: true, data: ticket };
    } catch (error) {
      throw new Error(`Failed to get ticket: ${error.message}`);
    }
  }

  async assignTicket(ticketId, assigneeId, userId) {
    try {
      const ticket = await Ticket.findById(ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      const oldAssignee = ticket.assignee_id;
      ticket.assignee_id = assigneeId;
      ticket.last_status_change_at = new Date();

      // Add to history
      ticket.history.push({
        user_id: userId,
        action: 'ASSIGNED',
        from_status: oldAssignee ? 'UNASSIGNED' : 'ASSIGNED',
        to_status: 'ASSIGNED',
        note: `Ticket assigned to user ${assigneeId}`
      });

      await ticket.save();
      return { success: true, data: ticket };
    } catch (error) {
      throw new Error(`Failed to assign ticket: ${error.message}`);
    }
  }

  async updateTicketStatus(ticketId, status, userId, reason = '') {
    try {
      const ticket = await Ticket.findById(ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      const oldStatus = ticket.status;
      ticket.status = status;
      ticket.last_status_change_at = new Date();

      // Add to history
      ticket.history.push({
        user_id: userId,
        action: 'STATUS_CHANGED',
        from_status: oldStatus,
        to_status: status,
        note: reason || `Status changed from ${oldStatus} to ${status}`
      });

      await ticket.save();
      return { success: true, data: ticket };
    } catch (error) {
      throw new Error(`Failed to update ticket status: ${error.message}`);
    }
  }

  async pauseTicket(ticketId, userId, reason = '') {
    try {
      const ticket = await Ticket.findById(ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      ticket.status = 'ON_HOLD';
      ticket.last_status_change_at = new Date();

      // Add to history
      ticket.history.push({
        user_id: userId,
        action: 'PAUSED',
        from_status: ticket.status,
        to_status: 'ON_HOLD',
        note: reason || 'Ticket paused'
      });

      await ticket.save();
      return { success: true, data: ticket };
    } catch (error) {
      throw new Error(`Failed to pause ticket: ${error.message}`);
    }
  }

  async resumeTicket(ticketId, userId, reason = '') {
    try {
      const ticket = await Ticket.findById(ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      ticket.status = 'IN_PROGRESS';
      ticket.last_status_change_at = new Date();

      // Add to history
      ticket.history.push({
        user_id: userId,
        action: 'RESUMED',
        from_status: 'ON_HOLD',
        to_status: 'IN_PROGRESS',
        note: reason || 'Ticket resumed'
      });

      await ticket.save();
      return { success: true, data: ticket };
    } catch (error) {
      throw new Error(`Failed to resume ticket: ${error.message}`);
    }
  }

  // SLA Calculation
  calculateSLADueDate(priority, slaPolicy, createdAt) {
    const resolutionMinutes = slaPolicy.targets.resolution_minutes[priority];
    return new Date(createdAt.getTime() + (resolutionMinutes * 60 * 1000));
  }

  calculateFirstResponseDueDate(priority, slaPolicy, createdAt) {
    const firstResponseMinutes = slaPolicy.targets.first_response_minutes[priority];
    return new Date(createdAt.getTime() + (firstResponseMinutes * 60 * 1000));
  }

  // SLA Monitoring and Escalation
  async checkSLACompliance() {
    try {
      const activeTickets = await Ticket.find({
        status: { $nin: ['RESOLVED', 'CLOSED'] }
      });

      for (const ticket of activeTickets) {
        await this.processTicketSLA(ticket);
      }

      return { success: true, message: 'SLA compliance check completed' };
    } catch (error) {
      throw new Error(`Failed to check SLA compliance: ${error.message}`);
    }
  }

  async processTicketSLA(ticket) {
    try {
      const now = new Date();
      const timeToDue = ticket.sla_due_at.getTime() - now.getTime();
      const slaPolicy = await SLAPolicy.findById(ticket.sla_policy_id);
      
      if (!slaPolicy) return;

      // Check if ticket is paused
      if (ticket.status === 'WAITING_CUSTOMER' || ticket.status === 'ON_HOLD') {
        if (slaPolicy.pause_on[ticket.status]) {
          return; // Skip SLA processing for paused tickets
        }
      }

      // Check for breach
      if (now >= ticket.sla_due_at && ticket.breach_state !== 'RED') {
        await this.escalateTicket(ticket, 'BREACH');
      }
      // Check for warning
      else if (timeToDue <= (slaPolicy.targets.resolution_minutes[ticket.priority] * 0.25 * 60 * 1000) && 
               ticket.breach_state === 'NONE') {
        await this.escalateTicket(ticket, 'WARNING');
      }
    } catch (error) {
      console.error(`Failed to process SLA for ticket ${ticket._id}:`, error);
    }
  }

  async escalateTicket(ticket, trigger) {
    try {
      const escalationMatrix = await EscalationMatrix.findOne({
        trigger: trigger === 'BREACH' ? 'BREACH' : 'WARNING_THRESHOLD',
        is_active: true
      }).sort({ level: 1 });

      if (!escalationMatrix) return;

      // Update ticket breach state
      ticket.breach_state = trigger === 'BREACH' ? 'RED' : 'WARNING';
      ticket.escalation_level = escalationMatrix.level;
      ticket.last_status_change_at = new Date();

      // Add to history
      ticket.history.push({
        user_id: null, // System action
        action: 'ESCALATED',
        from_status: ticket.status,
        to_status: ticket.status,
        note: `Ticket escalated to level ${escalationMatrix.level} due to ${trigger}`
      });

      // Execute auto actions
      if (escalationMatrix.auto_actions.add_watcher) {
        // Add watchers based on roles
        const usersToAdd = await this.getUsersByRoles(escalationMatrix.notify_roles);
        ticket.watchers = [...new Set([...ticket.watchers, ...usersToAdd])];
      }

      if (escalationMatrix.auto_actions.bump_priority) {
        // Bump priority (P3 -> P2 -> P1)
        if (ticket.priority === 'P3') ticket.priority = 'P2';
        else if (ticket.priority === 'P2') ticket.priority = 'P1';
      }

      // Reassign if configured
      if (escalationMatrix.reassign_to.user_id) {
        ticket.assignee_id = escalationMatrix.reassign_to.user_id;
      }

      await ticket.save();

      // Send notifications
      await this.sendEscalationNotifications(ticket, escalationMatrix);

    } catch (error) {
      console.error(`Failed to escalate ticket ${ticket._id}:`, error);
    }
  }

  async getUsersByRoles(roles) {
    try {
      const users = await User.find({
        role: { $in: roles }
      }).select('_id');
      return users.map(user => user._id);
    } catch (error) {
      console.error('Failed to get users by roles:', error);
      return [];
    }
  }

  async sendEscalationNotifications(ticket, escalationMatrix) {
    try {
      // This would integrate with notification service
      // For now, just log the notification
      console.log(`Sending escalation notification for ticket ${ticket.ticket_no} to level ${escalationMatrix.level}`);
    } catch (error) {
      console.error('Failed to send escalation notifications:', error);
    }
  }

  // SLA Policy Management
  async createSLAPolicy(policyData) {
    try {
      const policy = new SLAPolicy(policyData);
      await policy.save();
      return { success: true, data: policy };
    } catch (error) {
      throw new Error(`Failed to create SLA policy: ${error.message}`);
    }
  }

  async getSLAPolicies(filters = {}) {
    try {
      const policies = await SLAPolicy.find(filters);
      return { success: true, data: policies };
    } catch (error) {
      throw new Error(`Failed to get SLA policies: ${error.message}`);
    }
  }

  // Escalation Matrix Management
  async createEscalationMatrix(matrixData) {
    try {
      const matrix = new EscalationMatrix(matrixData);
      await matrix.save();
      return { success: true, data: matrix };
    } catch (error) {
      throw new Error(`Failed to create escalation matrix: ${error.message}`);
    }
  }

  async getEscalationMatrices(filters = {}) {
    try {
      const matrices = await EscalationMatrix.find(filters);
      return { success: true, data: matrices };
    } catch (error) {
      throw new Error(`Failed to get escalation matrices: ${error.message}`);
    }
  }

  // Reports and Analytics
  async getSLAComplianceReport(fromDate, toDate, filters = {}) {
    try {
      const tickets = await Ticket.find({
        created_at: { $gte: fromDate, $lte: toDate },
        ...filters
      });

      const totalTickets = tickets.length;
      const resolvedTickets = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED');
      const breachedTickets = tickets.filter(t => t.breach_state === 'RED');
      const warningTickets = tickets.filter(t => t.breach_state === 'WARNING');

      const compliance = totalTickets > 0 ? 
        ((totalTickets - breachedTickets.length) / totalTickets) * 100 : 0;

      return {
        success: true,
        data: {
          total_tickets: totalTickets,
          resolved_tickets: resolvedTickets.length,
          breached_tickets: breachedTickets.length,
          warning_tickets: warningTickets.length,
          compliance_percentage: compliance,
          mtta: this.calculateMTTA(tickets),
          mttr: this.calculateMTTR(tickets)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get SLA compliance report: ${error.message}`);
    }
  }

  calculateMTTA(tickets) {
    // Mean Time to Acknowledge
    const acknowledgedTickets = tickets.filter(t => t.assignee_id);
    if (acknowledgedTickets.length === 0) return 0;

    const totalTime = acknowledgedTickets.reduce((sum, ticket) => {
      const assignTime = ticket.history.find(h => h.action === 'ASSIGNED')?.at;
      if (assignTime) {
        return sum + (assignTime.getTime() - ticket.created_at.getTime());
      }
      return sum;
    }, 0);

    return totalTime / acknowledgedTickets.length / (1000 * 60); // in minutes
  }

  calculateMTTR(tickets) {
    // Mean Time to Resolve
    const resolvedTickets = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED');
    if (resolvedTickets.length === 0) return 0;

    const totalTime = resolvedTickets.reduce((sum, ticket) => {
      return sum + (ticket.last_status_change_at.getTime() - ticket.created_at.getTime());
    }, 0);

    return totalTime / resolvedTickets.length / (1000 * 60); // in minutes
  }
}

module.exports = new ServiceSLAService();

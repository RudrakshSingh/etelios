const Ticket = require('../models/Ticket.model');
const SLA = require('../models/SLA.model');
const logger = require('../config/logger');

class ServiceService {
  // Ticket Management
  async getTickets(query = {}) {
    try {
      const { page = 1, limit = 10, search, status, priority, assigned_to } = query;
      const filter = {};
      
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { ticket_number: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (status) {
        filter.status = status;
      }
      
      if (priority) {
        filter.priority = priority;
      }
      
      if (assigned_to) {
        filter.assigned_to = assigned_to;
      }
      
      const tickets = await Ticket.find(filter)
        .populate('assigned_to', 'name email')
        .populate('created_by', 'name email')
        .populate('customer_id', 'name email phone')
        .sort({ created_at: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      const total = await Ticket.countDocuments(filter);
      
      return {
        tickets,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      };
    } catch (error) {
      logger.error('Error getting tickets', { error: error.message });
      throw error;
    }
  }

  async createTicket(ticketData) {
    try {
      const ticket = new Ticket(ticketData);
      await ticket.save();
      return await Ticket.findById(ticket._id)
        .populate('assigned_to', 'name email')
        .populate('created_by', 'name email')
        .populate('customer_id', 'name email phone');
    } catch (error) {
      logger.error('Error creating ticket', { error: error.message });
      throw error;
    }
  }

  async getTicket(ticketId) {
    try {
      const ticket = await Ticket.findById(ticketId)
        .populate('assigned_to', 'name email')
        .populate('created_by', 'name email')
        .populate('customer_id', 'name email phone');
      
      if (!ticket) {
        throw new Error('Ticket not found');
      }
      
      return ticket;
    } catch (error) {
      logger.error('Error getting ticket', { error: error.message });
      throw error;
    }
  }

  async updateTicket(ticketId, updateData) {
    try {
      const ticket = await Ticket.findByIdAndUpdate(
        ticketId,
        updateData,
        { new: true }
      ).populate('assigned_to', 'name email')
       .populate('created_by', 'name email')
       .populate('customer_id', 'name email phone');
      
      if (!ticket) {
        throw new Error('Ticket not found');
      }
      
      return ticket;
    } catch (error) {
      logger.error('Error updating ticket', { error: error.message });
      throw error;
    }
  }

  async deleteTicket(ticketId) {
    try {
      const ticket = await Ticket.findByIdAndDelete(ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }
      return ticket;
    } catch (error) {
      logger.error('Error deleting ticket', { error: error.message });
      throw error;
    }
  }

  // SLA Management
  async getSLAs(query = {}) {
    try {
      const { page = 1, limit = 10, search, status } = query;
      const filter = {};
      
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (status) {
        filter.status = status;
      }
      
      const slas = await SLA.find(filter)
        .populate('created_by', 'name email')
        .sort({ created_at: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      const total = await SLA.countDocuments(filter);
      
      return {
        slas,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      };
    } catch (error) {
      logger.error('Error getting SLAs', { error: error.message });
      throw error;
    }
  }

  async createSLA(slaData) {
    try {
      const sla = new SLA(slaData);
      await sla.save();
      return await SLA.findById(sla._id)
        .populate('created_by', 'name email');
    } catch (error) {
      logger.error('Error creating SLA', { error: error.message });
      throw error;
    }
  }

  async getSLA(slaId) {
    try {
      const sla = await SLA.findById(slaId)
        .populate('created_by', 'name email');
      
      if (!sla) {
        throw new Error('SLA not found');
      }
      
      return sla;
    } catch (error) {
      logger.error('Error getting SLA', { error: error.message });
      throw error;
    }
  }

  async updateSLA(slaId, updateData) {
    try {
      const sla = await SLA.findByIdAndUpdate(
        slaId,
        updateData,
        { new: true }
      ).populate('created_by', 'name email');
      
      if (!sla) {
        throw new Error('SLA not found');
      }
      
      return sla;
    } catch (error) {
      logger.error('Error updating SLA', { error: error.message });
      throw error;
    }
  }

  async deleteSLA(slaId) {
    try {
      const sla = await SLA.findByIdAndDelete(slaId);
      if (!sla) {
        throw new Error('SLA not found');
      }
      return sla;
    } catch (error) {
      logger.error('Error deleting SLA', { error: error.message });
      throw error;
    }
  }

  // Reports
  async getTicketReport(query = {}) {
    try {
      const { from_date, to_date, status, priority } = query;
      const filter = {};
      
      if (from_date && to_date) {
        filter.created_at = {
          $gte: new Date(from_date),
          $lte: new Date(to_date)
        };
      }
      
      if (status) {
        filter.status = status;
      }
      
      if (priority) {
        filter.priority = priority;
      }
      
      const tickets = await Ticket.find(filter)
        .populate('assigned_to', 'name email')
        .populate('customer_id', 'name email')
        .sort({ created_at: -1 });
      
      const totalTickets = tickets.length;
      const openTickets = tickets.filter(t => t.status === 'open').length;
      const closedTickets = tickets.filter(t => t.status === 'closed').length;
      const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length;
      
      return {
        tickets,
        summary: {
          totalTickets,
          openTickets,
          closedTickets,
          inProgressTickets,
          resolutionRate: totalTickets > 0 ? (closedTickets / totalTickets * 100).toFixed(2) : 0
        }
      };
    } catch (error) {
      logger.error('Error getting ticket report', { error: error.message });
      throw error;
    }
  }

  async getSLAReport(query = {}) {
    try {
      const { from_date, to_date } = query;
      const filter = {};
      
      if (from_date && to_date) {
        filter.created_at = {
          $gte: new Date(from_date),
          $lte: new Date(to_date)
        };
      }
      
      const slas = await SLA.find(filter)
        .populate('created_by', 'name email')
        .sort({ created_at: -1 });
      
      const totalSLAs = slas.length;
      const activeSLAs = slas.filter(s => s.status === 'active').length;
      const inactiveSLAs = slas.filter(s => s.status === 'inactive').length;
      
      return {
        slas,
        summary: {
          totalSLAs,
          activeSLAs,
          inactiveSLAs
        }
      };
    } catch (error) {
      logger.error('Error getting SLA report', { error: error.message });
      throw error;
    }
  }

  async getPerformanceReport(query = {}) {
    try {
      const { from_date, to_date } = query;
      const filter = {};
      
      if (from_date && to_date) {
        filter.created_at = {
          $gte: new Date(from_date),
          $lte: new Date(to_date)
        };
      }
      
      const tickets = await Ticket.find(filter);
      
      const avgResolutionTime = tickets.reduce((sum, ticket) => {
        if (ticket.resolved_at && ticket.created_at) {
          const resolutionTime = new Date(ticket.resolved_at) - new Date(ticket.created_at);
          return sum + resolutionTime;
        }
        return sum;
      }, 0) / tickets.length;
      
      const performanceMetrics = {
        totalTickets: tickets.length,
        avgResolutionTime: avgResolutionTime / (1000 * 60 * 60), // Convert to hours
        resolutionRate: tickets.filter(t => t.status === 'closed').length / tickets.length * 100,
        customerSatisfaction: tickets.filter(t => t.customer_rating >= 4).length / tickets.length * 100
      };
      
      return performanceMetrics;
    } catch (error) {
      logger.error('Error getting performance report', { error: error.message });
      throw error;
    }
  }

  async getResponseTimeReport(query = {}) {
    try {
      const { from_date, to_date } = query;
      const filter = {};
      
      if (from_date && to_date) {
        filter.created_at = {
          $gte: new Date(from_date),
          $lte: new Date(to_date)
        };
      }
      
      const tickets = await Ticket.find(filter);
      
      const responseTimes = tickets.map(ticket => {
        if (ticket.first_response_at && ticket.created_at) {
          return new Date(ticket.first_response_at) - new Date(ticket.created_at);
        }
        return null;
      }).filter(time => time !== null);
      
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      
      return {
        totalTickets: tickets.length,
        ticketsWithResponse: responseTimes.length,
        avgResponseTime: avgResponseTime / (1000 * 60), // Convert to minutes
        responseRate: responseTimes.length / tickets.length * 100
      };
    } catch (error) {
      logger.error('Error getting response time report', { error: error.message });
      throw error;
    }
  }

  async getResolutionRateReport(query = {}) {
    try {
      const { from_date, to_date } = query;
      const filter = {};
      
      if (from_date && to_date) {
        filter.created_at = {
          $gte: new Date(from_date),
          $lte: new Date(to_date)
        };
      }
      
      const tickets = await Ticket.find(filter);
      
      const resolutionRates = {
        totalTickets: tickets.length,
        resolvedTickets: tickets.filter(t => t.status === 'closed').length,
        unresolvedTickets: tickets.filter(t => t.status !== 'closed').length,
        resolutionRate: tickets.filter(t => t.status === 'closed').length / tickets.length * 100
      };
      
      return resolutionRates;
    } catch (error) {
      logger.error('Error getting resolution rate report', { error: error.message });
      throw error;
    }
  }

  async getCustomerSatisfactionReport(query = {}) {
    try {
      const { from_date, to_date } = query;
      const filter = {};
      
      if (from_date && to_date) {
        filter.created_at = {
          $gte: new Date(from_date),
          $lte: new Date(to_date)
        };
      }
      
      const tickets = await Ticket.find(filter);
      
      const satisfactionMetrics = {
        totalTickets: tickets.length,
        ratedTickets: tickets.filter(t => t.customer_rating).length,
        avgRating: tickets.reduce((sum, t) => sum + (t.customer_rating || 0), 0) / tickets.filter(t => t.customer_rating).length,
        satisfactionRate: tickets.filter(t => t.customer_rating >= 4).length / tickets.filter(t => t.customer_rating).length * 100
      };
      
      return satisfactionMetrics;
    } catch (error) {
      logger.error('Error getting customer satisfaction report', { error: error.message });
      throw error;
    }
  }

  async getTeamPerformanceReport(query = {}) {
    try {
      const { from_date, to_date } = query;
      const filter = {};
      
      if (from_date && to_date) {
        filter.created_at = {
          $gte: new Date(from_date),
          $lte: new Date(to_date)
        };
      }
      
      const tickets = await Ticket.find(filter).populate('assigned_to', 'name email');
      
      const teamPerformance = tickets.reduce((acc, ticket) => {
        if (ticket.assigned_to) {
          const assigneeId = ticket.assigned_to._id.toString();
          if (!acc[assigneeId]) {
            acc[assigneeId] = {
              name: ticket.assigned_to.name,
              email: ticket.assigned_to.email,
              totalTickets: 0,
              resolvedTickets: 0,
              avgResolutionTime: 0
            };
          }
          acc[assigneeId].totalTickets++;
          if (ticket.status === 'closed') {
            acc[assigneeId].resolvedTickets++;
          }
        }
        return acc;
      }, {});
      
      return teamPerformance;
    } catch (error) {
      logger.error('Error getting team performance report', { error: error.message });
      throw error;
    }
  }

  async getEscalationReport(query = {}) {
    try {
      const { from_date, to_date } = query;
      const filter = {};
      
      if (from_date && to_date) {
        filter.created_at = {
          $gte: new Date(from_date),
          $lte: new Date(to_date)
        };
      }
      
      const tickets = await Ticket.find(filter);
      
      const escalationMetrics = {
        totalTickets: tickets.length,
        escalatedTickets: tickets.filter(t => t.escalated).length,
        escalationRate: tickets.filter(t => t.escalated).length / tickets.length * 100,
        avgEscalationTime: tickets.filter(t => t.escalated && t.escalated_at).reduce((sum, t) => {
          return sum + (new Date(t.escalated_at) - new Date(t.created_at));
        }, 0) / tickets.filter(t => t.escalated && t.escalated_at).length / (1000 * 60 * 60) // Convert to hours
      };
      
      return escalationMetrics;
    } catch (error) {
      logger.error('Error getting escalation report', { error: error.message });
      throw error;
    }
  }

  async getTrendReport(query = {}) {
    try {
      const { from_date, to_date, group_by = 'day' } = query;
      const filter = {};
      
      if (from_date && to_date) {
        filter.created_at = {
          $gte: new Date(from_date),
          $lte: new Date(to_date)
        };
      }
      
      const tickets = await Ticket.find(filter).sort({ created_at: 1 });
      
      const trends = tickets.reduce((acc, ticket) => {
        const date = new Date(ticket.created_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = {
            date,
            totalTickets: 0,
            resolvedTickets: 0,
            openTickets: 0
          };
        }
        acc[date].totalTickets++;
        if (ticket.status === 'closed') {
          acc[date].resolvedTickets++;
        } else {
          acc[date].openTickets++;
        }
        return acc;
      }, {});
      
      return Object.values(trends);
    } catch (error) {
      logger.error('Error getting trend report', { error: error.message });
      throw error;
    }
  }

  async getAnalyticsReport(query = {}) {
    try {
      const { from_date, to_date } = query;
      const filter = {};
      
      if (from_date && to_date) {
        filter.created_at = {
          $gte: new Date(from_date),
          $lte: new Date(to_date)
        };
      }
      
      const tickets = await Ticket.find(filter);
      
      const analytics = {
        totalTickets: tickets.length,
        ticketsByStatus: tickets.reduce((acc, ticket) => {
          acc[ticket.status] = (acc[ticket.status] || 0) + 1;
          return acc;
        }, {}),
        ticketsByPriority: tickets.reduce((acc, ticket) => {
          acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
          return acc;
        }, {}),
        avgResolutionTime: tickets.filter(t => t.resolved_at).reduce((sum, t) => {
          return sum + (new Date(t.resolved_at) - new Date(t.created_at));
        }, 0) / tickets.filter(t => t.resolved_at).length / (1000 * 60 * 60), // Convert to hours
        customerSatisfaction: tickets.filter(t => t.customer_rating).reduce((sum, t) => sum + t.customer_rating, 0) / tickets.filter(t => t.customer_rating).length
      };
      
      return analytics;
    } catch (error) {
      logger.error('Error getting analytics report', { error: error.message });
      throw error;
    }
  }
}

module.exports = new ServiceService();

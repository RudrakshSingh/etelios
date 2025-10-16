const engagementService = require('../services/engagementService');
const Contact = require('../models/Contact.model');
const Appointment = require('../models/Appointment.model');
const Order = require('../models/Order.model');
const Prescription = require('../models/Prescription.model');
const ContactLensPlan = require('../models/ContactLensPlan.model');
const Campaign = require('../models/Campaign.model');
const Template = require('../models/Template.model');
const AutomationRule = require('../models/AutomationRule.model');
const ReminderJob = require('../models/ReminderJob.model');
const Task = require('../models/Task.model');
const MessageLog = require('../models/MessageLog.model');
const logger = require('../config/logger');

class EngagementController {
  // Contact Management
  async createContact(req, res) {
    try {
      const result = await engagementService.createContact(req.body);
      res.status(201).json(result);
    } catch (error) {
      logger.error('Error creating contact', { error: error.message });
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getContacts(req, res) {
    try {
      const { page = 1, limit = 10, store_id, tags, is_active = true } = req.query;
      const query = { is_active };
      
      if (store_id) query.primary_store_id = store_id;
      if (tags) query.tags = { $in: tags.split(',') };

      const contacts = await Contact.find(query)
        .populate('primary_store_id', 'name code')
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .sort({ created_at: -1 });

      const total = await Contact.countDocuments(query);

      res.status(200).json({
        success: true,
        data: contacts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Error getting contacts', { error: error.message });
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async updateContactConsents(req, res) {
    try {
      const { customer_id } = req.params;
      const { consents } = req.body;
      
      const result = await engagementService.updateContactConsents(customer_id, consents);
      res.status(200).json(result);
    } catch (error) {
      logger.error('Error updating contact consents', { error: error.message });
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Appointment Management
  async createAppointment(req, res) {
    try {
      const appointmentData = {
        ...req.body,
        created_by: req.user.id
      };
      
      const result = await engagementService.createAppointment(appointmentData);
      res.status(201).json(result);
    } catch (error) {
      logger.error('Error creating appointment', { error: error.message });
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getAppointments(req, res) {
    try {
      const { page = 1, limit = 10, customer_id, store_id, status, type } = req.query;
      const query = {};
      
      if (customer_id) query.customer_id = customer_id;
      if (store_id) query.store_id = store_id;
      if (status) query.status = status;
      if (type) query.type = type;

      const appointments = await Appointment.find(query)
        .populate('customer_id', 'name phone email')
        .populate('store_id', 'name code')
        .populate('created_by', 'name employee_id')
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .sort({ appt_at: 1 });

      const total = await Appointment.countDocuments(query);

      res.status(200).json({
        success: true,
        data: appointments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Error getting appointments', { error: error.message });
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Order Management
  async createOrder(req, res) {
    try {
      const orderData = {
        ...req.body,
        created_by: req.user.id
      };
      
      const order = new Order(orderData);
      await order.save();
      
      res.status(201).json({ success: true, data: order });
    } catch (error) {
      logger.error('Error creating order', { error: error.message });
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async updateOrderStatus(req, res) {
    try {
      const { order_id } = req.params;
      const { status, delivered_at } = req.body;
      
      const order = await Order.findOne({ order_id });
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      order.status = status;
      if (delivered_at) order.delivered_at = new Date(delivered_at);
      await order.save();

      res.status(200).json({ success: true, data: order });
    } catch (error) {
      logger.error('Error updating order status', { error: error.message });
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Prescription Management
  async createPrescription(req, res) {
    try {
      const prescriptionData = {
        ...req.body,
        created_by: req.user.id
      };
      
      const prescription = new Prescription(prescriptionData);
      await prescription.save();
      
      res.status(201).json({ success: true, data: prescription });
    } catch (error) {
      logger.error('Error creating prescription', { error: error.message });
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Contact Lens Plan Management
  async createContactLensPlan(req, res) {
    try {
      const clpData = {
        ...req.body,
        created_by: req.user.id
      };
      
      const clp = new ContactLensPlan(clpData);
      await clp.save();
      
      res.status(201).json({ success: true, data: clp });
    } catch (error) {
      logger.error('Error creating contact lens plan', { error: error.message });
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Campaign Management
  async createCampaign(req, res) {
    try {
      const campaignData = {
        ...req.body,
        created_by: req.user.id
      };
      
      const campaign = new Campaign(campaignData);
      await campaign.save();
      
      res.status(201).json({ success: true, data: campaign });
    } catch (error) {
      logger.error('Error creating campaign', { error: error.message });
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getCampaigns(req, res) {
    try {
      const { page = 1, limit = 10, status, type, channel } = req.query;
      const query = {};
      
      if (status) query.status = status;
      if (type) query.type = type;
      if (channel) query.channel = channel;

      const campaigns = await Campaign.find(query)
        .populate('template_id', 'name category')
        .populate('created_by', 'name employee_id')
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .sort({ created_at: -1 });

      const total = await Campaign.countDocuments(query);

      res.status(200).json({
        success: true,
        data: campaigns,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Error getting campaigns', { error: error.message });
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Template Management
  async createTemplate(req, res) {
    try {
      const templateData = {
        ...req.body,
        created_by: req.user.id
      };
      
      const template = new Template(templateData);
      await template.save();
      
      res.status(201).json({ success: true, data: template });
    } catch (error) {
      logger.error('Error creating template', { error: error.message });
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getTemplates(req, res) {
    try {
      const { page = 1, limit = 10, channel, category, is_active = true } = req.query;
      const query = { is_active };
      
      if (channel) query.channel = channel;
      if (category) query.category = category;

      const templates = await Template.find(query)
        .populate('created_by', 'name employee_id')
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .sort({ created_at: -1 });

      const total = await Template.countDocuments(query);

      res.status(200).json({
        success: true,
        data: templates,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Error getting templates', { error: error.message });
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Automation Rules
  async createAutomationRule(req, res) {
    try {
      const ruleData = {
        ...req.body,
        created_by: req.user.id
      };
      
      const rule = new AutomationRule(ruleData);
      await rule.save();
      
      res.status(201).json({ success: true, data: rule });
    } catch (error) {
      logger.error('Error creating automation rule', { error: error.message });
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getAutomationRules(req, res) {
    try {
      const { enabled, trigger } = req.query;
      const query = {};
      
      if (enabled !== undefined) query.enabled = enabled === 'true';
      if (trigger) query.trigger = trigger;

      const rules = await AutomationRule.find(query)
        .populate('template_id', 'name category')
        .populate('fallback_template_id', 'name category')
        .populate('created_by', 'name employee_id')
        .sort({ created_at: -1 });

      res.status(200).json({ success: true, data: rules });
    } catch (error) {
      logger.error('Error getting automation rules', { error: error.message });
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Task Management
  async createTask(req, res) {
    try {
      const taskData = {
        ...req.body,
        created_by: req.user.id
      };
      
      const task = new Task(taskData);
      await task.save();
      
      res.status(201).json({ success: true, data: task });
    } catch (error) {
      logger.error('Error creating task', { error: error.message });
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getTasks(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        assigned_to, 
        status, 
        reason, 
        priority,
        due_before,
        team 
      } = req.query;
      
      const query = {};
      
      if (assigned_to) query.assigned_to = assigned_to;
      if (status) query.status = status;
      if (reason) query.reason = reason;
      if (priority) query.priority = priority;
      if (due_before) query.due_at = { $lte: new Date(due_before) };

      const tasks = await Task.find(query)
        .populate('customer_id', 'name phone email')
        .populate('assigned_to', 'name employee_id')
        .populate('created_by', 'name employee_id')
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .sort({ due_at: 1 });

      const total = await Task.countDocuments(query);

      res.status(200).json({
        success: true,
        data: tasks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Error getting tasks', { error: error.message });
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async updateTask(req, res) {
    try {
      const { task_id } = req.params;
      const { status, notes, outcome, assigned_to } = req.body;
      
      const task = await Task.findOne({ task_id });
      if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      if (status) task.status = status;
      if (notes) task.notes = notes;
      if (outcome) task.outcome = outcome;
      if (assigned_to) task.assigned_to = assigned_to;
      
      await task.save();

      res.status(200).json({ success: true, data: task });
    } catch (error) {
      logger.error('Error updating task', { error: error.message });
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Automation Processing
  async runAutomation(req, res) {
    try {
      const { type } = req.body;
      
      let result;
      switch (type) {
        case 'birthday_anniversary':
          result = await engagementService.processBirthdayAnniversaryWishes();
          break;
        case 'post_delivery_feedback':
          result = await engagementService.processPostDeliveryFeedback();
          break;
        case 'eye_test_recall':
          result = await engagementService.processEyeTestRecalls();
          break;
        case 'cl_refill':
          result = await engagementService.processContactLensRefills();
          break;
        case 'reminder_jobs':
          result = await engagementService.processReminderJobs();
          break;
        default:
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid automation type' 
          });
      }

      res.status(200).json(result);
    } catch (error) {
      logger.error('Error running automation', { error: error.message });
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Message Sending
  async sendMessage(req, res) {
    try {
      const { channel, template_id, customer_id, variables } = req.body;
      
      // Create a manual reminder job
      const job = new ReminderJob({
        job_id: `MANUAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        rule_id: null,
        customer_id,
        scheduled_for: new Date(),
        channel,
        template_id,
        variables,
        priority: 10
      });

      await job.save();
      
      // Process immediately
      await engagementService.processReminderJob(job);

      res.status(200).json({ 
        success: true, 
        message: 'Message sent successfully',
        job_id: job.job_id
      });
    } catch (error) {
      logger.error('Error sending message', { error: error.message });
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Feedback Submission
  async submitFeedback(req, res) {
    try {
      const { order_id, csat_score, nps_score, feedback_notes } = req.body;
      
      const order = await Order.findOne({ order_id });
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      order.feedback_completed = true;
      order.csat_score = csat_score;
      order.nps_score = nps_score;
      order.feedback_notes = feedback_notes;
      await order.save();

      // Create service ticket if CSAT is low
      if (csat_score <= 3) {
        const task = new Task({
          task_id: `LOW-CSAT-${order_id}-${Date.now()}`,
          type: 'followup',
          customer_id: order.customer_id,
          due_at: new Date(),
          reason: 'low_csat',
          priority: 'HIGH',
          notes: `Low CSAT score: ${csat_score}/5. Feedback: ${feedback_notes}`,
          created_by: req.user.id
        });
        await task.save();
      }

      res.status(200).json({ success: true, message: 'Feedback submitted successfully' });
    } catch (error) {
      logger.error('Error submitting feedback', { error: error.message });
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Analytics
  async getEngagementAnalytics(req, res) {
    try {
      const { date_from, date_to, customer_id } = req.query;
      const filters = { date_from, date_to, customer_id };
      
      const result = await engagementService.getEngagementAnalytics(filters);
      res.status(200).json(result);
    } catch (error) {
      logger.error('Error getting engagement analytics', { error: error.message });
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Message Logs
  async getMessageLogs(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        customer_id, 
        channel, 
        date_from, 
        date_to 
      } = req.query;
      
      const query = {};
      
      if (customer_id) query.customer_id = customer_id;
      if (channel) query.channel = channel;
      if (date_from || date_to) {
        query.sent_at = {};
        if (date_from) query.sent_at.$gte = new Date(date_from);
        if (date_to) query.sent_at.$lte = new Date(date_to);
      }

      const logs = await MessageLog.find(query)
        .populate('customer_id', 'name phone email')
        .populate('template_id', 'name category')
        .populate('job_id', 'job_id status')
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .sort({ sent_at: -1 });

      const total = await MessageLog.countDocuments(query);

      res.status(200).json({
        success: true,
        data: logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Error getting message logs', { error: error.message });
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new EngagementController();

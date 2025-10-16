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

class EngagementService {
  // Contact Management
  async createContact(contactData) {
    try {
      const contact = new Contact(contactData);
      await contact.save();
      logger.info('Contact created', { contact_id: contact.customer_id });
      return { success: true, data: contact };
    } catch (error) {
      logger.error('Error creating contact', { error: error.message });
      throw new Error('Failed to create contact');
    }
  }

  async updateContactConsents(customerId, consents) {
    try {
      const contact = await Contact.findOne({ customer_id: customerId });
      if (!contact) {
        throw new Error('Contact not found');
      }

      contact.consents = {
        ...contact.consents,
        ...consents,
        last_updated_at: new Date()
      };
      await contact.save();

      logger.info('Contact consents updated', { customer_id: customerId, consents });
      return { success: true, data: contact };
    } catch (error) {
      logger.error('Error updating contact consents', { error: error.message });
      throw new Error('Failed to update consents');
    }
  }

  // Appointment Management
  async createAppointment(appointmentData) {
    try {
      const appointment = new Appointment(appointmentData);
      await appointment.save();
      
      // Schedule reminders
      await this.scheduleAppointmentReminders(appointment);
      
      logger.info('Appointment created', { appt_id: appointment.appt_id });
      return { success: true, data: appointment };
    } catch (error) {
      logger.error('Error creating appointment', { error: error.message });
      throw new Error('Failed to create appointment');
    }
  }

  async scheduleAppointmentReminders(appointment) {
    try {
      const t24h = new Date(appointment.appt_at);
      t24h.setHours(t24h.getHours() - 24);
      
      const t2h = new Date(appointment.appt_at);
      t2h.setHours(t2h.getHours() - 2);

      // Create reminder jobs
      const reminderJobs = [
        {
          job_id: `APPT-${appointment.appt_id}-T24`,
          rule_id: await this.getAutomationRuleId('appt_reminder'),
          customer_id: appointment.customer_id,
          context: { appt_id: appointment._id },
          scheduled_for: t24h,
          channel: 'whatsapp',
          template_id: await this.getTemplateId('appointment_reminder_24h'),
          variables: {
            name: '{{customer_name}}',
            time: appointment.appt_at.toLocaleTimeString(),
            store: '{{store_name}}',
            link: '{{appt_link}}'
          }
        },
        {
          job_id: `APPT-${appointment.appt_id}-T2`,
          rule_id: await this.getAutomationRuleId('appt_reminder'),
          customer_id: appointment.customer_id,
          context: { appt_id: appointment._id },
          scheduled_for: t2h,
          channel: 'whatsapp',
          template_id: await this.getTemplateId('appointment_reminder_2h'),
          variables: {
            name: '{{customer_name}}',
            time: appointment.appt_at.toLocaleTimeString(),
            store: '{{store_name}}',
            link: '{{appt_link}}'
          }
        }
      ];

      for (const jobData of reminderJobs) {
        const job = new ReminderJob(jobData);
        await job.save();
      }

      logger.info('Appointment reminders scheduled', { appt_id: appointment.appt_id });
    } catch (error) {
      logger.error('Error scheduling appointment reminders', { error: error.message });
    }
  }

  // Birthday/Anniversary Automation
  async processBirthdayAnniversaryWishes() {
    try {
      const today = new Date();
      const todayStr = `${today.getMonth() + 1}-${today.getDate()}`;

      // Find contacts with birthday or anniversary today
      const contacts = await Contact.find({
        $or: [
          { 
            dob: { 
              $regex: new RegExp(todayStr, 'i') 
            } 
          },
          { 
            anniversary: { 
              $regex: new RegExp(todayStr, 'i') 
            } 
          }
        ],
        is_active: true,
        $or: [
          { 'consents.whatsapp': true },
          { 'consents.sms': true },
          { 'consents.email': true }
        ]
      });

      for (const contact of contacts) {
        await this.createBirthdayAnniversaryJob(contact);
      }

      logger.info('Birthday/anniversary wishes processed', { count: contacts.length });
      return { success: true, processed: contacts.length };
    } catch (error) {
      logger.error('Error processing birthday/anniversary wishes', { error: error.message });
      throw new Error('Failed to process birthday/anniversary wishes');
    }
  }

  async createBirthdayAnniversaryJob(contact) {
    try {
      const isBirthday = contact.dob && 
        `${contact.dob.getMonth() + 1}-${contact.dob.getDate()}` === 
        `${new Date().getMonth() + 1}-${new Date().getDate()}`;

      const eventType = isBirthday ? 'birthday' : 'anniversary';
      const templateCategory = isBirthday ? 'birthday' : 'anniversary';

      const job = new ReminderJob({
        job_id: `${eventType.toUpperCase()}-${contact.customer_id}-${Date.now()}`,
        rule_id: await this.getAutomationRuleId(eventType),
        customer_id: contact._id,
        scheduled_for: new Date(),
        channel: this.getPreferredChannel(contact),
        template_id: await this.getTemplateId(templateCategory),
        variables: {
          name: contact.name,
          store: '{{store_name}}',
          link: '{{appt_link}}'
        }
      });

      await job.save();
      logger.info('Birthday/anniversary job created', { 
        customer_id: contact.customer_id, 
        event_type: eventType 
      });
    } catch (error) {
      logger.error('Error creating birthday/anniversary job', { error: error.message });
    }
  }

  // Post-Delivery Feedback
  async processPostDeliveryFeedback() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find orders delivered yesterday that haven't received feedback
      const orders = await Order.find({
        delivered_at: { $gte: yesterday, $lt: today },
        feedback_sent: false,
        status: 'DELIVERED'
      });

      for (const order of orders) {
        await this.createFeedbackJob(order);
      }

      logger.info('Post-delivery feedback processed', { count: orders.length });
      return { success: true, processed: orders.length };
    } catch (error) {
      logger.error('Error processing post-delivery feedback', { error: error.message });
      throw new Error('Failed to process post-delivery feedback');
    }
  }

  async createFeedbackJob(order) {
    try {
      const contact = await Contact.findById(order.customer_id);
      if (!contact) return;

      const job = new ReminderJob({
        job_id: `FEEDBACK-${order.order_id}-${Date.now()}`,
        rule_id: await this.getAutomationRuleId('post_delivery_feedback'),
        customer_id: order.customer_id,
        context: { order_id: order._id },
        scheduled_for: new Date(),
        channel: this.getPreferredChannel(contact),
        template_id: await this.getTemplateId('post_delivery_feedback'),
        variables: {
          name: contact.name,
          order_id: order.order_id,
          link: '{{feedback_link}}'
        }
      });

      await job.save();
      
      // Mark feedback as sent
      order.feedback_sent = true;
      await order.save();

      logger.info('Feedback job created', { order_id: order.order_id });
    } catch (error) {
      logger.error('Error creating feedback job', { error: error.message });
    }
  }

  // Eye Test Recall
  async processEyeTestRecalls() {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // Find prescriptions that need recall
      const prescriptions = await Prescription.find({
        issued_at: { $lte: sixMonthsAgo },
        recall_sent: false,
        type: 'spectacle'
      });

      for (const prescription of prescriptions) {
        await this.createEyeTestRecallJob(prescription);
      }

      logger.info('Eye test recalls processed', { count: prescriptions.length });
      return { success: true, processed: prescriptions.length };
    } catch (error) {
      logger.error('Error processing eye test recalls', { error: error.message });
      throw new Error('Failed to process eye test recalls');
    }
  }

  async createEyeTestRecallJob(prescription) {
    try {
      const contact = await Contact.findById(prescription.customer_id);
      if (!contact) return;

      // Create T-20 and T-15 tasks for E-com/Call team
      const t20Date = new Date();
      t20Date.setDate(t20Date.getDate() + 20);

      const t15Date = new Date();
      t15Date.setDate(t15Date.getDate() + 15);

      const tasks = [
        {
          task_id: `EYE-T20-${prescription.rx_id}-${Date.now()}`,
          type: 'followup',
          customer_id: prescription.customer_id,
          due_at: t20Date,
          reason: 'eye_test_T-20',
          priority: 'HIGH'
        },
        {
          task_id: `EYE-T15-${prescription.rx_id}-${Date.now()}`,
          type: 'followup',
          customer_id: prescription.customer_id,
          due_at: t15Date,
          reason: 'eye_test_T-15',
          priority: 'URGENT'
        }
      ];

      for (const taskData of tasks) {
        const task = new Task(taskData);
        await task.save();
      }

      // Create reminder job for due date
      const job = new ReminderJob({
        job_id: `EYE-RECALL-${prescription.rx_id}-${Date.now()}`,
        rule_id: await this.getAutomationRuleId('eye_test_recall'),
        customer_id: prescription.customer_id,
        context: { rx_id: prescription._id },
        scheduled_for: new Date(),
        channel: this.getPreferredChannel(contact),
        template_id: await this.getTemplateId('eye_test_recall'),
        variables: {
          name: contact.name,
          store: '{{store_name}}',
          link: '{{appt_link}}'
        }
      });

      await job.save();
      
      // Mark recall as sent
      prescription.recall_sent = true;
      prescription.recall_due_at = new Date();
      await prescription.save();

      logger.info('Eye test recall job created', { rx_id: prescription.rx_id });
    } catch (error) {
      logger.error('Error creating eye test recall job', { error: error.message });
    }
  }

  // Contact Lens Refill
  async processContactLensRefills() {
    try {
      const t20Date = new Date();
      t20Date.setDate(t20Date.getDate() + 20);

      const t15Date = new Date();
      t15Date.setDate(t15Date.getDate() + 15);

      const t7Date = new Date();
      t7Date.setDate(t7Date.getDate() + 7);

      const t1Date = new Date();
      t1Date.setDate(t1Date.getDate() + 1);

      // Find CL plans that need refill
      const clPlans = await ContactLensPlan.find({
        next_refill_due_at: { $lte: t20Date },
        is_active: true
      });

      for (const clPlan of clPlans) {
        await this.createContactLensRefillJob(clPlan);
      }

      logger.info('Contact lens refills processed', { count: clPlans.length });
      return { success: true, processed: clPlans.length };
    } catch (error) {
      logger.error('Error processing contact lens refills', { error: error.message });
      throw new Error('Failed to process contact lens refills');
    }
  }

  async createContactLensRefillJob(clPlan) {
    try {
      const contact = await Contact.findById(clPlan.customer_id);
      if (!contact) return;

      const dueDate = new Date(clPlan.next_refill_due_at);
      const today = new Date();
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

      // Create tasks for T-20 and T-15
      if (daysUntilDue <= 20 && daysUntilDue > 15) {
        const task = new Task({
          task_id: `CL-T20-${clPlan.clp_id}-${Date.now()}`,
          type: 'followup',
          customer_id: clPlan.customer_id,
          due_at: new Date(),
          reason: 'cl_refill_T-20',
          priority: 'HIGH'
        });
        await task.save();
      }

      if (daysUntilDue <= 15 && daysUntilDue > 7) {
        const task = new Task({
          task_id: `CL-T15-${clPlan.clp_id}-${Date.now()}`,
          type: 'followup',
          customer_id: clPlan.customer_id,
          due_at: new Date(),
          reason: 'cl_refill_T-15',
          priority: 'URGENT'
        });
        await task.save();
      }

      // Create reminder jobs for T-7 and T-1
      if (daysUntilDue <= 7 && daysUntilDue > 1 && !clPlan.reminder_sent.t7) {
        const job = new ReminderJob({
          job_id: `CL-T7-${clPlan.clp_id}-${Date.now()}`,
          rule_id: await this.getAutomationRuleId('cl_refill'),
          customer_id: clPlan.customer_id,
          context: { clp_id: clPlan._id },
          scheduled_for: new Date(),
          channel: this.getPreferredChannel(contact),
          template_id: await this.getTemplateId('cl_refill_7d'),
          variables: {
            name: contact.name,
            brand: clPlan.brand,
            link: '{{refill_link}}'
          }
        });
        await job.save();
        clPlan.reminder_sent.t7 = true;
      }

      if (daysUntilDue <= 1 && !clPlan.reminder_sent.t1) {
        const job = new ReminderJob({
          job_id: `CL-T1-${clPlan.clp_id}-${Date.now()}`,
          rule_id: await this.getAutomationRuleId('cl_refill'),
          customer_id: clPlan.customer_id,
          context: { clp_id: clPlan._id },
          scheduled_for: new Date(),
          channel: this.getPreferredChannel(contact),
          template_id: await this.getTemplateId('cl_refill_1d'),
          variables: {
            name: contact.name,
            brand: clPlan.brand,
            link: '{{refill_link}}'
          }
        });
        await job.save();
        clPlan.reminder_sent.t1 = true;
      }

      await clPlan.save();
      logger.info('Contact lens refill job created', { clp_id: clPlan.clp_id });
    } catch (error) {
      logger.error('Error creating contact lens refill job', { error: error.message });
    }
  }

  // Helper methods
  getPreferredChannel(contact) {
    if (contact.consents.whatsapp) return 'whatsapp';
    if (contact.consents.sms) return 'sms';
    if (contact.consents.email) return 'email';
    return 'email'; // fallback
  }

  async getAutomationRuleId(trigger) {
    let rule = await AutomationRule.findOne({ trigger, enabled: true });
    if (!rule) {
      // Create default automation rule if it doesn't exist
      rule = new AutomationRule({
        rule_id: `RULE-${trigger.toUpperCase()}-${Date.now()}`,
        name: `${trigger} Automation Rule`,
        trigger,
        enabled: true,
        conditions: {},
        actions: []
      });
      await rule.save();
    }
    return rule._id;
  }

  async getTemplateId(category) {
    let template = await Template.findOne({ category, is_active: true });
    if (!template) {
      // Create default template if it doesn't exist
      template = new Template({
        template_id: `TMP-${category.toUpperCase()}-${Date.now()}`,
        name: `${category} Template`,
        category,
        channel: 'whatsapp',
        body: `Default ${category} message`,
        variables: {},
        is_active: true,
        approval_status: 'APPROVED'
      });
      await template.save();
    }
    return template._id;
  }

  // Job Processing
  async processReminderJobs() {
    try {
      const pendingJobs = await ReminderJob.find({
        status: 'PENDING',
        scheduled_for: { $lte: new Date() }
      }).sort({ priority: -1, scheduled_for: 1 });

      for (const job of pendingJobs) {
        await this.processReminderJob(job);
      }

      logger.info('Reminder jobs processed', { count: pendingJobs.length });
      return { success: true, processed: pendingJobs.length };
    } catch (error) {
      logger.error('Error processing reminder jobs', { error: error.message });
      throw new Error('Failed to process reminder jobs');
    }
  }

  async processReminderJob(job) {
    try {
      const contact = await Contact.findById(job.customer_id);
      if (!contact) {
        job.status = 'SKIPPED';
        await job.save();
        return;
      }

      // Check consent
      if (!contact.consents[job.channel]) {
        job.status = 'SKIPPED';
        await job.save();
        return;
      }

      // Check quiet hours
      if (this.isQuietHours(contact, job.channel)) {
        // Reschedule for later
        const nextAvailable = this.getNextAvailableTime(contact);
        job.scheduled_for = nextAvailable;
        await job.save();
        return;
      }

      // Send message (placeholder - would integrate with actual messaging providers)
      const result = await this.sendMessage(job, contact);
      
      if (result.success) {
        job.status = 'SENT';
        job.send_result = {
          provider_msg_id: result.messageId,
          retry_count: 0
        };
      } else {
        job.status = 'FAILED';
        job.send_result = {
          error: result.error,
          retry_count: (job.send_result?.retry_count || 0) + 1
        };
      }

      await job.save();

      // Create message log
      await this.createMessageLog(job, result);

      logger.info('Reminder job processed', { 
        job_id: job.job_id, 
        status: job.status 
      });
    } catch (error) {
      logger.error('Error processing reminder job', { 
        job_id: job.job_id, 
        error: error.message 
      });
    }
  }

  async sendMessage(job, contact) {
    // Placeholder for actual messaging integration
    // Would integrate with WhatsApp Business API, SMS providers, Email services
    try {
      // Simulate message sending
      const messageId = `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      logger.info('Message sent', {
        job_id: job.job_id,
        channel: job.channel,
        customer_id: contact.customer_id,
        message_id: messageId
      });

      return { success: true, messageId };
    } catch (error) {
      logger.error('Error sending message', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  async createMessageLog(job, result) {
    try {
      const messageLog = new MessageLog({
        log_id: `LOG-${job.job_id}-${Date.now()}`,
        job_id: job._id,
        customer_id: job.customer_id,
        channel: job.channel,
        template_id: job.template_id,
        sent_at: new Date(),
        delivery_status: result.success ? 'DELIVERED' : 'FAILED',
        meta: {
          provider_msg_id: result.messageId,
          retry_count: job.send_result?.retry_count || 0
        }
      });

      await messageLog.save();
    } catch (error) {
      logger.error('Error creating message log', { error: error.message });
    }
  }

  isQuietHours(contact, channel) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const quietStart = this.timeToMinutes(contact.preferences.quiet_hours_start);
    const quietEnd = this.timeToMinutes(contact.preferences.quiet_hours_end);

    // Only apply quiet hours to promotional messages
    // Transactional messages can be sent anytime
    return currentTime >= quietStart || currentTime <= quietEnd;
  }

  timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  getNextAvailableTime(contact) {
    const now = new Date();
    const quietEnd = this.timeToMinutes(contact.preferences.quiet_hours_end);
    const nextAvailable = new Date(now);
    
    if (now.getHours() * 60 + now.getMinutes() < quietEnd) {
      nextAvailable.setHours(Math.floor(quietEnd / 60), quietEnd % 60, 0, 0);
    } else {
      nextAvailable.setDate(nextAvailable.getDate() + 1);
      nextAvailable.setHours(Math.floor(quietEnd / 60), quietEnd % 60, 0, 0);
    }

    return nextAvailable;
  }

  // Analytics
  async getEngagementAnalytics(filters = {}) {
    try {
      const pipeline = [
        {
          $match: {
            sent_at: { $gte: filters.date_from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            ...(filters.customer_id && { customer_id: filters.customer_id })
          }
        },
        {
          $group: {
            _id: {
              channel: '$channel',
              delivery_status: '$delivery_status'
            },
            count: { $sum: 1 },
            total_cost: { $sum: '$cost' }
          }
        },
        {
          $group: {
            _id: '$_id.channel',
            total_sent: { $sum: '$count' },
            delivered: {
              $sum: {
                $cond: [{ $eq: ['$_id.delivery_status', 'DELIVERED'] }, '$count', 0]
              }
            },
            total_cost: { $sum: '$total_cost' }
          }
        },
        {
          $project: {
            channel: '$_id',
            total_sent: 1,
            delivered: 1,
            delivery_rate: {
              $multiply: [
                { $divide: ['$delivered', '$total_sent'] },
                100
              ]
            },
            total_cost: 1
          }
        }
      ];

      const analytics = await MessageLog.aggregate(pipeline);
      return { success: true, data: analytics };
    } catch (error) {
      logger.error('Error getting engagement analytics', { error: error.message });
      throw new Error('Failed to get analytics');
    }
  }
}

module.exports = new EngagementService();

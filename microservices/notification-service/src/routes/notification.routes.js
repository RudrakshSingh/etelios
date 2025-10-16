const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const Joi = require('joi');

// Apply authentication to all routes
router.use(authenticate);

// Validation schemas
const createNotificationSchema = Joi.object({
  recipient_id: Joi.string().required(),
  recipient_type: Joi.string().valid('USER', 'CUSTOMER', 'EMPLOYEE', 'SYSTEM').default('USER'),
  title: Joi.string().required().min(5).max(200),
  message: Joi.string().required().min(10).max(1000),
  type: Joi.string().valid(
    'SYSTEM', 'ALERT', 'REMINDER', 'APPROVAL', 'REJECTION', 
    'ASSIGNMENT', 'ESCALATION', 'BIRTHDAY', 'ANNIVERSARY',
    'APPOINTMENT', 'DOCUMENT', 'ASSET', 'TRANSFER', 'SLA',
    'MARKETING', 'ENGAGEMENT', 'COMPLIANCE'
  ).required(),
  category: Joi.string().valid(
    'HR', 'FINANCE', 'SALES', 'CUSTOMER_SERVICE', 'INVENTORY',
    'COMPLIANCE', 'MARKETING', 'SYSTEM', 'SECURITY'
  ).required(),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL').default('MEDIUM'),
  channels: Joi.array().items(
    Joi.string().valid('EMAIL', 'SMS', 'WHATSAPP', 'PUSH', 'SLACK', 'WEBHOOK', 'APP_INBOX')
  ).min(1).default(['APP_INBOX']),
  metadata: Joi.object().optional(),
  template_id: Joi.string().optional(),
  variables: Joi.object().optional(),
  scheduled_for: Joi.date().optional(),
  expires_at: Joi.date().optional()
});

const getNotificationsSchema = Joi.object({
  status: Joi.string().valid('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'CANCELLED').optional(),
  type: Joi.string().optional(),
  category: Joi.string().optional(),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL').optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
  unread_only: Joi.boolean().default(false)
});

const acknowledgeNotificationSchema = Joi.object({
  response: Joi.string().valid('ACCEPTED', 'REJECTED', 'PENDING', 'NO_RESPONSE').default('ACCEPTED'),
  response_data: Joi.object().optional()
});

const getStatsSchema = Joi.object({
  start_date: Joi.date().optional(),
  end_date: Joi.date().optional(),
  type: Joi.string().optional(),
  category: Joi.string().optional(),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL').optional()
});

// Create notification
router.post('/',
  requireRole(['admin', 'manager', 'hr']),
  requirePermission('notifications:create'),
  validateRequest(createNotificationSchema),
  async (req, res) => {
    try {
      const notificationData = {
        ...req.body,
        created_by: req.user._id
      };

      const notification = await notificationService.createNotification(notificationData);

      res.status(201).json({
        success: true,
        message: 'Notification created and sent successfully',
        data: notification
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create notification'
      });
    }
  }
);

// Get user notifications
router.get('/',
  requirePermission('notifications:read'),
  validateRequest(getNotificationsSchema),
  async (req, res) => {
    try {
      const filters = {
        ...req.query,
        limit: parseInt(req.query.limit) || 20,
        offset: parseInt(req.query.offset) || 0,
        unread_only: req.query.unread_only === 'true'
      };

      const result = await notificationService.getUserNotifications(req.user._id, filters);

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get notifications'
      });
    }
  }
);

// Get notification by ID
router.get('/:notificationId',
  requirePermission('notifications:read'),
  async (req, res) => {
    try {
      const { notificationId } = req.params;
      
      const Notification = require('../models/Notification.model');
      const notification = await Notification.findOne({
        notification_id: notificationId,
        recipient_id: req.user._id
      }).populate('created_by', 'name email');

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      res.status(200).json({
        success: true,
        data: notification
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get notification'
      });
    }
  }
);

// Mark notification as read
router.patch('/:notificationId/read',
  requirePermission('notifications:update'),
  async (req, res) => {
    try {
      const { notificationId } = req.params;
      
      const notification = await notificationService.markAsRead(notificationId, req.user._id);

      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        data: notification
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to mark notification as read'
      });
    }
  }
);

// Acknowledge notification
router.patch('/:notificationId/acknowledge',
  requirePermission('notifications:update'),
  validateRequest(acknowledgeNotificationSchema),
  async (req, res) => {
    try {
      const { notificationId } = req.params;
      const { response, response_data } = req.body;
      
      const notification = await notificationService.acknowledgeNotification(
        notificationId, 
        req.user._id, 
        response, 
        response_data
      );

      res.status(200).json({
        success: true,
        message: 'Notification acknowledged',
        data: notification
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to acknowledge notification'
      });
    }
  }
);

// Get notification statistics
router.get('/stats/overview',
  requireRole(['admin', 'manager']),
  requirePermission('notifications:analytics'),
  validateRequest(getStatsSchema),
  async (req, res) => {
    try {
      const filters = req.query;
      const stats = await notificationService.getNotificationStats(filters);

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get notification statistics'
      });
    }
  }
);

// Bulk mark as read
router.patch('/bulk/read',
  requirePermission('notifications:update'),
  async (req, res) => {
    try {
      const { notificationIds } = req.body;
      
      if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'notificationIds array is required'
        });
      }

      const Notification = require('../models/Notification.model');
      const result = await Notification.updateMany(
        {
          notification_id: { $in: notificationIds },
          recipient_id: req.user._id
        },
        {
          read_at: new Date()
        }
      );

      res.status(200).json({
        success: true,
        message: `${result.modifiedCount} notifications marked as read`,
        data: { modifiedCount: result.modifiedCount }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to mark notifications as read'
      });
    }
  }
);

// Get unread count
router.get('/count/unread',
  requirePermission('notifications:read'),
  async (req, res) => {
    try {
      const Notification = require('../models/Notification.model');
      const count = await Notification.countDocuments({
        recipient_id: req.user._id,
        read_at: { $exists: false }
      });

      res.status(200).json({
        success: true,
        data: { unread_count: count }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get unread count'
      });
    }
  }
);

module.exports = router;

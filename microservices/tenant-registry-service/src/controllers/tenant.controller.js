const Tenant = require('../models/Tenant.model');
const databaseRouter = require('../utils/database.router');
const logger = require('../utils/logger');
const Joi = require('joi');

/**
 * Tenant Controller
 * Handles all tenant-related operations
 */
class TenantController {
  /**
   * Create new tenant
   */
  async createTenant(req, res) {
    try {
      // Validate input
      const schema = Joi.object({
        tenantName: Joi.string().required().trim().min(2).max(100),
        domain: Joi.string().required().trim().min(3).max(100),
        subdomain: Joi.string().required().trim().min(2).max(50).alphanum(),
        plan: Joi.string().valid('basic', 'professional', 'enterprise', 'custom').default('basic'),
        features: Joi.array().items(Joi.object({
          name: Joi.string().required(),
          enabled: Joi.boolean().default(true),
          limits: Joi.object({
            maxUsers: Joi.number().min(1).default(10),
            maxStorage: Joi.number().min(100).default(1000),
            maxApiCalls: Joi.number().min(1000).default(10000)
          })
        })).default([]),
        branding: Joi.object({
          logo: Joi.string().uri().optional(),
          primaryColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#007bff'),
          secondaryColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#6c757d'),
          favicon: Joi.string().uri().optional(),
          customCss: Joi.string().optional()
        }).default({}),
        configuration: Joi.object({
          timezone: Joi.string().default('UTC'),
          currency: Joi.string().length(3).default('USD'),
          language: Joi.string().length(2).default('en'),
          dateFormat: Joi.string().default('MM/DD/YYYY'),
          timeFormat: Joi.string().valid('12h', '24h').default('12h')
        }).default({})
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      // Generate tenant ID
      const tenantId = value.subdomain.toLowerCase();
      const database = `etelios_${tenantId}`;

      // Check if tenant already exists
      const existingTenant = await Tenant.findOne({
        $or: [
          { tenantId },
          { domain: value.domain },
          { subdomain: value.subdomain }
        ]
      });

      if (existingTenant) {
        return res.status(409).json({
          success: false,
          message: 'Tenant already exists',
          error: 'TENANT_EXISTS'
        });
      }

      // Create tenant
      const tenantData = {
        ...value,
        tenantId,
        database,
        status: 'trial',
        limits: {
          maxUsers: 10,
          maxStorage: 1000,
          maxApiCalls: 10000,
          maxIntegrations: 5
        },
        usage: {
          currentUsers: 0,
          currentStorage: 0,
          currentApiCalls: 0,
          currentIntegrations: 0
        }
      };

      const tenant = new Tenant(tenantData);
      await tenant.save();

      // Create tenant database
      await databaseRouter.createTenantDatabase(tenantId);

      logger.info(`Tenant created: ${tenantId}`, {
        tenantId,
        tenantName: tenant.tenantName,
        plan: tenant.plan
      });

      res.status(201).json({
        success: true,
        message: 'Tenant created successfully',
        data: {
          tenantId: tenant.tenantId,
          tenantName: tenant.tenantName,
          domain: tenant.domain,
          subdomain: tenant.subdomain,
          status: tenant.status,
          plan: tenant.plan,
          tenantUrl: tenant.tenantUrl,
          features: tenant.features,
          branding: tenant.branding,
          configuration: tenant.configuration
        }
      });

    } catch (error) {
      logger.error('Tenant creation failed:', error);
      res.status(500).json({
        success: false,
        message: 'Tenant creation failed',
        error: 'TENANT_CREATION_ERROR'
      });
    }
  }

  /**
   * Get tenant by ID
   */
  async getTenant(req, res) {
    try {
      const { tenantId } = req.params;

      const tenant = await Tenant.findOne({ tenantId });
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found',
          error: 'TENANT_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        data: {
          tenantId: tenant.tenantId,
          tenantName: tenant.tenantName,
          domain: tenant.domain,
          subdomain: tenant.subdomain,
          status: tenant.status,
          plan: tenant.plan,
          tenantUrl: tenant.tenantUrl,
          features: tenant.features,
          branding: tenant.branding,
          configuration: tenant.configuration,
          limits: tenant.limits,
          usage: tenant.usage,
          settings: tenant.settings,
          analytics: tenant.analytics,
          createdAt: tenant.createdAt,
          updatedAt: tenant.updatedAt
        }
      });

    } catch (error) {
      logger.error('Get tenant failed:', error);
      res.status(500).json({
        success: false,
        message: 'Get tenant failed',
        error: 'GET_TENANT_ERROR'
      });
    }
  }

  /**
   * Update tenant
   */
  async updateTenant(req, res) {
    try {
      const { tenantId } = req.params;

      // Validate input
      const schema = Joi.object({
        tenantName: Joi.string().trim().min(2).max(100).optional(),
        plan: Joi.string().valid('basic', 'professional', 'enterprise', 'custom').optional(),
        features: Joi.array().items(Joi.object({
          name: Joi.string().required(),
          enabled: Joi.boolean().default(true),
          limits: Joi.object({
            maxUsers: Joi.number().min(1),
            maxStorage: Joi.number().min(100),
            maxApiCalls: Joi.number().min(1000)
          })
        })).optional(),
        branding: Joi.object({
          logo: Joi.string().uri().optional(),
          primaryColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
          secondaryColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
          favicon: Joi.string().uri().optional(),
          customCss: Joi.string().optional()
        }).optional(),
        configuration: Joi.object({
          timezone: Joi.string().optional(),
          currency: Joi.string().length(3).optional(),
          language: Joi.string().length(2).optional(),
          dateFormat: Joi.string().optional(),
          timeFormat: Joi.string().valid('12h', '24h').optional()
        }).optional(),
        settings: Joi.object({
          allowSelfRegistration: Joi.boolean().optional(),
          requireEmailVerification: Joi.boolean().optional(),
          allowPasswordReset: Joi.boolean().optional(),
          sessionTimeout: Joi.number().min(5).max(480).optional(),
          maxLoginAttempts: Joi.number().min(3).max(10).optional()
        }).optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      const tenant = await Tenant.findOneAndUpdate(
        { tenantId },
        { $set: value },
        { new: true, runValidators: true }
      );

      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found',
          error: 'TENANT_NOT_FOUND'
        });
      }

      logger.info(`Tenant updated: ${tenantId}`, {
        tenantId,
        updates: Object.keys(value)
      });

      res.json({
        success: true,
        message: 'Tenant updated successfully',
        data: {
          tenantId: tenant.tenantId,
          tenantName: tenant.tenantName,
          status: tenant.status,
          plan: tenant.plan,
          features: tenant.features,
          branding: tenant.branding,
          configuration: tenant.configuration,
          settings: tenant.settings,
          updatedAt: tenant.updatedAt
        }
      });

    } catch (error) {
      logger.error('Update tenant failed:', error);
      res.status(500).json({
        success: false,
        message: 'Update tenant failed',
        error: 'UPDATE_TENANT_ERROR'
      });
    }
  }

  /**
   * Delete tenant
   */
  async deleteTenant(req, res) {
    try {
      const { tenantId } = req.params;

      const tenant = await Tenant.findOneAndDelete({ tenantId });
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found',
          error: 'TENANT_NOT_FOUND'
        });
      }

      // Close tenant database connection
      await databaseRouter.closeTenantConnection(tenantId);

      logger.info(`Tenant deleted: ${tenantId}`, {
        tenantId,
        tenantName: tenant.tenantName
      });

      res.json({
        success: true,
        message: 'Tenant deleted successfully'
      });

    } catch (error) {
      logger.error('Delete tenant failed:', error);
      res.status(500).json({
        success: false,
        message: 'Delete tenant failed',
        error: 'DELETE_TENANT_ERROR'
      });
    }
  }

  /**
   * List all tenants
   */
  async listTenants(req, res) {
    try {
      const { page = 1, limit = 10, status, plan } = req.query;
      const skip = (page - 1) * limit;

      const filter = {};
      if (status) filter.status = status;
      if (plan) filter.plan = plan;

      const tenants = await Tenant.find(filter)
        .select('-__v')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

      const total = await Tenant.countDocuments(filter);

      res.json({
        success: true,
        data: {
          tenants: tenants.map(tenant => ({
            tenantId: tenant.tenantId,
            tenantName: tenant.tenantName,
            domain: tenant.domain,
            subdomain: tenant.subdomain,
            status: tenant.status,
            plan: tenant.plan,
            tenantUrl: tenant.tenantUrl,
            usage: tenant.usage,
            limits: tenant.limits,
            createdAt: tenant.createdAt
          })),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      logger.error('List tenants failed:', error);
      res.status(500).json({
        success: false,
        message: 'List tenants failed',
        error: 'LIST_TENANTS_ERROR'
      });
    }
  }

  /**
   * Get tenant analytics
   */
  async getTenantAnalytics(req, res) {
    try {
      const { tenantId } = req.params;

      const tenant = await Tenant.findOne({ tenantId });
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found',
          error: 'TENANT_NOT_FOUND'
        });
      }

      // Get database connection status
      const connectionStatus = databaseRouter.getConnectionStatus();
      const healthCheck = await databaseRouter.healthCheck();

      res.json({
        success: true,
        data: {
          tenantId: tenant.tenantId,
          analytics: tenant.analytics,
          usage: tenant.usage,
          limits: tenant.limits,
          connectionStatus: connectionStatus.tenants[tenantId] || 0,
          healthCheck: healthCheck.tenants[tenantId] || false,
          isWithinLimits: tenant.isWithinLimits(),
          lastLogin: tenant.analytics.lastLogin,
          totalLogins: tenant.analytics.totalLogins,
          totalApiCalls: tenant.analytics.totalApiCalls,
          totalStorageUsed: tenant.analytics.totalStorageUsed
        }
      });

    } catch (error) {
      logger.error('Get tenant analytics failed:', error);
      res.status(500).json({
        success: false,
        message: 'Get tenant analytics failed',
        error: 'GET_TENANT_ANALYTICS_ERROR'
      });
    }
  }

  /**
   * Update tenant usage
   */
  async updateTenantUsage(req, res) {
    try {
      const { tenantId } = req.params;
      const { usage } = req.body;

      const tenant = await Tenant.findOneAndUpdate(
        { tenantId },
        { 
          $set: { 
            'usage.currentUsers': usage.currentUsers || 0,
            'usage.currentStorage': usage.currentStorage || 0,
            'usage.currentApiCalls': usage.currentApiCalls || 0,
            'usage.currentIntegrations': usage.currentIntegrations || 0
          }
        },
        { new: true }
      );

      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found',
          error: 'TENANT_NOT_FOUND'
        });
      }

      logger.info(`Tenant usage updated: ${tenantId}`, {
        tenantId,
        usage: tenant.usage
      });

      res.json({
        success: true,
        message: 'Tenant usage updated successfully',
        data: {
          usage: tenant.usage,
          isWithinLimits: tenant.isWithinLimits()
        }
      });

    } catch (error) {
      logger.error('Update tenant usage failed:', error);
      res.status(500).json({
        success: false,
        message: 'Update tenant usage failed',
        error: 'UPDATE_TENANT_USAGE_ERROR'
      });
    }
  }
}

module.exports = new TenantController();

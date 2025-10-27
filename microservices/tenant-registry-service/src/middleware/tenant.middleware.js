const Tenant = require('../models/Tenant.model');
const logger = require('../utils/logger');

/**
 * Tenant identification middleware
 * Extracts tenant information from request and adds to req.tenant
 */
const identifyTenant = async (req, res, next) => {
  try {
    let tenantId = null;
    let tenant = null;

    // Method 1: Extract from subdomain (company.etelios.com)
    const hostname = req.get('host') || req.hostname;
    const subdomain = extractSubdomain(hostname);
    
    if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
      tenant = await Tenant.findByDomain(subdomain);
      if (tenant) {
        tenantId = tenant.tenantId;
      }
    }

    // Method 2: Extract from X-Tenant-ID header
    if (!tenantId) {
      tenantId = req.get('X-Tenant-ID') || req.get('x-tenant-id');
      if (tenantId) {
        tenant = await Tenant.findOne({ tenantId });
      }
    }

    // Method 3: Extract from query parameter
    if (!tenantId) {
      tenantId = req.query.tenant || req.query.tenantId;
      if (tenantId) {
        tenant = await Tenant.findOne({ tenantId });
      }
    }

    // Method 4: Extract from path parameter
    if (!tenantId) {
      tenantId = req.params.tenantId;
      if (tenantId) {
        tenant = await Tenant.findOne({ tenantId });
      }
    }

    // If no tenant found, return error
    if (!tenant) {
      logger.warn(`Tenant not found for request: ${req.method} ${req.originalUrl}`, {
        hostname,
        subdomain,
        headers: req.headers,
        query: req.query
      });
      
      return res.status(404).json({
        success: false,
        message: 'Tenant not found',
        error: 'TENANT_NOT_FOUND'
      });
    }

    // Check if tenant is active
    if (!tenant.isActive()) {
      logger.warn(`Inactive tenant access attempt: ${tenant.tenantId}`, {
        status: tenant.status,
        tenantId: tenant.tenantId
      });
      
      return res.status(403).json({
        success: false,
        message: 'Tenant account is inactive',
        error: 'TENANT_INACTIVE',
        status: tenant.status
      });
    }

    // Check if tenant is within limits
    if (!tenant.isWithinLimits()) {
      logger.warn(`Tenant limits exceeded: ${tenant.tenantId}`, {
        usage: tenant.usage,
        limits: tenant.limits
      });
      
      return res.status(429).json({
        success: false,
        message: 'Tenant limits exceeded',
        error: 'TENANT_LIMITS_EXCEEDED',
        usage: tenant.usage,
        limits: tenant.limits
      });
    }

    // Add tenant information to request
    req.tenant = tenant;
    req.tenantId = tenant.tenantId;
    req.tenantDatabase = tenant.database;
    req.tenantFeatures = tenant.features;
    req.tenantBranding = tenant.branding;
    req.tenantConfig = tenant.configuration;

    // Log tenant access
    logger.info(`Tenant access: ${tenant.tenantId}`, {
      tenantId: tenant.tenantId,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent')
    });

    next();
  } catch (error) {
    logger.error('Tenant identification failed:', error);
    res.status(500).json({
      success: false,
      message: 'Tenant identification failed',
      error: 'TENANT_IDENTIFICATION_ERROR'
    });
  }
};

/**
 * Extract subdomain from hostname
 */
const extractSubdomain = (hostname) => {
  if (!hostname) return null;
  
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    return parts[0];
  }
  return null;
};

/**
 * Tenant feature check middleware
 * Checks if tenant has access to specific feature
 */
const requireFeature = (featureName) => {
  return (req, res, next) => {
    if (!req.tenant) {
      return res.status(500).json({
        success: false,
        message: 'Tenant not identified',
        error: 'TENANT_NOT_IDENTIFIED'
      });
    }

    if (!req.tenant.hasFeature(featureName)) {
      logger.warn(`Feature access denied: ${featureName} for tenant ${req.tenantId}`);
      
      return res.status(403).json({
        success: false,
        message: `Feature '${featureName}' not available for this tenant`,
        error: 'FEATURE_NOT_AVAILABLE',
        feature: featureName
      });
    }

    next();
  };
};

/**
 * Tenant plan check middleware
 * Checks if tenant has required plan
 */
const requirePlan = (requiredPlan) => {
  const planHierarchy = {
    'basic': 1,
    'professional': 2,
    'enterprise': 3,
    'custom': 4
  };

  return (req, res, next) => {
    if (!req.tenant) {
      return res.status(500).json({
        success: false,
        message: 'Tenant not identified',
        error: 'TENANT_NOT_IDENTIFIED'
      });
    }

    const tenantPlanLevel = planHierarchy[req.tenant.plan] || 0;
    const requiredPlanLevel = planHierarchy[requiredPlan] || 0;

    if (tenantPlanLevel < requiredPlanLevel) {
      logger.warn(`Plan access denied: ${requiredPlan} required, tenant has ${req.tenant.plan}`);
      
      return res.status(403).json({
        success: false,
        message: `Plan '${requiredPlan}' required for this feature`,
        error: 'INSUFFICIENT_PLAN',
        currentPlan: req.tenant.plan,
        requiredPlan: requiredPlan
      });
    }

    next();
  };
};

/**
 * Tenant rate limiting middleware
 * Implements tenant-specific rate limiting
 */
const tenantRateLimit = (maxRequests = 1000, windowMs = 60000) => {
  const requests = new Map();

  return (req, res, next) => {
    if (!req.tenantId) {
      return next();
    }

    const now = Date.now();
    const windowStart = now - windowMs;
    const tenantRequests = requests.get(req.tenantId) || [];

    // Remove old requests
    const validRequests = tenantRequests.filter(time => time > windowStart);
    validRequests.push(now);
    requests.set(req.tenantId, validRequests);

    if (validRequests.length > maxRequests) {
      logger.warn(`Rate limit exceeded for tenant: ${req.tenantId}`, {
        tenantId: req.tenantId,
        requests: validRequests.length,
        limit: maxRequests
      });

      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded',
        error: 'RATE_LIMIT_EXCEEDED',
        limit: maxRequests,
        window: windowMs
      });
    }

    next();
  };
};

module.exports = {
  identifyTenant,
  requireFeature,
  requirePlan,
  tenantRateLimit
};

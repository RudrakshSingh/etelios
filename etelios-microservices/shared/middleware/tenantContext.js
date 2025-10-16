const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const createTenantContext = (serviceName) => {
  const serviceLogger = logger(serviceName);

  return (req, res, next) => {
    try {
      // Extract tenant context from headers or JWT
      const tenantId = req.headers['x-tenant-id'] || req.headers['x-tenant-id'];
      const orgId = req.headers['x-org-id'];
      const storeId = req.headers['x-store-id'];
      const channelId = req.headers['x-channel-id'];

      // Extract from JWT if available
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
          req.tenantContext = {
            tenant_id: decoded.tenant_id || tenantId,
            org_id: decoded.org_id || orgId,
            store_id: decoded.store_id || storeId,
            channel_id: decoded.channel_id || channelId,
            user_id: decoded.user_id,
            roles: decoded.roles || [],
            permissions: decoded.permissions || []
          };
        } catch (jwtError) {
          serviceLogger.warn('JWT verification failed', { 
            service: serviceName, 
            error: jwtError.message 
          });
        }
      }

      // Set tenant context from headers if not set from JWT
      if (!req.tenantContext) {
        req.tenantContext = {
          tenant_id: tenantId,
          org_id: orgId,
          store_id: storeId,
          channel_id: channelId,
          user_id: null,
          roles: [],
          permissions: []
        };
      }

      // Validate required tenant context
      if (!req.tenantContext.tenant_id) {
        return res.status(400).json({
          error: 'Tenant context required',
          message: 'X-Tenant-Id header is required'
        });
      }

      // Add tenant context to request
      req.tenant = req.tenantContext.tenant_id;
      req.org = req.tenantContext.org_id;
      req.store = req.tenantContext.store_id;
      req.channel = req.tenantContext.channel_id;

      serviceLogger.debug('Tenant context set', {
        service: serviceName,
        tenant_id: req.tenantContext.tenant_id,
        org_id: req.tenantContext.org_id,
        store_id: req.tenantContext.store_id
      });

      next();
    } catch (error) {
      serviceLogger.error('Tenant context middleware error', {
        service: serviceName,
        error: error.message
      });
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to process tenant context'
      });
    }
  };
};

module.exports = createTenantContext;
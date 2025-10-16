const rbac = (requiredRole) => {
  return (req, res, next) => {
    // Mock RBAC middleware - in production, this would check user roles
    req.user = {
      id: 'mock-user-id',
      role: 'admin',
      permissions: ['read', 'write', 'delete']
    };
    next();
  };
};

module.exports = rbac;

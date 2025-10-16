const auth = (req, res, next) => {
  // Mock authentication middleware - in production, this would verify JWT tokens
  req.user = {
    id: 'mock-user-id',
    role: 'admin',
    permissions: ['read', 'write', 'delete']
  };
  next();
};

module.exports = auth;

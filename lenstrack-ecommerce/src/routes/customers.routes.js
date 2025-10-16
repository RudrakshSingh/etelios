const express = require('express');
const router = express.Router();

// Customers routes
router.get('/customers', (req, res) => {
  res.json({
    success: true,
    message: 'Get all customers',
    data: [],
    timestamp: new Date().toISOString()
  });
});

router.get('/customers/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Get customer by ID',
    data: { id: req.params.id },
    timestamp: new Date().toISOString()
  });
});

router.post('/customers', (req, res) => {
  res.json({
    success: true,
    message: 'Create new customer',
    data: req.body,
    timestamp: new Date().toISOString()
  });
});

router.put('/customers/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Update customer',
    data: { id: req.params.id, ...req.body },
    timestamp: new Date().toISOString()
  });
});

router.delete('/customers/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Delete customer',
    data: { id: req.params.id },
    timestamp: new Date().toISOString()
  });
});

router.get('/customers/:id/orders', (req, res) => {
  res.json({
    success: true,
    message: 'Get customer orders',
    data: { customerId: req.params.id, orders: [] },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

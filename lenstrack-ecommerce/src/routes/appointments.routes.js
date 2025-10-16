const express = require('express');
const router = express.Router();

// Appointments routes
router.get('/appointments', (req, res) => {
  res.json({
    success: true,
    message: 'Get all appointments',
    data: [],
    timestamp: new Date().toISOString()
  });
});

router.get('/appointments/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Get appointment by ID',
    data: { id: req.params.id },
    timestamp: new Date().toISOString()
  });
});

router.post('/appointments', (req, res) => {
  res.json({
    success: true,
    message: 'Create new appointment',
    data: req.body,
    timestamp: new Date().toISOString()
  });
});

router.put('/appointments/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Update appointment',
    data: { id: req.params.id, ...req.body },
    timestamp: new Date().toISOString()
  });
});

router.delete('/appointments/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Cancel appointment',
    data: { id: req.params.id },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

const express = require('express');
const router = express.Router();

// Campaigns routes
router.get('/campaigns', (req, res) => {
  res.json({
    success: true,
    message: 'Get all campaigns',
    data: [],
    timestamp: new Date().toISOString()
  });
});

router.get('/campaigns/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Get campaign by ID',
    data: { id: req.params.id },
    timestamp: new Date().toISOString()
  });
});

router.post('/campaigns', (req, res) => {
  res.json({
    success: true,
    message: 'Create new campaign',
    data: req.body,
    timestamp: new Date().toISOString()
  });
});

router.put('/campaigns/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Update campaign',
    data: { id: req.params.id, ...req.body },
    timestamp: new Date().toISOString()
  });
});

router.delete('/campaigns/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Delete campaign',
    data: { id: req.params.id },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

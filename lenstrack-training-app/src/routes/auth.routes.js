const express = require('express');
const router = express.Router();

// Training App Auth Routes
router.post('/login', (req, res) => {
  res.json({
    success: true,
    message: 'Training app login endpoint',
    data: { token: 'training-token-123' }
  });
});

router.post('/register', (req, res) => {
  res.json({
    success: true,
    message: 'Training app register endpoint',
    data: { userId: 'training-user-123' }
  });
});

router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Training app logout endpoint'
  });
});

module.exports = router;

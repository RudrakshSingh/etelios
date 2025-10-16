const express = require('express');
const router = express.Router();

// AI Role-play
router.post('/roleplay', (req, res) => {
  res.json({
    success: true,
    message: 'AI role-play session',
    data: {
      scenario: 'Customer wants to return glasses',
      response: 'I understand you want to return your glasses. Let me help you with that.',
      score: 85
    }
  });
});

// Voice Interaction
router.post('/voice', (req, res) => {
  res.json({
    success: true,
    message: 'Voice interaction',
    data: {
      transcript: 'Hello, how can I help you today?',
      intent: 'greeting',
      confidence: 0.95
    }
  });
});

// Feedback Generation
router.post('/feedback', (req, res) => {
  res.json({
    success: true,
    message: 'AI feedback generated',
    data: {
      rubric: {
        discovery: 8,
        productFit: 7,
        clarity: 9,
        empathy: 8,
        compliance: 9,
        close: 6
      },
      suggestions: ['Work on closing techniques', 'Great empathy shown']
    }
  });
});

// Simulation
router.post('/simulation', (req, res) => {
  res.json({
    success: true,
    message: 'AI simulation',
    data: {
      scenario: 'Difficult customer complaint',
      difficulty: 'hard',
      duration: 300
    }
  });
});

module.exports = router;

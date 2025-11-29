// backend/routes/proactive.js
const express = require('express');
const router = express.Router();
const proactiveController = require('../controllers/proactiveController');
const { protect } = require('../middleware/authMiddleware');

// All proactive routes require authentication
router.use(protect);

// Generate proactive greeting
router.post('/greeting', proactiveController.generateProactiveGreeting);

// Generate anticipatory suggestions
router.post('/suggestions', proactiveController.generateSuggestions);

// Prefetch common answers
router.post('/prefetch', proactiveController.prefetchAnswers);

// Get smart instant response
router.post('/smart-response', proactiveController.getSmartResponse);

module.exports = router;

const express = require('express');
const router = express.Router();
const flashcardController = require('../controllers/flashcardController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/v1/flashcards/generate - Generate flashcards for rapid-fire game
router.post('/generate', protect, flashcardController.generateFlashcards);

module.exports = router;

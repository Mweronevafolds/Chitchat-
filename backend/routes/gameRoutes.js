const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/v1/games/ninja - Generate a ninja-style slicing game
router.post('/ninja', protect, gameController.generateNinjaGame);

module.exports = router;

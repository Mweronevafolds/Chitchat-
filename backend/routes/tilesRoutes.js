const express = require('express');
const router = express.Router();
const tilesController = require('../controllers/tilesController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/v1/tiles
// Generates a personalized list of curiosity tiles for the logged-in user.
router.post('/', protect, tilesController.generateTiles);

module.exports = router;


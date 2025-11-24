const express = require('express');
const router = express.Router();
const pathController = require('../controllers/pathController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/v1/paths/generate - Create a new AI curriculum
router.post('/generate', protect, pathController.generatePath);

// GET /api/v1/paths - List my paths
router.get('/', protect, pathController.getMyPaths);

module.exports = router;

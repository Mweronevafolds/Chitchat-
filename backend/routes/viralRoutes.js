const express = require('express');
const router = express.Router();
const viralController = require('../controllers/viralController');
const { protect } = require('../middleware/authMiddleware');

router.post('/share', protect, viralController.trackShare);

module.exports = router;

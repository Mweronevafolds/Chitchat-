const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

// As per the plan: POST /api/v1/chat
router.post('/', protect, chatController.postChatMessage);

module.exports = router;

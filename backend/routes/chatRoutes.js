const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/v1/chat - Send a chat message
router.post('/', protect, chatController.postChatMessage);

// GET /api/v1/chat/sessions - Get user's chat history
router.get('/sessions', protect, chatController.getChatSessions);

// GET /api/v1/chat/:sessionId/messages - Get all messages in a session
router.get('/:sessionId/messages', protect, chatController.getSessionMessages);

module.exports = router;

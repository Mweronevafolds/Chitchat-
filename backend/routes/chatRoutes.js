const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// POST /api/v1/chat/upload - Upload file (images, documents)
router.post('/upload', protect, upload.single('file'), chatController.uploadFile);

// POST /api/v1/chat - Send a chat message
router.post('/', protect, chatController.postChatMessage);

// GET /api/v1/chat/sessions - Get user's chat history
router.get('/sessions', protect, chatController.getChatSessions);

// GET /api/v1/chat/:sessionId/messages - Get all messages in a session
router.get('/:sessionId/messages', protect, chatController.getSessionMessages);

module.exports = router;

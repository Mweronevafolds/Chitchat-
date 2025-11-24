// backend/routes/debugRoutes.js
const express = require('express');
const router = express.Router();
const debugController = require('../controllers/debugController');

// GET /api/v1/debug/list-models
router.get('/list-models', debugController.listAvailableModels);

module.exports = router;
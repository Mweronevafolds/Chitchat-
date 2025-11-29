// backend/routes/curiosityRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const curiosityController = require('../controllers/curiosityController');

/**
 * POST /api/v1/curiosity/tile-opening
 * Generate an engaging opening message for a curiosity tile
 * Body: { hook: string, seed_prompt: string, type?: string, style?: 'concise'|'playful' }
 */
router.post('/tile-opening', protect, curiosityController.generateTileOpening);

/**
 * POST /api/v1/curiosity/clear-cache
 * Clear the server-side cache (admin/testing)
 */
router.post('/clear-cache', protect, curiosityController.clearCache);

/**
 * GET /api/v1/curiosity/cache-stats
 * Get cache statistics
 */
router.get('/cache-stats', protect, curiosityController.getCacheStats);

/**
 * POST /api/v1/curiosity/prewarm
 * Pre-warm cache for popular tiles
 * Body: { tiles: [{hook, seed_prompt, type}] }
 */
router.post('/prewarm', protect, curiosityController.prewarmCache);

module.exports = router;

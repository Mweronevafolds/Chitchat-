// backend/routes/monetization.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const monController = require('../controllers/monetizationController');
const { handleStripeWebhook } = require('../controllers/webhookController');

// Webhook endpoint (NO AUTH - Stripe calls this)
// NOTE: This must use raw body, configured in server.js
router.post('/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

// Subscriptions
router.get('/subscription/status', protect, monController.getSubscriptionStatus);
router.post('/subscription/checkout', protect, monController.createCheckoutSession);
router.post('/subscription/upgrade', protect, monController.upgradeSubscription); // Legacy support
router.post('/subscription/confirm', protect, monController.confirmSubscription);

// Usage tracking routes
router.get('/usage/:limitType', protect, monController.checkUsageLimit);

// In-app purchase routes (IAP / Course Purchases)
router.post('/iap/purchase', protect, monController.purchaseIAP);

// Creator economy routes
router.get('/creator/earnings', protect, monController.getCreatorEarnings);
router.post('/creator/payout', protect, monController.requestPayout);

module.exports = router;

// backend/routes/iap.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getIAPProducts,
  getIAPBundles,
  getUserWallet,
  getUserPowerups,
  createIAPCheckout,
  createBundleCheckout,
  getPurchaseHistory,
  spendResource
} = require('../controllers/iapController');

// Public routes (authenticated users only)
router.get('/products', protect, getIAPProducts);
router.get('/bundles', protect, getIAPBundles);
router.get('/wallet', protect, getUserWallet);
router.get('/powerups', protect, getUserPowerups);
router.get('/history', protect, getPurchaseHistory);

// Purchase routes
router.post('/checkout/product', protect, createIAPCheckout);
router.post('/checkout/bundle', protect, createBundleCheckout);

// Resource management
router.post('/spend', protect, spendResource);

module.exports = router;

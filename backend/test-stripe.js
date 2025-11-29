// Test Stripe configuration
require('dotenv').config();
const Stripe = require('stripe');

console.log('=== Testing Stripe Configuration ===');
console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✓ SET' : '✗ MISSING');

if (process.env.STRIPE_SECRET_KEY) {
  try {
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    console.log('✓ Stripe initialized successfully');
    console.log('✓ Key format:', process.env.STRIPE_SECRET_KEY.substring(0, 15) + '...');
    
    // Test basic Stripe API call
    stripe.customers.list({ limit: 1 })
      .then(() => {
        console.log('✓ Stripe API connection successful');
        console.log('✓ Ready to accept payments!');
        process.exit(0);
      })
      .catch((err) => {
        console.error('✗ Stripe API error:', err.message);
        process.exit(1);
      });
  } catch (error) {
    console.error('✗ Stripe initialization error:', error.message);
    process.exit(1);
  }
} else {
  console.error('✗ STRIPE_SECRET_KEY not found in environment');
  process.exit(1);
}

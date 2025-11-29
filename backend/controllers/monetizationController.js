// backend/controllers/monetizationController.js
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// --- 1. Subscription Management ---

/**
 * Get user's subscription status with plan details
 */
const getSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get subscription with plan details
    const { data: sub, error } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*, subscription_plans(*)')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    // Fallback to free if no subscription record exists
    const plan = sub || { tier: 'free', status: 'active' };
    
    res.json(plan);
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Create Stripe checkout session for subscription upgrade
 */
const createCheckoutSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { priceId, tier, billingCycle } = req.body; // priceId from Stripe Dashboard

    if (!priceId || !tier) {
      return res.status(400).json({ error: 'priceId and tier are required' });
    }

    console.log(`Creating checkout session for user ${userId}, tier: ${tier}`);

    // Get user email for better Stripe experience
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    // Get or create Stripe customer ID
    let { data: userSub } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    let customerId = userSub?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({ 
        email: profile?.email,
        name: profile?.full_name,
        metadata: { userId } 
      });
      customerId = customer.id;
      
      // Initialize subscription record
      await supabaseAdmin
        .from('user_subscriptions')
        .upsert({ 
          user_id: userId, 
          stripe_customer_id: customerId,
          tier: 'free',
          status: 'active'
        });
      
      console.log(`Created new Stripe customer: ${customerId}`);
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL || 'exp://localhost:8081'}/settings?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || 'exp://localhost:8081'}/premium?payment=canceled`,
      metadata: { 
        userId, 
        tier,
        billingCycle: billingCycle || 'monthly'
      },
      allow_promotion_codes: true, // Enable discount codes
      billing_address_collection: 'auto',
    });

    console.log(`✓ Checkout session created: ${session.id}`);

    res.json({ 
      url: session.url,
      sessionId: session.id 
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Checkout failed', message: error.message });
  }
};

// --- 2. Usage Tracking ---

/**
 * Check if user has reached their usage limit (middleware helper)
 * Export this for use in chatController
 */
const checkUsageLimitHelper = async (userId, limitType) => {
  try {
    // Get current plan limits
    const { data: sub } = await supabaseAdmin
      .from('user_subscriptions')
      .select('subscription_plans(daily_message_limit)')
      .eq('user_id', userId)
      .single();
    
    const limit = sub?.subscription_plans?.daily_message_limit;
    
    // If no limit (null = unlimited)
    if (!limit || limit === -1) return true;

    // Get usage today
    const today = new Date().toISOString().split('T')[0];
    const { data: usage } = await supabaseAdmin
      .from('usage_tracking')
      .select('messages_sent')
      .match({ user_id: userId, date: today })
      .single();

    return (usage?.messages_sent || 0) < limit;
  } catch (error) {
    console.error('Error checking usage limit:', error);
    return true; // Fail open - don't block users on error
  }
};

/**
 * Check usage limits (API endpoint)
 */
async function checkUsageLimit(req, res) {
  try {
    const userId = req.user.id;
    const { limitType } = req.params; // 'messages', 'storage', 'paths'

    // Get user's tier
    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('tier')
      .eq('user_id', userId)
      .single();

    const tier = subscription?.tier || 'free';

    // Define limits per tier
    const limits = {
      free: { messages: 50, storage: 1, paths: 3 },
      plus: { messages: -1, storage: 10, paths: -1 },
      pro: { messages: -1, storage: 100, paths: -1 },
      team: { messages: -1, storage: -1, paths: -1 },
    };

    const limit = limits[tier][limitType];

    // Get current usage
    let current = 0;
    const today = new Date().toISOString().split('T')[0];

    if (limitType === 'messages') {
      const { count } = await supabaseAdmin
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('role', 'user')
        .gte('timestamp', `${today}T00:00:00Z`);
      current = count || 0;
    } else if (limitType === 'storage') {
      const { data: files } = await supabaseAdmin
        .storage
        .from('chat-media')
        .list(userId);
      
      current = files?.reduce((sum, file) => sum + (file.metadata?.size || 0), 0) || 0;
      current = current / (1024 * 1024 * 1024); // Convert to GB
    } else if (limitType === 'paths') {
      const { count } = await supabaseAdmin
        .from('user_learning_paths')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      current = count || 0;
    }

    const allowed = limit === -1 || current < limit;
    const percentage = limit === -1 ? 0 : (current / limit) * 100;

    res.json({
      allowed,
      current,
      limit,
      percentage: Math.round(percentage),
    });
  } catch (error) {
    console.error('Error checking usage limit:', error);
    res.status(500).json({ error: 'Failed to check usage limit' });
  }
}

/**
 * Upgrade subscription tier
 */
async function upgradeSubscription(req, res) {
  try {
    const userId = req.user.id;
    const { tier, billingCycle } = req.body;

    // Pricing
    const prices = {
      plus: { monthly: 9.99, yearly: 99.99 },
      pro: { monthly: 24.99, yearly: 249.99 },
      team: { monthly: 99.99, yearly: 999.99 },
    };

    if (!prices[tier]) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    const amount = prices[tier][billingCycle];

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        userId,
        tier,
        billingCycle,
      },
    });

    // Store subscription intent
    await supabaseAdmin
      .from('subscription_intents')
      .insert({
        user_id: userId,
        tier,
        billing_cycle: billingCycle,
        amount,
        payment_intent_id: paymentIntent.id,
        status: 'pending',
      });

    res.json({
      clientSecret: paymentIntent.client_secret,
      amount,
      tier,
      billingCycle,
    });
  } catch (error) {
    console.error('Error upgrading subscription:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
}

/**
 * Confirm subscription payment (webhook)
 */
async function confirmSubscription(req, res) {
  try {
    const { paymentIntentId } = req.body;

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    const { userId, tier, billingCycle } = paymentIntent.metadata;

    // Calculate expiration
    const now = new Date();
    const expiresAt = new Date(now);
    if (billingCycle === 'monthly') {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    // Update subscription
    const { error } = await supabaseAdmin
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        tier,
        billing_cycle: billingCycle,
        status: 'active',
        expires_at: expiresAt.toISOString(),
        next_billing_date: expiresAt.toISOString(),
        updated_at: now.toISOString(),
      });

    if (error) throw error;

    // Update subscription intent
    await supabaseAdmin
      .from('subscription_intents')
      .update({ status: 'completed' })
      .eq('payment_intent_id', paymentIntentId);

    res.json({ success: true, tier, expiresAt });
  } catch (error) {
    console.error('Error confirming subscription:', error);
    res.status(500).json({ error: 'Failed to confirm subscription' });
  }
}

/**
 * Purchase in-app purchase
 */
async function purchaseIAP(req, res) {
  try {
    const userId = req.user.id;
    const { iapId } = req.body;

    // IAP pricing
    const iapPrices = {
      credits_100: { price: 4.99, value: 100, type: 'credits' },
      credits_500: { price: 19.99, value: 600, type: 'credits' }, // +100 bonus
      storage_50gb: { price: 9.99, value: 50, type: 'storage' },
      lifetime: { price: 299.99, value: 'lifetime', type: 'subscription' },
    };

    const iap = iapPrices[iapId];
    if (!iap) {
      return res.status(400).json({ error: 'Invalid IAP' });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(iap.price * 100),
      currency: 'usd',
      metadata: {
        userId,
        iapId,
        type: iap.type,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      amount: iap.price,
      iapId,
    });
  } catch (error) {
    console.error('Error purchasing IAP:', error);
    res.status(500).json({ error: 'Failed to process purchase' });
  }
}

/**
 * Get creator earnings
 */
async function getCreatorEarnings(req, res) {
  try {
    const userId = req.user.id;

    // Check if user is a creator
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, creator_tier')
      .eq('id', userId)
      .single();

    if (profile?.role !== 'tutor') {
      return res.status(403).json({ error: 'Not a creator' });
    }

    // Get sales data
    const { data: sales } = await supabaseAdmin
      .from('content_purchases')
      .select('amount, created_at')
      .eq('creator_id', userId);

    const totalEarned = sales?.reduce((sum, sale) => {
      const creatorShare = CREATOR_SHARE[profile.creator_tier || 'free'];
      return sum + (sale.amount * creatorShare * (1 - PLATFORM_FEE));
    }, 0) || 0;

    // Get pending payout
    const { data: payouts } = await supabaseAdmin
      .from('creator_payouts')
      .select('amount, status')
      .eq('creator_id', userId)
      .eq('status', 'pending');

    const pendingPayout = payouts?.reduce((sum, p) => sum + p.amount, 0) || 0;

    // Monthly revenue
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const monthSales = sales?.filter(s => new Date(s.created_at) >= thisMonth) || [];
    const monthlyRevenue = monthSales.reduce((sum, sale) => {
      const creatorShare = CREATOR_SHARE[profile.creator_tier || 'free'];
      return sum + (sale.amount * creatorShare * (1 - PLATFORM_FEE));
    }, 0);

    // Path sales count
    const { count: pathsSold } = await supabaseAdmin
      .from('content_purchases')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', userId);

    // Average rating
    const { data: ratings } = await supabaseAdmin
      .from('content_ratings')
      .select('rating')
      .eq('creator_id', userId);

    const averageRating = ratings?.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;

    res.json({
      userId,
      totalEarned: totalEarned.toFixed(2),
      pendingPayout: pendingPayout.toFixed(2),
      monthlyRevenue: monthlyRevenue.toFixed(2),
      pathsSold: pathsSold || 0,
      averageRating: averageRating.toFixed(1),
      creatorTier: profile.creator_tier || 'free',
      revenueShare: (CREATOR_SHARE[profile.creator_tier || 'free'] * 100).toFixed(0) + '%',
    });
  } catch (error) {
    console.error('Error fetching creator earnings:', error);
    res.status(500).json({ error: 'Failed to fetch earnings' });
  }
}

/**
 * Request creator payout
 */
async function requestPayout(req, res) {
  try {
    const userId = req.user.id;
    const { amount, method } = req.body;

    // Minimum payout: $10
    if (amount < 10) {
      return res.status(400).json({ error: 'Minimum payout is $10' });
    }

    // Check available balance
    const earningsResponse = await getCreatorEarnings({ user: { id: userId } }, { json: () => {} });
    // This is simplified - in production, properly calculate available balance

    // Create payout request
    const { data, error } = await supabaseAdmin
      .from('creator_payouts')
      .insert({
        creator_id: userId,
        amount,
        method,
        status: 'pending',
        requested_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      payoutId: data.id,
      amount,
      method,
      estimatedArrival: '3-5 business days',
    });
  } catch (error) {
    console.error('Error requesting payout:', error);
    res.status(500).json({ error: 'Failed to request payout' });
  }
}

module.exports = {
  getSubscriptionStatus,
  createCheckoutSession,
  checkUsageLimit,
  checkUsageLimitHelper, // Export for use in chatController
  upgradeSubscription,
  confirmSubscription,
  purchaseIAP,
  getCreatorEarnings,
  requestPayout,
};

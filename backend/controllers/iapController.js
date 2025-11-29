const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { supabaseAdmin } = require('../supabase');

/**
 * 🛒 Get IAP Products Catalog
 * Returns all available in-app purchase products
 */
const getIAPProducts = async (req, res) => {
  try {
    const { type } = req.query; // Optional filter by type

    let query = supabaseAdmin
      .from('iap_products')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (type) {
      query = query.eq('type', type);
    }

    const { data: products, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      products,
      count: products.length
    });
  } catch (error) {
    console.error('❌ Get IAP Products Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * 🎁 Get IAP Bundles
 * Returns all available bundles and special offers
 */
const getIAPBundles = async (req, res) => {
  try {
    const { data: bundles, error } = await supabaseAdmin
      .from('iap_bundles')
      .select('*')
      .eq('is_active', true)
      .or('available_until.is.null,available_until.gt.' + new Date().toISOString())
      .order('display_order', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      bundles,
      count: bundles.length
    });
  } catch (error) {
    console.error('❌ Get IAP Bundles Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * 💰 Get User Wallet
 * Returns user's current lives, energy, coins, gems
 */
const getUserWallet = async (req, res) => {
  try {
    const userId = req.user.id;

    // First, refill lives and energy based on time passed
    await supabaseAdmin.rpc('refill_lives');
    await supabaseAdmin.rpc('refill_energy');

    const { data: wallet, error } = await supabaseAdmin
      .from('user_game_wallet')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If wallet doesn't exist, create it
      if (error.code === 'PGRST116') {
        const { data: newWallet, error: createError } = await supabaseAdmin
          .from('user_game_wallet')
          .insert({
            user_id: userId,
            lives: 5,
            energy: 100,
            coins: 0,
            gems: 0
          })
          .select()
          .single();

        if (createError) throw createError;

        return res.json({
          success: true,
          wallet: newWallet
        });
      }
      throw error;
    }

    // Calculate time until next refill
    const now = new Date();
    const lastLifeRefill = new Date(wallet.last_life_refill);
    const lastEnergyRefill = new Date(wallet.last_energy_refill);

    const secondsUntilNextLife = wallet.lives < wallet.max_lives 
      ? 1800 - Math.floor((now - lastLifeRefill) / 1000) % 1800 
      : null;
    
    const secondsUntilNextEnergy = wallet.energy < wallet.max_energy 
      ? 300 - Math.floor((now - lastEnergyRefill) / 1000) % 300 
      : null;

    res.json({
      success: true,
      wallet,
      refillInfo: {
        nextLifeIn: secondsUntilNextLife,
        nextEnergyIn: secondsUntilNextEnergy
      }
    });
  } catch (error) {
    console.error('❌ Get User Wallet Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * 🎮 Get User Powerups
 * Returns user's powerup inventory
 */
const getUserPowerups = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: powerups, error } = await supabaseAdmin
      .from('user_powerups')
      .select('*')
      .eq('user_id', userId)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

    if (error) throw error;

    res.json({
      success: true,
      powerups: powerups || []
    });
  } catch (error) {
    console.error('❌ Get User Powerups Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * 💳 Create IAP Checkout Session
 * Creates a Stripe checkout session for purchasing IAP products
 */
const createIAPCheckout = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'Product ID is required'
      });
    }

    // Get product details
    const { data: product, error: productError } = await supabaseAdmin
      .from('iap_products')
      .select('*')
      .eq('id', productId)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Get user email
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    // Create or get Stripe customer
    let customerId;
    const { data: existingCustomer } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (existingCustomer?.stripe_customer_id) {
      customerId = existingCustomer.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: profile?.email,
        name: profile?.full_name,
        metadata: { userId }
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: product.name,
              description: product.description,
              images: product.icon_url ? [product.icon_url] : []
            },
            unit_amount: Math.round(product.price_usd * 100) // Convert to cents
          },
          quantity: quantity
        }
      ],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}?iap_success=true&product=${productId}`,
      cancel_url: `${process.env.CLIENT_URL}/store?iap_cancelled=true`,
      metadata: {
        userId,
        productId,
        quantity: quantity.toString(),
        type: product.type,
        value: product.value.toString()
      }
    });

    // Log purchase intent
    await supabaseAdmin
      .from('user_iap_purchases')
      .insert({
        user_id: userId,
        product_id: productId,
        quantity,
        amount_paid: product.price_usd * quantity,
        currency: 'usd',
        stripe_payment_intent_id: session.payment_intent,
        status: 'pending'
      });

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('❌ Create IAP Checkout Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * 🎁 Create Bundle Checkout Session
 * Creates a Stripe checkout session for purchasing bundles
 */
const createBundleCheckout = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bundleId } = req.body;

    if (!bundleId) {
      return res.status(400).json({
        success: false,
        error: 'Bundle ID is required'
      });
    }

    // Get bundle details
    const { data: bundle, error: bundleError } = await supabaseAdmin
      .from('iap_bundles')
      .select('*')
      .eq('id', bundleId)
      .eq('is_active', true)
      .single();

    if (bundleError || !bundle) {
      return res.status(404).json({
        success: false,
        error: 'Bundle not found'
      });
    }

    // Check if bundle is still available
    if (bundle.available_until && new Date(bundle.available_until) < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Bundle is no longer available'
      });
    }

    // Get user email
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    // Create or get Stripe customer
    let customerId;
    const { data: existingCustomer } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (existingCustomer?.stripe_customer_id) {
      customerId = existingCustomer.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: profile?.email,
        name: profile?.full_name,
        metadata: { userId }
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: bundle.name,
              description: bundle.description,
              images: bundle.icon_url ? [bundle.icon_url] : []
            },
            unit_amount: Math.round(bundle.price_usd * 100)
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}?bundle_success=true&bundle=${bundleId}`,
      cancel_url: `${process.env.CLIENT_URL}/store?bundle_cancelled=true`,
      metadata: {
        userId,
        bundleId,
        type: 'bundle',
        contents: JSON.stringify(bundle.contents)
      }
    });

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('❌ Create Bundle Checkout Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * 📊 Get Purchase History
 * Returns user's IAP purchase history
 */
const getPurchaseHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    const { data: purchases, error } = await supabaseAdmin
      .from('user_iap_purchases')
      .select(`
        *,
        iap_products (
          name,
          type,
          icon_url
        )
      `)
      .eq('user_id', userId)
      .order('purchased_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      success: true,
      purchases: purchases || [],
      count: purchases?.length || 0
    });
  } catch (error) {
    console.error('❌ Get Purchase History Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * ⚡ Spend Resource
 * Deducts lives/energy/coins/gems from user wallet
 */
const spendResource = async (req, res) => {
  try {
    const userId = req.user.id;
    const { resourceType, amount, reason } = req.body;

    if (!resourceType || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Resource type and amount are required'
      });
    }

    // Get current wallet
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('user_game_wallet')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (walletError) throw walletError;

    // Check if user has enough
    const currentBalance = wallet[resourceType];
    if (currentBalance < amount) {
      return res.status(400).json({
        success: false,
        error: `Insufficient ${resourceType}. Current: ${currentBalance}, Required: ${amount}`,
        current: currentBalance,
        required: amount
      });
    }

    const newBalance = currentBalance - amount;

    // Update wallet
    const { data: updatedWallet, error: updateError } = await supabaseAdmin
      .from('user_game_wallet')
      .update({
        [resourceType]: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log transaction
    await supabaseAdmin
      .from('wallet_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'spend',
        resource_type: resourceType,
        amount: -amount,
        balance_after: newBalance,
        reason: reason || `Spent ${amount} ${resourceType}`
      });

    res.json({
      success: true,
      wallet: updatedWallet,
      spent: amount,
      newBalance
    });
  } catch (error) {
    console.error('❌ Spend Resource Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getIAPProducts,
  getIAPBundles,
  getUserWallet,
  getUserPowerups,
  createIAPCheckout,
  createBundleCheckout,
  getPurchaseHistory,
  spendResource
};

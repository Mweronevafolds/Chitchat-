// backend/controllers/webhookController.js
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
// Use service key to bypass RLS for admin updates
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

/**
 * Handle incoming Stripe webhook events
 */
const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify the event came from Stripe
    event = stripe.webhooks.constructEvent(
      req.body, 
      sig, 
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`📥 Received webhook: ${event.type}`);

  // Handle specific event types
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      await handleCheckoutSessionCompleted(session);
      break;
      
    case 'customer.subscription.updated':
      const updatedSub = event.data.object;
      await handleSubscriptionUpdated(updatedSub);
      break;
      
    case 'customer.subscription.deleted':
      const deletedSub = event.data.object;
      await handleSubscriptionDeleted(deletedSub);
      break;
      
    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      await handleInvoicePaymentSucceeded(invoice);
      break;
      
    case 'invoice.payment_failed':
      const failedInvoice = event.data.object;
      await handleInvoicePaymentFailed(failedInvoice);
      break;

    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      await handlePaymentIntentSucceeded(paymentIntent);
      break;
      
    default:
      console.log(`ℹ️ Unhandled event type: ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.json({ received: true });
};

/**
 * Handle successful checkout session
 */
async function handleCheckoutSessionCompleted(session) {
  try {
    const userId = session.metadata.userId;
    const customerId = session.customer;
    
    if (!userId) {
      console.error('❌ No userId in session metadata');
      return;
    }

    // Check if this is a subscription or one-time purchase
    const isSubscription = session.metadata.tier && session.subscription;
    const isIAP = session.metadata.productId || session.metadata.bundleId;

    if (isSubscription) {
      // Handle subscription purchase
      const tier = session.metadata.tier;
      const subscriptionId = session.subscription;
      
      console.log(`💳 Processing subscription checkout for user ${userId}, tier: ${tier}`);

      // Fetch subscription details to get current period
      let currentPeriodEnd = null;
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
      }

      // Update user's subscription status in database
      const { error: subError } = await supabaseAdmin
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          tier: tier || 'plus',
          status: 'active',
          billing_cycle: session.metadata.billingCycle || 'monthly',
          expires_at: currentPeriodEnd,
          next_billing_date: currentPeriodEnd,
          updated_at: new Date().toISOString(),
        });

      if (subError) {
        console.error('❌ Failed to update subscription:', subError);
        return;
      }
      
      // Log the transaction
      await supabaseAdmin
        .from('transactions')
        .insert({
          user_id: userId,
          amount: session.amount_total / 100,
          currency: session.currency.toUpperCase(),
          status: 'succeeded',
          type: 'subscription_purchase',
          stripe_payment_intent_id: session.payment_intent,
          created_at: new Date().toISOString(),
        });
      
      console.log(`✅ Subscription activated for user ${userId} (${tier})`);
    } else if (isIAP) {
      // Handle IAP or Bundle purchase
      console.log(`🛒 Processing IAP/Bundle purchase for user ${userId}`);
      
      // This will be handled by payment_intent.succeeded event
      // Just log the checkout completion here
      await supabaseAdmin
        .from('user_iap_purchases')
        .update({
          status: 'completed',
          purchased_at: new Date().toISOString()
        })
        .eq('stripe_payment_intent_id', session.payment_intent);
      
      console.log(`✅ IAP purchase recorded for user ${userId}`);
    }
  } catch (error) {
    console.error('❌ Error in handleCheckoutSessionCompleted:', error);
  }
}

/**
 * Handle subscription updates (renewals, plan changes)
 */
async function handleSubscriptionUpdated(subscription) {
  try {
    const customerId = subscription.customer;
    const status = subscription.status; // active, past_due, canceled, etc.

    console.log(`🔄 Subscription update for customer ${customerId}: ${status}`);

    const { error } = await supabaseAdmin
      .from('user_subscriptions')
      .update({ 
        status: status,
        expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
        next_billing_date: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_customer_id', customerId);

    if (error) {
      console.error('❌ Failed to update subscription status:', error);
      return;
    }

    console.log(`✅ Subscription status updated to ${status}`);
  } catch (error) {
    console.error('❌ Error in handleSubscriptionUpdated:', error);
  }
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionDeleted(subscription) {
  try {
    const customerId = subscription.customer;

    console.log(`🚫 Subscription cancelled for customer ${customerId}`);

    const { error } = await supabaseAdmin
      .from('user_subscriptions')
      .update({ 
        status: 'cancelled',
        tier: 'free',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_customer_id', customerId);

    if (error) {
      console.error('❌ Failed to update cancelled subscription:', error);
      return;
    }

    console.log(`✅ Subscription cancelled, reverted to free tier`);
  } catch (error) {
    console.error('❌ Error in handleSubscriptionDeleted:', error);
  }
}

/**
 * Handle successful invoice payment (renewals)
 */
async function handleInvoicePaymentSucceeded(invoice) {
  try {
    const customerId = invoice.customer;
    const subscriptionId = invoice.subscription;

    console.log(`💰 Payment succeeded for customer ${customerId}`);

    // Get user_id from subscription record
    const { data: sub } = await supabaseAdmin
      .from('user_subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (sub) {
      // Log the transaction
      await supabaseAdmin
        .from('transactions')
        .insert({
          user_id: sub.user_id,
          amount: invoice.amount_paid / 100,
          currency: invoice.currency.toUpperCase(),
          status: 'succeeded',
          type: 'subscription_renewal',
          stripe_payment_intent_id: invoice.payment_intent,
          created_at: new Date().toISOString(),
        });
    }

    console.log(`✅ Renewal payment logged`);
  } catch (error) {
    console.error('❌ Error in handleInvoicePaymentSucceeded:', error);
  }
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(invoice) {
  try {
    const customerId = invoice.customer;

    console.log(`⚠️ Payment failed for customer ${customerId}`);

    // Update subscription status to past_due
    const { error } = await supabaseAdmin
      .from('user_subscriptions')
      .update({ 
        status: 'past_due',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_customer_id', customerId);

    if (error) {
      console.error('❌ Failed to update past_due status:', error);
    }

    // TODO: Send email notification to user about failed payment

    console.log(`❌ Subscription marked as past_due`);
  } catch (error) {
    console.error('❌ Error in handleInvoicePaymentFailed:', error);
  }
}

/**
 * Handle successful payment intent (for one-time IAP purchases)
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
  try {
    const metadata = paymentIntent.metadata;
    const userId = metadata.userId;
    const productId = metadata.productId;
    const bundleId = metadata.bundleId;

    if (!userId) {
      console.log('ℹ️ No userId in payment intent metadata, skipping');
      return;
    }

    console.log(`💰 Processing successful payment for user ${userId}`);

    if (productId) {
      // Handle single product purchase
      const quantity = parseInt(metadata.quantity) || 1;
      const value = parseInt(metadata.value);
      const type = metadata.type;

      console.log(`🛒 Adding ${value * quantity} ${type} to user wallet`);

      // Get current wallet
      const { data: wallet } = await supabaseAdmin
        .from('user_game_wallet')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (wallet) {
        const currentAmount = wallet[type] || 0;
        const newAmount = currentAmount + (value * quantity);

        // Update wallet
        await supabaseAdmin
          .from('user_game_wallet')
          .update({
            [type]: newAmount,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        // Log transaction
        await supabaseAdmin
          .from('wallet_transactions')
          .insert({
            user_id: userId,
            transaction_type: 'purchase',
            resource_type: type,
            amount: value * quantity,
            balance_after: newAmount,
            reason: `Purchased ${productId}`,
            metadata: { payment_intent_id: paymentIntent.id }
          });

        console.log(`✅ Added ${value * quantity} ${type} to wallet (new balance: ${newAmount})`);
      }

      // Mark purchase as completed
      await supabaseAdmin
        .from('user_iap_purchases')
        .update({
          status: 'completed',
          purchased_at: new Date().toISOString(),
          stripe_charge_id: paymentIntent.charges.data[0]?.id
        })
        .eq('stripe_payment_intent_id', paymentIntent.id);

    } else if (bundleId) {
      // Handle bundle purchase
      const contents = JSON.parse(metadata.contents);
      
      console.log(`🎁 Processing bundle: ${bundleId}`);

      // Get current wallet
      const { data: wallet } = await supabaseAdmin
        .from('user_game_wallet')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (wallet) {
        const updates = {};
        
        // Process each item in the bundle
        for (const item of contents) {
          const currentAmount = wallet[item.type] || 0;
          const newAmount = currentAmount + item.value;
          updates[item.type] = newAmount;

          // Log each transaction
          await supabaseAdmin
            .from('wallet_transactions')
            .insert({
              user_id: userId,
              transaction_type: 'purchase',
              resource_type: item.type,
              amount: item.value,
              balance_after: newAmount,
              reason: `Bundle purchase: ${bundleId}`,
              metadata: { 
                payment_intent_id: paymentIntent.id,
                bundle_id: bundleId 
              }
            });

          console.log(`✅ Added ${item.value} ${item.type} from bundle`);
        }

        // Update wallet with all resources
        updates.updated_at = new Date().toISOString();
        await supabaseAdmin
          .from('user_game_wallet')
          .update(updates)
          .eq('user_id', userId);
      }
    }

    console.log(`✅ Payment processing complete for user ${userId}`);
  } catch (error) {
    console.error('❌ Error in handlePaymentIntentSucceeded:', error);
  }
}

module.exports = {
  handleStripeWebhook,
};

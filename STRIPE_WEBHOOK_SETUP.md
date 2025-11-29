# 🔔 Stripe Webhook Setup Guide

Complete guide to configure Stripe webhooks for real-time payment processing.

---

## 🎯 What Webhooks Do

Webhooks let Stripe notify your server instantly when:
- ✅ A user completes payment
- 🔄 A subscription renews
- ❌ A payment fails
- 🚫 A user cancels their subscription

Without webhooks, you'd have to manually check Stripe for payment updates!

---

## 📋 Setup Steps

### Step 1: Get Your Stripe Keys (5 minutes)

1. **Go to Stripe Dashboard**
   - URL: https://dashboard.stripe.com/test/apikeys
   
2. **Copy Your Keys**
   ```
   Secret key: sk_test_51SY1rp... (Already added ✓)
   Publishable key: pk_test_... (Copy this)
   ```

3. **Update `.env` File**
   ```bash
   # backend/.env
   STRIPE_PUBLISHABLE_KEY="pk_test_YOUR_KEY_HERE"
   ```

---

### Step 2: Create Stripe Products (10 minutes)

1. **Go to Products**
   - URL: https://dashboard.stripe.com/test/products

2. **Create "ChitChat Plus" Product**
   - Name: `ChitChat Plus`
   - Description: `Unlimited messages, advanced AI, ad-free`
   - Click "Add pricing"
   
3. **Add Monthly Price**
   - Price: `$9.99`
   - Billing period: `Monthly`
   - Click "Save"
   - **Copy the Price ID**: `price_xxxxx`
   
4. **Add Yearly Price**
   - Click "Add another price"
   - Price: `$99.99`
   - Billing period: `Yearly`
   - Click "Save"
   - **Copy the Price ID**: `price_yyyyy`

5. **Repeat for "ChitChat Pro"**
   - Name: `ChitChat Pro`
   - Description: `API access, custom AI, 85% creator revenue`
   - Monthly: `$24.99` → Copy Price ID
   - Yearly: `$249.99` → Copy Price ID

6. **Update `.env` File**
   ```bash
   # backend/.env
   STRIPE_PRICE_ID_PLUS_MONTHLY="price_xxxxx"
   STRIPE_PRICE_ID_PLUS_YEARLY="price_yyyyy"
   STRIPE_PRICE_ID_PRO_MONTHLY="price_zzzzz"
   STRIPE_PRICE_ID_PRO_YEARLY="price_aaaaa"
   ```

---

### Step 3: Set Up Webhooks (Local Testing)

#### Option A: Using Stripe CLI (Recommended for Local)

1. **Install Stripe CLI**
   ```bash
   # Windows (via Scoop)
   scoop install stripe
   
   # Or download from: https://stripe.com/docs/stripe-cli
   ```

2. **Login to Stripe**
   ```bash
   stripe login
   # Opens browser, click "Allow access"
   ```

3. **Forward Webhooks to Local Server**
   ```bash
   stripe listen --forward-to localhost:3001/api/v1/monetization/webhook
   ```
   
   You'll see:
   ```
   > Ready! Your webhook signing secret is whsec_xxxxx
   ```

4. **Copy the Webhook Secret**
   ```bash
   # Add to backend/.env
   STRIPE_WEBHOOK_SECRET="whsec_xxxxx"
   ```

5. **Keep This Terminal Open**
   - The Stripe CLI must stay running to forward webhooks
   - You'll see webhook events appear in real-time

#### Option B: Using ngrok (For Production-Like Testing)

1. **Install ngrok**
   ```bash
   # Download from: https://ngrok.com/download
   ```

2. **Start ngrok**
   ```bash
   ngrok http 3001
   ```
   
   You'll see:
   ```
   Forwarding: https://abc123.ngrok.io -> http://localhost:3001
   ```

3. **Add Webhook in Stripe Dashboard**
   - Go to: https://dashboard.stripe.com/test/webhooks
   - Click "Add endpoint"
   - Endpoint URL: `https://abc123.ngrok.io/api/v1/monetization/webhook`
   - Select events:
     - ✓ `checkout.session.completed`
     - ✓ `customer.subscription.updated`
     - ✓ `customer.subscription.deleted`
     - ✓ `invoice.payment_succeeded`
     - ✓ `invoice.payment_failed`
   - Click "Add endpoint"

4. **Copy Signing Secret**
   - Click on your new webhook
   - Reveal "Signing secret"
   - Copy `whsec_xxxxx`
   - Add to `backend/.env`

---

### Step 4: Restart Backend Server (1 minute)

```bash
# Kill existing server
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Start with new environment variables
cd backend
node server.js
```

You should see:
```
=== SERVER STARTUP ===
- GEMINI_API_KEY: ✓ SET
- SUPABASE_URL: ✓ SET
- STRIPE_SECRET_KEY: ✓ SET (implicit)
Server is running on http://localhost:3001
```

---

## 🧪 Testing the Complete Flow

### Test 1: Check Webhook Endpoint

```bash
curl -X POST http://localhost:3001/api/v1/monetization/webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"test"}'
```

Expected (will fail signature check, but endpoint exists):
```
Webhook Error: No signatures found...
```

### Test 2: Create Checkout Session

1. **Update Frontend** (`chitchat-app/app/premium.tsx`)
   ```typescript
   const PLANS = [
     {
       id: 'plus',
       name: 'Plus',
       priceId: 'price_YOUR_PLUS_MONTHLY_ID', // ← Use your actual Price ID
       // ...
     }
   ];
   ```

2. **Navigate to Premium Screen**
   - In your app: `/premium`
   
3. **Click "Upgrade to Plus"**
   - Should redirect to Stripe Checkout
   - URL: `https://checkout.stripe.com/pay/cs_test_...`

### Test 3: Complete Payment

1. **Use Test Card**
   ```
   Card Number: 4242 4242 4242 4242
   Expiry: 12/34 (any future date)
   CVC: 123 (any 3 digits)
   ZIP: 12345 (any 5 digits)
   ```

2. **Click "Pay"**

3. **Watch Terminals**
   
   **Stripe CLI Terminal:**
   ```
   --> checkout.session.completed [evt_xxx]
   <-- 200 OK
   ```
   
   **Backend Terminal:**
   ```
   📥 Received webhook: checkout.session.completed
   💳 Processing checkout for user abc-123, tier: plus
   ✓ Checkout session created: cs_test_xxx
   ✅ Subscription activated for user abc-123 (plus)
   ```

4. **Check Database**
   ```sql
   SELECT tier, status FROM user_subscriptions WHERE user_id = 'YOUR_USER_ID';
   -- Should return: tier='plus', status='active'
   ```

5. **Test Unlimited Messages**
   - Send 51+ messages
   - Should work without limit error! ✅

---

## 🎯 What Each Webhook Does

### `checkout.session.completed`
**When**: User completes payment
**Action**: 
- Creates/updates `user_subscriptions` record
- Sets `tier` to 'plus' or 'pro'
- Sets `status` to 'active'
- Logs transaction

### `customer.subscription.updated`
**When**: Subscription renews, plan changes
**Action**:
- Updates `expires_at` date
- Updates `status` (active, past_due, etc.)

### `customer.subscription.deleted`
**When**: User cancels subscription
**Action**:
- Sets `tier` back to 'free'
- Sets `status` to 'cancelled'

### `invoice.payment_succeeded`
**When**: Monthly payment succeeds
**Action**:
- Logs renewal transaction
- Keeps subscription active

### `invoice.payment_failed`
**When**: Payment fails (expired card, etc.)
**Action**:
- Sets `status` to 'past_due'
- TODO: Send email notification

---

## 🔍 Debugging Webhooks

### View Webhook Logs in Stripe

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click on your endpoint
3. See all webhook events and responses

### Check Backend Logs

```bash
# Backend should show:
📥 Received webhook: checkout.session.completed
💳 Processing checkout for user abc-123, tier: plus
✅ Subscription activated for user abc-123 (plus)
```

### Common Issues

**"Webhook Error: No signatures found"**
- ✓ Check `STRIPE_WEBHOOK_SECRET` in `.env`
- ✓ Restart backend after adding it
- ✓ Make sure Stripe CLI is running

**"No userId in session metadata"**
- ✓ Check frontend passes `userId` in checkout request
- ✓ Verify `protect` middleware is working

**"Subscription not updated in database"**
- ✓ Check Supabase service key is correct
- ✓ Verify `user_subscriptions` table exists
- ✓ Run migration: `008_monetization_system.sql`

---

## 📊 Database Tables Used

### `user_subscriptions`
```sql
user_id              | UUID (FK to user_profiles)
tier                 | TEXT (free, plus, pro, team)
status               | TEXT (active, cancelled, past_due)
stripe_customer_id   | TEXT
stripe_subscription_id | TEXT
expires_at           | TIMESTAMP
next_billing_date    | TIMESTAMP
```

### `transactions`
```sql
user_id              | UUID (FK to user_profiles)
amount               | DECIMAL (in dollars)
currency             | TEXT (USD)
status               | TEXT (succeeded, failed)
type                 | TEXT (subscription_purchase, renewal)
stripe_payment_intent_id | TEXT
created_at           | TIMESTAMP
```

---

## 🚀 Production Deployment

### Step 1: Switch to Live Mode

1. **Get Live Keys**
   - Go to: https://dashboard.stripe.com/apikeys (no /test/)
   - Toggle to "Live mode" (top right)
   - Copy `sk_live_...` and `pk_live_...`

2. **Update `.env`**
   ```bash
   STRIPE_SECRET_KEY="sk_live_..."
   STRIPE_PUBLISHABLE_KEY="pk_live_..."
   ```

### Step 2: Add Production Webhook

1. **Go to Live Webhooks**
   - URL: https://dashboard.stripe.com/webhooks

2. **Add Endpoint**
   - Endpoint URL: `https://yourdomain.com/api/v1/monetization/webhook`
   - Select same events as test mode
   - Click "Add endpoint"

3. **Copy Signing Secret**
   ```bash
   STRIPE_WEBHOOK_SECRET="whsec_live_..."
   ```

### Step 3: Enable HTTPS

- Stripe **requires HTTPS** for live webhooks
- Use services like:
  - Heroku (automatic HTTPS)
  - Railway (automatic HTTPS)
  - AWS/DigitalOcean + Let's Encrypt

---

## 📈 Monitoring Revenue

### Real-Time Dashboard

**Stripe Dashboard:**
- https://dashboard.stripe.com/dashboard
- See: Revenue, Active subscriptions, Failed payments

### Database Queries

```sql
-- Monthly Recurring Revenue (MRR)
SELECT 
  tier,
  COUNT(*) as subscribers,
  SUM(CASE 
    WHEN tier = 'plus' THEN 9.99
    WHEN tier = 'pro' THEN 24.99
    WHEN tier = 'team' THEN 99.99
    ELSE 0
  END) as mrr
FROM user_subscriptions
WHERE status = 'active'
GROUP BY tier;

-- Recent Transactions
SELECT 
  user_id,
  amount,
  type,
  status,
  created_at
FROM transactions
ORDER BY created_at DESC
LIMIT 10;

-- Failed Payments (Action Required)
SELECT 
  us.user_id,
  up.email,
  us.tier,
  us.status,
  us.next_billing_date
FROM user_subscriptions us
JOIN user_profiles up ON us.user_id = up.id
WHERE us.status = 'past_due';
```

---

## ✅ Checklist

Before going live:

- [ ] Stripe keys added to `.env`
- [ ] Products created in Stripe Dashboard
- [ ] Price IDs copied to `.env`
- [ ] Webhook secret configured
- [ ] Backend restarted with new env vars
- [ ] Test payment successful (4242 card)
- [ ] Database updated after test payment
- [ ] User can send unlimited messages
- [ ] Webhook logs show success
- [ ] Frontend shows correct tier
- [ ] Cancellation flow tested
- [ ] Failed payment handling tested

---

## 🎉 You're Ready!

Your webhook system is now fully configured to:
- ✅ Accept real payments
- ✅ Upgrade users automatically
- ✅ Handle subscription renewals
- ✅ Process cancellations
- ✅ Track all revenue in real-time

**Next Step:** Test a real payment with the 4242 test card!

---

**Need Help?**
- Stripe Docs: https://stripe.com/docs/webhooks
- Stripe CLI: https://stripe.com/docs/stripe-cli
- Test Cards: https://stripe.com/docs/testing

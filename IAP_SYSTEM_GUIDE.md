# 🎮 In-App Purchase (IAP) System - Complete Guide

## 📋 Overview

The ChitChat IAP system enables users to purchase game resources and power-ups to enhance their learning experience. This includes:

- **Lives**: Required to attempt learning challenges
- **Energy**: Consumed during gameplay sessions
- **Coins**: In-game currency for unlocking content
- **Gems**: Premium currency for exclusive items
- **Power-ups**: Temporary boosts and advantages
- **Bundles**: Special value packs combining multiple resources

## 🏗️ Architecture

### Database Tables

1. **user_game_wallet** - User resource balances
   - `lives`, `max_lives`, `energy`, `max_energy`
   - `coins`, `gems`
   - Auto-refill tracking (`last_life_refill`, `last_energy_refill`)

2. **iap_products** - Product catalog
   - Pre-populated with 24+ products
   - Lives, Energy, Coins, Gems, Power-ups
   - Configurable pricing and values

3. **iap_bundles** - Special offers
   - Multi-resource packages
   - Limited-time deals
   - Discount pricing

4. **user_iap_purchases** - Purchase history
   - Complete transaction log
   - Stripe integration
   - Refund tracking

5. **user_powerups** - Active power-ups inventory
   - Quantity tracking
   - Expiration management

6. **wallet_transactions** - Audit log
   - All resource changes
   - Spend/earn/purchase tracking

### Auto-Refill System

**Lives**: 1 life every 30 minutes (up to max)
**Energy**: 1 energy every 5 minutes (up to max)

Database functions automatically calculate and apply refills based on time elapsed.

## 🔌 API Endpoints

### Get Products
```
GET /api/v1/iap/products?type=lives
```
**Query Parameters:**
- `type` (optional): Filter by type (lives, energy, coins, gems, powerup)

**Response:**
```json
{
  "success": true,
  "products": [
    {
      "id": "lives_5",
      "name": "5 Lives",
      "description": "Get 5 extra lives to keep learning",
      "type": "lives",
      "value": 5,
      "price_usd": 0.99,
      "badge": null,
      "display_order": 1
    }
  ]
}
```

### Get Bundles
```
GET /api/v1/iap/bundles
```
**Response:**
```json
{
  "success": true,
  "bundles": [
    {
      "id": "bundle_starter",
      "name": "Starter Pack",
      "description": "Perfect for new learners!",
      "contents": [
        {"type": "lives", "value": 10},
        {"type": "energy", "value": 100}
      ],
      "price_usd": 4.99,
      "original_price_usd": 7.97,
      "badge": "BEST VALUE"
    }
  ]
}
```

### Get User Wallet
```
GET /api/v1/iap/wallet
```
**Response:**
```json
{
  "success": true,
  "wallet": {
    "lives": 5,
    "max_lives": 5,
    "energy": 100,
    "max_energy": 100,
    "coins": 250,
    "gems": 10
  },
  "refillInfo": {
    "nextLifeIn": 1234,
    "nextEnergyIn": 234
  }
}
```

### Create Product Checkout
```
POST /api/v1/iap/checkout/product
```
**Body:**
```json
{
  "productId": "lives_10",
  "quantity": 1
}
```
**Response:**
```json
{
  "success": true,
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

### Create Bundle Checkout
```
POST /api/v1/iap/checkout/bundle
```
**Body:**
```json
{
  "bundleId": "bundle_starter"
}
```

### Spend Resource
```
POST /api/v1/iap/spend
```
**Body:**
```json
{
  "resourceType": "lives",
  "amount": 1,
  "reason": "Started quiz challenge"
}
```
**Response:**
```json
{
  "success": true,
  "wallet": { ... },
  "spent": 1,
  "newBalance": 4
}
```

### Get Purchase History
```
GET /api/v1/iap/history?limit=50&offset=0
```

## 🎨 Frontend Implementation

### Store Screen

Located at: `chitchat-app/app/store.tsx`

Features:
- ✅ Tabbed interface (Lives, Energy, Coins, Bundles)
- ✅ Real-time wallet display
- ✅ Product grid with badges
- ✅ Stripe checkout integration
- ✅ Pull-to-refresh
- ✅ Loading states

### Game Wallet Hook

Located at: `chitchat-app/hooks/useGameWallet.ts`

```typescript
import { useGameWallet } from '@/hooks/useGameWallet';

function GameScreen() {
  const { 
    wallet, 
    loading,
    spendResource,
    hasEnoughLives,
    canAfford 
  } = useGameWallet();

  const startGame = async () => {
    if (!hasEnoughLives(1)) {
      Alert.alert('No Lives', 'Buy more lives in the store!');
      return;
    }

    const result = await spendResource('lives', 1, 'Started game');
    if (result.success) {
      // Start game...
    }
  };

  return (
    <View>
      <Text>Lives: {wallet?.lives}</Text>
      <Button onPress={startGame} title="Play" />
    </View>
  );
}
```

## 💳 Stripe Webhook Integration

The webhook controller automatically handles IAP purchases:

### Payment Flow

1. User clicks "Buy" in store
2. Frontend calls `/iap/checkout/product`
3. Backend creates Stripe checkout session
4. User completes payment on Stripe
5. Stripe sends `payment_intent.succeeded` webhook
6. Backend processes webhook:
   - Updates `user_game_wallet`
   - Logs transaction in `wallet_transactions`
   - Marks purchase as completed

### Webhook Handler

Located in: `backend/controllers/webhookController.js`

```javascript
async function handlePaymentIntentSucceeded(paymentIntent) {
  const { userId, productId, type, value, quantity } = paymentIntent.metadata;
  
  // Update wallet
  await supabaseAdmin
    .from('user_game_wallet')
    .update({
      [type]: currentAmount + (value * quantity)
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
      reason: `Purchased ${productId}`
    });
}
```

## 📊 Pre-configured Products

### Lives Packs
- **5 Lives** - $0.99
- **10 Lives** - $1.99 (POPULAR)
- **25 Lives** - $3.99 (BEST VALUE)
- **Unlimited Lives** - $4.99 (24 hours)

### Energy Packs
- **50 Energy** - $0.99
- **100 Energy** - $1.99 (POPULAR)
- **250 Energy** - $3.99 (BEST VALUE)
- **Unlimited Energy** - $4.99 (24 hours)

### Coins
- **100 Coins** - $0.99
- **500 Coins** - $4.99 (POPULAR)
- **1000 Coins** - $8.99 (BEST VALUE)
- **2500 Coins** - $19.99

### Gems
- **10 Gems** - $0.99
- **50 Gems** - $4.99 (POPULAR)
- **100 Gems** - $8.99 (BEST VALUE)
- **250 Gems** - $19.99

### Power-ups
- **Double XP** - $1.99 (1 hour)
- **Shield Protection** - $2.99 (3 uses)
- **Hint Reveals** - $1.99 (5 hints)
- **Time Freeze** - $2.99 (3 uses)

### Bundles
- **Starter Pack** - $4.99
  - 10 Lives
  - 100 Energy
  - 200 Coins
  
- **Learner Pack** - $9.99 (POPULAR)
  - 25 Lives
  - 250 Energy
  - 500 Coins
  - 10 Gems
  
- **Master Pack** - $19.99 (ULTIMATE)
  - Unlimited Lives (999)
  - Unlimited Energy (999)
  - 1000 Coins
  - 50 Gems

## 🚀 Setup Instructions

### 1. Run Database Migration

```bash
cd backend
psql your_database_url < migrations/009_game_iap_system.sql
```

Or in Supabase SQL Editor:
- Copy contents of `migrations/009_game_iap_system.sql`
- Paste and run

### 2. Configure Stripe Products (Optional)

By default, products use dynamic pricing. To use Stripe Price IDs:

1. Create products in Stripe Dashboard
2. Add Price IDs to `iap_products` table:

```sql
UPDATE iap_products 
SET stripe_price_id = 'price_...' 
WHERE id = 'lives_5';
```

### 3. Test the System

```bash
# Start backend
cd backend
node server.js

# In another terminal, start frontend
cd chitchat-app
npx expo start
```

Navigate to `/store` in the app!

### 4. Test Purchase Flow

Use Stripe test card:
- **Card**: 4242 4242 4242 4242
- **Expiry**: Any future date (12/34)
- **CVC**: Any 3 digits (123)

## 🎮 Usage Examples

### Checking Lives Before Game

```typescript
const { hasEnoughLives, wallet } = useGameWallet();

if (!hasEnoughLives(1)) {
  Alert.alert(
    'Out of Lives',
    `You need 1 life to play. Current: ${wallet?.lives}`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Buy Lives', onPress: () => router.push('/store') }
    ]
  );
  return;
}
```

### Spending Energy for Quiz

```typescript
const { spendResource, hasEnoughEnergy } = useGameWallet();

const startQuiz = async () => {
  const QUIZ_ENERGY_COST = 10;
  
  if (!hasEnoughEnergy(QUIZ_ENERGY_COST)) {
    Alert.alert('Not enough energy!');
    return;
  }

  const result = await spendResource(
    'energy', 
    QUIZ_ENERGY_COST,
    'Started Math Quiz Level 5'
  );

  if (result.success) {
    // Start quiz
  } else {
    Alert.alert('Error', result.error);
  }
};
```

### Using Coins to Unlock Content

```typescript
const unlockLesson = async (lessonId: string, cost: number) => {
  const { canAfford, spendResource } = useGameWallet();

  if (!canAfford('coins', cost)) {
    Alert.alert('Insufficient Coins', `This lesson costs ${cost} coins`);
    return;
  }

  const result = await spendResource(
    'coins',
    cost,
    `Unlocked lesson: ${lessonId}`
  );

  if (result.success) {
    // Unlock lesson in database
    await api.post('/lessons/unlock', { lessonId });
  }
};
```

## 📈 Analytics Queries

### Top Products by Revenue

```sql
SELECT 
  product_id,
  COUNT(*) as sales,
  SUM(amount_paid) as revenue
FROM user_iap_purchases
WHERE status = 'completed'
  AND purchased_at >= NOW() - INTERVAL '30 days'
GROUP BY product_id
ORDER BY revenue DESC;
```

### Daily IAP Revenue

```sql
SELECT 
  DATE(purchased_at) as date,
  COUNT(*) as transactions,
  SUM(amount_paid) as revenue
FROM user_iap_purchases
WHERE status = 'completed'
GROUP BY DATE(purchased_at)
ORDER BY date DESC;
```

### User Lifetime Value

```sql
SELECT * FROM top_spenders LIMIT 20;
```

### Average Purchase Value

```sql
SELECT 
  AVG(amount_paid) as avg_purchase,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY amount_paid) as median_purchase
FROM user_iap_purchases
WHERE status = 'completed';
```

## 🔧 Customization

### Add New Products

```sql
INSERT INTO iap_products (
  id, 
  name, 
  description, 
  type, 
  value, 
  price_usd,
  badge,
  display_order
) VALUES (
  'powerup_megaboost',
  'Mega Boost',
  '10x XP for 30 minutes',
  'powerup',
  1,
  4.99,
  'NEW',
  25
);
```

### Create Limited-Time Bundle

```sql
INSERT INTO iap_bundles (
  id,
  name,
  description,
  contents,
  price_usd,
  original_price_usd,
  is_limited_time,
  available_until,
  badge
) VALUES (
  'bundle_holiday',
  'Holiday Special',
  'Limited time mega bundle!',
  '[{"type":"lives","value":50},{"type":"energy","value":500},{"type":"gems","value":100}]'::jsonb,
  14.99,
  29.99,
  true,
  NOW() + INTERVAL '7 days',
  'LIMITED 50% OFF'
);
```

### Adjust Refill Rates

Edit these functions in the migration:

```sql
-- Lives: Change 1800 seconds (30 min) to desired interval
CREATE OR REPLACE FUNCTION refill_lives() ...
  FLOOR(EXTRACT(EPOCH FROM (NOW() - last_life_refill)) / 1800)

-- Energy: Change 300 seconds (5 min) to desired interval  
CREATE OR REPLACE FUNCTION refill_energy() ...
  FLOOR(EXTRACT(EPOCH FROM (NOW() - last_energy_refill)) / 300)
```

## 🎯 Best Practices

1. **Always check resources before consuming**
   ```typescript
   if (!hasEnoughLives(1)) return;
   await spendResource('lives', 1);
   ```

2. **Provide clear error messages**
   ```typescript
   if (result.error) {
     Alert.alert('Error', result.error);
   }
   ```

3. **Show refill timers**
   ```typescript
   <Text>Next life in: {formatTime(refillInfo.nextLifeIn)}</Text>
   ```

4. **Offer alternative paths**
   - Watch ad to get 1 life
   - Complete daily mission for energy
   - Earn coins through gameplay

5. **A/B test pricing**
   - Monitor conversion rates
   - Adjust prices based on data
   - Test bundle compositions

## 🐛 Troubleshooting

### Wallet Not Updating After Purchase

Check webhook logs:
```bash
# In backend terminal
# Should see: ✅ Added 10 lives to wallet
```

If no webhook received:
1. Verify Stripe CLI is running: `stripe listen --forward-to localhost:3001/api/v1/monetization/webhook`
2. Check `STRIPE_WEBHOOK_SECRET` in `.env`
3. Verify payment succeeded in Stripe Dashboard

### Refills Not Working

Manually trigger:
```sql
SELECT refill_lives();
SELECT refill_energy();
```

Check `last_life_refill` timestamps:
```sql
SELECT user_id, lives, last_life_refill 
FROM user_game_wallet 
WHERE lives < max_lives;
```

### Insufficient Resources Error

Verify wallet state:
```bash
GET /api/v1/iap/wallet
```

Check transaction log:
```sql
SELECT * FROM wallet_transactions 
WHERE user_id = 'user-uuid' 
ORDER BY created_at DESC 
LIMIT 10;
```

## 📚 Related Documentation

- [MONETIZATION_SYSTEM.md](./MONETIZATION_SYSTEM.md) - Subscription tiers
- [STRIPE_WEBHOOK_SETUP.md](./STRIPE_WEBHOOK_SETUP.md) - Webhook configuration
- [GAMIFICATION_GUIDE.md](./GAMIFICATION_GUIDE.md) - Game mechanics

## ✅ Implementation Checklist

- [x] Database tables created
- [x] Pre-populated products (24 items)
- [x] Auto-refill system implemented
- [x] IAP Controller with 8 endpoints
- [x] Webhook integration for payments
- [x] Routes configured
- [x] Store UI component
- [x] Game wallet hook
- [x] Spend resource functionality
- [x] Transaction logging
- [ ] Run migration in Supabase
- [ ] Test purchase flow
- [ ] Monitor first real purchases
- [ ] Optimize conversion rates

---

**Need Help?** Check the API logs or contact the development team!

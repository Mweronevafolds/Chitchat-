# 🚀 Quick Start: In-App Purchases (IAP)

## 1️⃣ Run Database Migration (2 minutes)

```bash
# Option A: Using Supabase SQL Editor (Recommended)
1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/sql
2. Copy entire contents of: backend/migrations/009_game_iap_system.sql
3. Paste and click "Run"
4. Should see: "Success. No rows returned"

# Option B: Using psql command line
cd backend
psql YOUR_DATABASE_URL < migrations/009_game_iap_system.sql
```

This creates:
- ✅ `user_game_wallet` (Lives, Energy, Coins, Gems)
- ✅ `iap_products` (24 pre-loaded products)
- ✅ `iap_bundles` (3 starter bundles)
- ✅ `user_iap_purchases` (Purchase history)
- ✅ `user_powerups` (Powerup inventory)
- ✅ `wallet_transactions` (Audit log)
- ✅ Auto-refill functions (Lives: 30min, Energy: 5min)

## 2️⃣ Start Backend (30 seconds)

```bash
cd backend
node server.js
```

Should see:
```
=== SERVER STARTUP ===
✓ All environment variables SET
Server is running on http://localhost:3001
```

## 3️⃣ Test IAP Endpoints (2 minutes)

### Get Products
```bash
curl http://localhost:3001/api/v1/iap/products
```

**Expected Response:**
```json
{
  "success": true,
  "products": [
    {
      "id": "lives_5",
      "name": "5 Lives",
      "type": "lives",
      "value": 5,
      "price_usd": 0.99
    },
    ...24 more products
  ]
}
```

### Get Bundles
```bash
curl http://localhost:3001/api/v1/iap/bundles
```

### Get User Wallet (Requires Auth)
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/api/v1/iap/wallet
```

**Expected Response:**
```json
{
  "success": true,
  "wallet": {
    "lives": 5,
    "max_lives": 5,
    "energy": 100,
    "max_energy": 100,
    "coins": 0,
    "gems": 0
  },
  "refillInfo": {
    "nextLifeIn": 1800,
    "nextEnergyIn": 300
  }
}
```

## 4️⃣ Start Frontend (1 minute)

```bash
cd chitchat-app
npx expo start
```

Press `w` for web or scan QR code with Expo Go app.

## 5️⃣ Navigate to Store (30 seconds)

In your app:
1. Login as a user
2. Navigate to `/store` route
3. You should see:
   - Your wallet (Lives, Energy, Coins, Gems) at top
   - Tabs for different product categories
   - Product cards with prices
   - "Buy" buttons

## 6️⃣ Test Purchase Flow (5 minutes)

### Method 1: Test IAP Purchase (Recommended)

```bash
# 1. Create test checkout session
curl -X POST http://localhost:3001/api/v1/iap/checkout/product \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "lives_10",
    "quantity": 1
  }'
```

**Response:**
```json
{
  "success": true,
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

### 2. Complete Payment

- Open the `url` in browser
- Use test card: **4242 4242 4242 4242**
- Expiry: **12/34**
- CVC: **123**
- Click "Pay"

### 3. Verify Webhook Processed

In backend terminal, you should see:
```
📥 Received webhook: payment_intent.succeeded
💰 Processing successful payment for user abc123
🛒 Adding 10 lives to user wallet
✅ Added 10 lives to wallet (new balance: 15)
```

### 4. Check Wallet Updated

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/api/v1/iap/wallet
```

**Should show:**
```json
{
  "wallet": {
    "lives": 15  // ← Increased from 5!
  }
}
```

## 7️⃣ Test Resource Spending (2 minutes)

```bash
# Spend 1 life
curl -X POST http://localhost:3001/api/v1/iap/spend \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "lives",
    "amount": 1,
    "reason": "Started quiz challenge"
  }'
```

**Response:**
```json
{
  "success": true,
  "wallet": {
    "lives": 14
  },
  "spent": 1,
  "newBalance": 14
}
```

## 8️⃣ Verify Auto-Refill (Optional)

Lives refill automatically every 30 minutes when below max.

To test immediately:
```sql
-- In Supabase SQL Editor
SELECT refill_lives();
SELECT refill_energy();
```

Or wait 30 minutes and fetch wallet again!

## 🎮 Frontend Integration

### Use in Any Component

```typescript
import { useGameWallet } from '@/hooks/useGameWallet';

export default function GameScreen() {
  const { 
    wallet, 
    loading,
    spendResource,
    hasEnoughLives 
  } = useGameWallet();

  const startGame = async () => {
    // Check if user has lives
    if (!hasEnoughLives(1)) {
      Alert.alert('No Lives!', 'Visit the store to buy more.');
      router.push('/store');
      return;
    }

    // Spend 1 life
    const result = await spendResource('lives', 1, 'Started game');
    
    if (result.success) {
      console.log('Game started! Lives remaining:', wallet?.lives);
    } else {
      Alert.alert('Error', result.error);
    }
  };

  return (
    <View>
      <Text>Lives: {wallet?.lives} ❤️</Text>
      <Button onPress={startGame} title="Play Game" />
    </View>
  );
}
```

## 📊 Monitor Purchases

### View All Purchases
```sql
SELECT 
  up.user_id,
  p.name,
  up.amount_paid,
  up.status,
  up.purchased_at
FROM user_iap_purchases up
JOIN iap_products p ON up.product_id = p.id
ORDER BY up.purchased_at DESC
LIMIT 20;
```

### Check Revenue
```sql
SELECT 
  DATE(purchased_at) as date,
  COUNT(*) as purchases,
  SUM(amount_paid) as revenue
FROM user_iap_purchases
WHERE status = 'completed'
GROUP BY DATE(purchased_at)
ORDER BY date DESC;
```

### View Wallet Transactions
```sql
SELECT 
  transaction_type,
  resource_type,
  amount,
  balance_after,
  reason,
  created_at
FROM wallet_transactions
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 20;
```

## 🎯 What You Get

### Products (24 items):

**Lives:**
- 5 Lives → $0.99
- 10 Lives → $1.99 (POPULAR)
- 25 Lives → $3.99 (BEST VALUE)
- Unlimited Lives (24h) → $4.99

**Energy:**
- 50 Energy → $0.99
- 100 Energy → $1.99 (POPULAR)
- 250 Energy → $3.99 (BEST VALUE)
- Unlimited Energy (24h) → $4.99

**Coins:**
- 100 Coins → $0.99
- 500 Coins → $4.99 (POPULAR)
- 1000 Coins → $8.99 (BEST VALUE)
- 2500 Coins → $19.99

**Gems:**
- 10 Gems → $0.99
- 50 Gems → $4.99 (POPULAR)
- 100 Gems → $8.99 (BEST VALUE)
- 250 Gems → $19.99

**Power-ups:**
- Double XP (1h) → $1.99
- Shield Protection (3x) → $2.99
- Hint Reveals (5x) → $1.99
- Time Freeze (3x) → $2.99

### Bundles (3 packs):

**Starter Pack** - $4.99
- 10 Lives + 100 Energy + 200 Coins

**Learner Pack** - $9.99 (POPULAR)
- 25 Lives + 250 Energy + 500 Coins + 10 Gems

**Master Pack** - $19.99 (ULTIMATE)
- 999 Lives + 999 Energy + 1000 Coins + 50 Gems

## ✅ Success Checklist

- [ ] Migration run successfully
- [ ] Backend running on port 3001
- [ ] Products endpoint returns 24 items
- [ ] Bundles endpoint returns 3 bundles
- [ ] Wallet endpoint returns user resources
- [ ] Store UI loads without errors
- [ ] Can create checkout session
- [ ] Webhook processes payment (test with Stripe)
- [ ] Wallet updates after purchase
- [ ] Can spend resources
- [ ] Auto-refill works (wait 30 min or run SQL)

## 🐛 Troubleshooting

**"Migration failed"**
- Check table names don't already exist
- Drop existing tables if re-running: `DROP TABLE IF EXISTS user_game_wallet CASCADE;`

**"Products not showing"**
- Check: `SELECT COUNT(*) FROM iap_products;` should return 24
- If 0, check migration ran INSERT statements

**"Wallet not found"**
- Wallet created automatically on user signup
- Or manually: `INSERT INTO user_game_wallet (user_id) VALUES ('user-uuid');`

**"Purchase not reflecting"**
- Check webhook received: Look for "💰 Processing successful payment" in logs
- Check Stripe CLI running: `stripe listen --forward-to localhost:3001/api/v1/monetization/webhook`
- Verify `STRIPE_WEBHOOK_SECRET` set in `.env`

## 📚 Next Steps

1. **Customize Products**: Edit prices/values in `iap_products` table
2. **Add New Products**: INSERT into `iap_products` with your own items
3. **Create Promotions**: Add limited-time bundles with `available_until`
4. **Integrate with Games**: Use `spendResource()` in quiz/game screens
5. **Add Ads for Free Resources**: Let users watch ad for 1 life
6. **Daily Rewards**: Give free coins/energy for daily login
7. **Analytics**: Track conversion rates and optimize pricing

## 🎉 You're Done!

Your IAP system is fully operational! Users can now:
- ✅ Buy lives, energy, coins, gems
- ✅ Purchase value bundles
- ✅ Auto-refill over time
- ✅ Spend resources in games
- ✅ Track complete purchase history

**Total Setup Time**: ~15 minutes

For detailed documentation, see [IAP_SYSTEM_GUIDE.md](./IAP_SYSTEM_GUIDE.md)

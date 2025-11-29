# 🚀 ChitChat Monetization: Quick Reference

## ⚡ 30-Second Overview

**What**: 3-tier subscription model (Free/Plus/Pro) with usage limits and Stripe payments
**Status**: ✅ Backend complete, Frontend complete, Database ready
**Revenue**: $479K Year 1 → $4.2M Year 2 (projected)

---

## 🔑 Key Files

```
backend/
├── controllers/monetizationController.js  ← Subscription logic
├── routes/monetization.js                 ← API endpoints
├── controllers/chatController.js          ← Usage enforcement (line 7, 127-139)
└── migrations/008_monetization_system.sql ← Database tables

chitchat-app/
├── app/premium.tsx                        ← Pricing screen
└── lib/hooks/useMonetization.ts           ← React hook
```

---

## 💰 Subscription Tiers

| Tier | Price | Messages | Storage | AI | Features |
|------|-------|----------|---------|-----|----------|
| **Free** | $0 | 50/day | 1GB | Basic | Ads, 3 paths |
| **Plus** | $9.99/mo | Unlimited | 10GB | Advanced | Ad-free, tutor, offline |
| **Pro** | $24.99/mo | Unlimited | 100GB | Custom | API, analytics, 85% rev share |

---

## 🛠️ API Endpoints

```bash
# Get subscription
GET /api/v1/monetization/subscription/status

# Create checkout
POST /api/v1/monetization/subscription/checkout
Body: { priceId: "price_xxx", tier: "plus" }

# Check usage
GET /api/v1/monetization/usage/messages
Response: { allowed: true, current: 25, limit: 50, percentage: 50 }

# Creator earnings
GET /api/v1/monetization/creator/earnings
Response: { balance_cents: 5000, total_earned_cents: 10000, can_withdraw: true }
```

---

## 📱 Frontend Usage

### Check if User Can Access Feature

```typescript
const { hasFeatureAccess } = useMonetization();

if (hasFeatureAccess('advancedAI')) {
  // Show GPT-4 option
} else {
  // Show upgrade prompt
}
```

### Show Usage Stats

```typescript
const { checkUsageLimit } = useMonetization();

const usage = await checkUsageLimit('dailyMessages');
// { allowed: true, current: 25, limit: 50, percentage: 50 }

<Text>Messages: {usage.current}/{usage.limit}</Text>
```

### Trigger Upgrade

```typescript
const { upgradeTier } = useMonetization();

await upgradeTier('plus', 'monthly');
// Opens Stripe checkout
```

### Navigate to Pricing

```typescript
import { router } from 'expo-router';

<TouchableOpacity onPress={() => router.push('/premium')}>
  <Text>Upgrade Now</Text>
</TouchableOpacity>
```

---

## 🧪 Testing Checklist

### 1. Test Usage Limit
```sql
-- Set user to 50 messages in Supabase
INSERT INTO usage_tracking (user_id, usage_type, date, messages_sent)
VALUES ('YOUR_USER_ID', 'messages_sent', CURRENT_DATE, 50);
```

Then try to send a message. Should get:
```json
{ "error": "Daily message limit reached.", "upgrade_required": true }
```

### 2. Test Pricing Screen
```bash
# Navigate to /premium in app
# Should see: Free/Plus/Pro cards, features, upgrade buttons
```

### 3. Test Stripe Checkout
1. Add Stripe keys to `.env`
2. Create products in Stripe Dashboard
3. Update `priceId` in `premium.tsx`
4. Click "Upgrade to Plus"
5. Use test card: `4242 4242 4242 4242`
6. Payment succeeds → User upgraded ✅

---

## 🔐 Environment Variables

### Backend `.env`
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
CLIENT_URL=exp://localhost:8081
```

### Frontend `.env`
```bash
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 📊 Key Metrics

### Check Conversion Rate
```sql
SELECT 
  COUNT(CASE WHEN tier != 'free' THEN 1 END)::float / COUNT(*) * 100 as conversion_rate
FROM user_subscriptions;
```

### Check MRR
```sql
SELECT 
  SUM(CASE 
    WHEN tier = 'plus' THEN 9.99
    WHEN tier = 'pro' THEN 24.99
    WHEN tier = 'team' THEN 99.99
    ELSE 0
  END) as mrr
FROM user_subscriptions
WHERE status = 'active';
```

### Check Daily Usage
```sql
SELECT SUM(messages_sent) as total_messages
FROM usage_tracking
WHERE date = CURRENT_DATE;
```

---

## 🐛 Common Issues

### "Daily limit reached" not working
- ✅ Check `checkUsageLimitHelper` imported in `chatController.js`
- ✅ Verify usage check happens **before** message processing
- ✅ Run `008_monetization_system.sql` migration

### Upgrade button doesn't work
- ✅ Check Stripe keys in `.env`
- ✅ Update `priceId` in `premium.tsx` with real Stripe Price ID
- ✅ Verify `CLIENT_URL` is correct

### Payment succeeds but tier doesn't change
- ✅ Set up Stripe webhook endpoint
- ✅ Call `confirmSubscription` on `checkout.session.completed` event
- ✅ Check `user_subscriptions` table updated

---

## 🎯 Phase 2 Priority Tasks

1. **Upgrade Prompts** (Week 1-2)
   - [ ] Usage warning at 40/50 messages
   - [ ] Feature gate modals (advanced AI, offline, storage)
   - [ ] Success stories/testimonials

2. **Creator Dashboard** (Week 3-4)
   - [ ] Earnings screen with charts
   - [ ] Payout request form
   - [ ] Course pricing UI

3. **Analytics** (Week 5-6)
   - [ ] Conversion funnel tracking
   - [ ] Revenue dashboard
   - [ ] Cohort analysis

---

## 📚 Full Documentation

- **Complete System**: `MONETIZATION_SYSTEM.md`
- **15-Min Setup**: `QUICK_START_MONETIZATION.md`
- **Phase 1 Report**: `PHASE_1_IMPLEMENTATION_COMPLETE.md`

---

## 💡 Quick Wins

### Show Usage in Profile Screen
```typescript
// app/(tabs)/profile.tsx
const { checkUsageLimit } = useMonetization();
const usage = await checkUsageLimit('dailyMessages');

<Text>Messages Today: {usage.current}/{usage.limit}</Text>
<ProgressBar value={usage.percentage} />
```

### Add "Upgrade" Button to Settings
```typescript
// app/settings.tsx
<TouchableOpacity onPress={() => router.push('/premium')}>
  <Ionicons name="star" size={24} color="#F59E0B" />
  <Text>Upgrade to Plus</Text>
</TouchableOpacity>
```

### Show Tier Badge in Header
```typescript
// components/Header.tsx
const { subscription } = useMonetization();

{subscription.tier !== 'free' && (
  <View style={styles.badge}>
    <Text>{subscription.tier.toUpperCase()}</Text>
  </View>
)}
```

---

## 🚀 Deploy Checklist

Before launching with real money:

- [ ] Switch Stripe from test mode to live mode
- [ ] Set up production Stripe webhook endpoint
- [ ] Enable HTTPS (required for Stripe)
- [ ] Add subscription cancellation flow
- [ ] Set up failed payment handling
- [ ] Generate PDF receipts
- [ ] Add Terms of Service & Privacy Policy
- [ ] Test all flows with real card
- [ ] Set up monitoring (Sentry, Mixpanel)
- [ ] Prepare customer support docs

---

**Ready to monetize! Copy this card for quick reference. 📋💰**

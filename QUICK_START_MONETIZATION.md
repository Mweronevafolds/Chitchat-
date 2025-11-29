# Quick Start: Monetization Setup

Get your ChitChat monetization system up and running in 15 minutes.

## ⚡ Prerequisites

- Stripe account (free at stripe.com)
- Backend running on port 3001
- Supabase database access

---

## 🚀 5-Step Setup

### Step 1: Install Dependencies (2 min)

```bash
cd backend
npm install stripe
```

### Step 2: Get Stripe Keys (3 min)

1. Go to https://dashboard.stripe.com
2. Click "Developers" → "API keys"
3. Copy your **Secret key** (starts with `sk_test_`)
4. Copy your **Publishable key** (starts with `pk_test_`)

### Step 3: Add Environment Variables (1 min)

Add to `backend/.env`:
```bash
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
```

Add to `chitchat-app/.env`:
```bash
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
```

### Step 4: Run Database Migration (2 min)

```bash
# Connect to Supabase SQL Editor
# Run the migration file:
backend/migrations/008_monetization_system.sql
```

Or via command line:
```bash
npx supabase db push
```

### Step 5: Start Backend (1 min)

```bash
cd backend
npm start
```

You should see:
```
✓ Server is running on http://localhost:3001
✓ Monetization routes registered
```

---

## ✅ Verify Setup

### Test API Endpoint

```bash
# Get subscription status (should return free tier for new users)
curl -X GET http://localhost:3001/api/v1/monetization/subscription/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected response:
```json
{
  "tier": "free",
  "status": "active",
  "isActive": true
}
```

### Test Frontend Hook

In any React Native component:
```typescript
import { useMonetization } from '@/lib/hooks/useMonetization';

function MyComponent() {
  const { subscription, hasFeatureAccess } = useMonetization();
  
  const canUseAdvancedAI = hasFeatureAccess('advancedAI');
  
  return (
    <View>
      <Text>Tier: {subscription.tier}</Text>
      <Text>Can use advanced AI: {canUseAdvancedAI ? 'Yes' : 'No'}</Text>
    </View>
  );
}
```

---

## 🎨 Build Your First Paywall

Create `app/upgrade.tsx`:

```typescript
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useMonetization } from '@/lib/hooks/useMonetization';

export default function UpgradeScreen() {
  const { subscription, upgradeTier, isLoading } = useMonetization();

  const handleUpgrade = async () => {
    try {
      const result = await upgradeTier('plus', 'monthly');
      if (result.success) {
        alert('Upgrade successful!');
      }
    } catch (error) {
      alert('Upgrade failed');
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Upgrade to Plus</Text>
      <Text style={{ marginTop: 10 }}>
        Get unlimited messages, advanced AI, and more!
      </Text>
      
      <View style={{ marginTop: 20 }}>
        <Text>✓ Unlimited messages</Text>
        <Text>✓ Advanced AI models</Text>
        <Text>✓ 10GB storage</Text>
        <Text>✓ Ad-free</Text>
      </View>

      <TouchableOpacity
        onPress={handleUpgrade}
        disabled={isLoading}
        style={{
          marginTop: 30,
          padding: 15,
          backgroundColor: '#007AFF',
          borderRadius: 10,
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          {isLoading ? 'Processing...' : 'Upgrade for $9.99/month'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

## 🔒 Enforce Usage Limits

Add to any feature that should be gated:

```typescript
import { useMonetization } from '@/lib/hooks/useMonetization';
import { router } from 'expo-router';

function ChatScreen() {
  const { checkUsageLimit } = useMonetization();

  const sendMessage = async (message: string) => {
    // Check if user can send more messages
    const canSend = await checkUsageLimit('dailyMessages');
    
    if (!canSend.allowed) {
      // Show upgrade prompt
      router.push('/upgrade');
      return;
    }

    // Send the message
    // ...
  };

  return (
    // Your chat UI
  );
}
```

---

## 💡 Common Use Cases

### Check if User Has Feature Access

```typescript
const { hasFeatureAccess } = useMonetization();

// Check before showing advanced AI option
if (hasFeatureAccess('advancedAI')) {
  // Show GPT-4, Claude options
} else {
  // Show only basic AI with upgrade prompt
}
```

### Display Usage Stats

```typescript
const { checkUsageLimit } = useMonetization();

const messageUsage = await checkUsageLimit('dailyMessages');
// Returns: { allowed: boolean, current: 25, limit: 50, percentage: 50 }

return (
  <Text>
    Messages used today: {messageUsage.current} / {messageUsage.limit}
  </Text>
);
```

### Show Creator Earnings

```typescript
const { creatorEarnings } = useMonetization();

if (creatorEarnings) {
  return (
    <View>
      <Text>Total Earned: ${creatorEarnings.totalEarned}</Text>
      <Text>Pending: ${creatorEarnings.pendingPayout}</Text>
      <Text>This Month: ${creatorEarnings.monthlyRevenue}</Text>
    </View>
  );
}
```

---

## 🧪 Test Payment Flow

### Test Cards (Stripe Test Mode)

**Successful Payment:**
```
Card: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
```

**Declined Payment:**
```
Card: 4000 0000 0000 0002
```

**Requires Authentication:**
```
Card: 4000 0025 0000 3155
```

### Test Subscription Flow

1. Create payment intent: `POST /api/v1/monetization/subscription/upgrade`
2. Complete payment with test card
3. Confirm subscription: `POST /api/v1/monetization/subscription/confirm`
4. Verify tier updated: `GET /api/v1/monetization/subscription/status`

---

## 📊 Monitor Revenue

### Check Stripe Dashboard

- Go to https://dashboard.stripe.com
- View payments, subscriptions, customers
- Set up webhooks for automated processing

### Query Database

```sql
-- Total revenue
SELECT SUM(amount) FROM subscription_intents WHERE status = 'completed';

-- Active subscriptions by tier
SELECT tier, COUNT(*) FROM user_subscriptions WHERE status = 'active' GROUP BY tier;

-- Creator earnings
SELECT creator_id, SUM(creator_earnings) FROM content_purchases GROUP BY creator_id;
```

---

## 🐛 Troubleshooting

### Backend won't start
- Check Stripe keys are in `.env`
- Verify no typos: `STRIPE_SECRET_KEY`
- Ensure key starts with `sk_test_`

### Payment fails
- Use test card: `4242 4242 4242 4242`
- Check Stripe dashboard for errors
- Verify webhook is configured

### Usage limits not enforcing
- Run database migration
- Check `usage_tracking` table exists
- Verify `increment_usage()` function

### Creator payouts not working
- Check minimum $10 balance
- Verify PayPal/Stripe connected
- Check `creator_payouts` table

---

## 🎉 You're Ready!

Your monetization system is now live! Here's what you have:

✅ 4 subscription tiers (Free/Plus/Pro/Team)
✅ In-app purchases (credits, storage, lifetime)
✅ Creator economy with revenue sharing
✅ Usage tracking and limits
✅ Stripe payment processing
✅ Complete API and hooks

### Next Steps

1. **Design paywall screens** - Create beautiful upgrade prompts
2. **Add usage warnings** - Notify users approaching limits
3. **Build creator dashboard** - Show earnings, analytics
4. **Test with real users** - Get feedback on pricing
5. **Launch marketing** - Drive subscriptions

---

## 📚 Resources

- [Full Documentation](./MONETIZATION_SYSTEM.md)
- [Stripe Documentation](https://stripe.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [React Native Payments](https://github.com/stripe/stripe-react-native)

---

**Happy monetizing! 💰🚀**

Need help? Check [MONETIZATION_SYSTEM.md](./MONETIZATION_SYSTEM.md) for detailed docs.

# 🚀 QUICK START - Addiction Engine Launch

## ⚡ 5-Minute Setup

This is your **launch sequence** for the Addiction Engine. Follow these steps in order.

---

## Step 1: Database Migration (2 minutes)

**⚠️ CRITICAL: Run migrations IN THIS ORDER!**

### Migration 1: Base Gamification System (FIRST)
1. Open [Supabase Dashboard](https://app.supabase.com)
2. Navigate to: **SQL Editor** → **New Query**
3. Copy the **entire** contents of: `backend/migrations/create_gamification_system.sql`
4. Paste → Click **Run**
5. Wait for success message: ✅ "Success. No rows returned"

### Migration 2: Addiction Engine (SECOND)
1. Still in SQL Editor → **New Query**
2. Copy the **entire** contents of: `backend/migrations/create_addiction_engine.sql`
3. Paste → Click **Run**
4. Wait for success message: ✅ "Success. No rows returned"

**🚨 ERROR?** If you get "column category does not exist", you ran them out of order.  
→ See: [MIGRATION_FIX_GUIDE.md](MIGRATION_FIX_GUIDE.md) for solutions

### Verify Migration Success
Run this query in SQL Editor:
```sql
-- Should return 3 functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN ('update_user_streak', 'award_xp', 'check_achievements');

-- Should return achievements
SELECT COUNT(*) FROM achievements;
```

✅ **Expected:** 3 functions found, 8+ achievements exist

---

## Step 2: Start Backend Server (1 minute)

```bash
cd backend

# Verify .env file exists and contains:
# GEMINI_API_KEY=...
# SUPABASE_URL=...
# SUPABASE_SERVICE_KEY=...

# Start server
npm run dev
```

### Verify Server is Running
You should see:
```
=== SERVER STARTUP ===
Environment variables loaded:
- GEMINI_API_KEY: ✓ SET
- SUPABASE_URL: ✓ SET
- SUPABASE_SERVICE_KEY: ✓ SET
- SUPABASE_ANON_KEY: ✓ SET
Server is running on http://localhost:3001
```

### Test New Endpoints
Open a new terminal:
```bash
# Test health check
curl http://localhost:3001/

# Expected: "ChitChat API is alive!"
```

---

## Step 3: Test Streak System (1 minute)

### Get Your Auth Token
1. Open your ChitChat app
2. Login
3. Check DevTools → Network → Find any API request
4. Copy the `Authorization: Bearer <token>` header

### Test Streak Check-in
```bash
# Replace YOUR_TOKEN with actual token
curl -X POST http://localhost:3001/api/v1/streak/check-in \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "current_streak": 1,
  "longest_streak": 1,
  "streak_maintained": true,
  "streak_broken": false,
  "bonus_xp": 10,
  "total_xp": 10
}
```

### Test Streak Status
```bash
curl http://localhost:3001/api/v1/streak/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

✅ **Success:** You receive streak data without errors

---

## Step 4: Test Viral Sharing (1 minute)

```bash
curl -X POST http://localhost:3001/api/v1/viral/share \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content_type": "tile",
    "content_id": "test-tile-123",
    "platform": "whatsapp"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "+50 XP for sharing!"
}
```

### Verify in Database
Run in Supabase SQL Editor:
```sql
-- Check your profile XP increased
SELECT id, full_name, total_xp, invites_sent 
FROM profiles 
WHERE id = '<your-user-id>';

-- Check reward history
SELECT * FROM reward_history 
WHERE user_id = '<your-user-id>' 
ORDER BY created_at DESC 
LIMIT 5;
```

✅ **Success:** XP increased, reward_history has new entry

---

## Step 5: Frontend Integration (Optional - 5 minutes)

### Add ShareButton to a Screen
Pick **one** location to start (easiest first):

#### Option 1: Tile Completion Screen
```tsx
// In your tile detail or completion screen
import ShareButton from '@/components/ShareButton';

// Add after "Lesson Complete!" message
<ShareButton 
  title={tile.hook}
  message={`I just learned: ${tile.hook}`}
  contentId={tile.id}
  type="tile"
/>
```

#### Option 2: Profile/Stats Screen
```tsx
// Show current streak
import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const [streak, setStreak] = useState(null);
const { session } = useAuth();

useEffect(() => {
  api.get('/api/v1/streak/status', session.access_token)
    .then(setStreak)
    .catch(console.error);
}, []);

return (
  <View>
    <Text>🔥 {streak?.current_streak || 0} Day Streak</Text>
  </View>
);
```

### Test in App
1. Rebuild app: `npx expo start --clear`
2. Navigate to where you added ShareButton
3. Tap share → Native share sheet should open
4. Complete share → Alert: "🎉 +50 XP"

✅ **Success:** Share button works, XP rewards appear

---

## 🎯 Quick Verification Checklist

Run through this checklist to ensure everything works:

### Backend
- [ ] Server starts without errors
- [ ] `/api/v1/streak/check-in` returns streak data
- [ ] `/api/v1/streak/status` returns current streak
- [ ] `/api/v1/viral/share` rewards 50 XP
- [ ] Database logs actions in `reward_history`

### Database
- [ ] Migration ran successfully
- [ ] Functions exist (`update_user_streak`, `award_xp`, `check_achievements`)
- [ ] Achievements seeded (8+ rows in `achievements` table)
- [ ] Profiles have new columns (`current_streak`, `invites_sent`, etc.)

### Frontend (Optional)
- [ ] ShareButton component renders
- [ ] Native share sheet opens on tap
- [ ] Alert shows "+50 XP" after share
- [ ] Profile XP increases after share

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check node version (need 18+)
node --version

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Verify .env file
cat .env
```

### Migration fails
**Error:** "function already exists"
- **Fix:** This is OK! It means migration already ran partially
- Run each CREATE statement individually

**Error:** "column already exists"  
- **Fix:** Safe to ignore - column was added by previous migration

### API returns 401 Unauthorized
- **Fix:** Token expired - login again in app
- **Fix:** Check middleware is correctly configured in routes

### Streak doesn't update
```sql
-- Check if function exists
SELECT update_user_streak('<your-user-id>');

-- Should return JSON with streak data
-- If error, check Supabase logs
```

---

## 📊 Monitor These Metrics (Week 1)

### Daily
- **Active Users:** How many users opened the app?
- **Check-in Rate:** How many called `/streak/check-in`?
- **Share Rate:** How many shares per day?

### Weekly
- **Retention:** DAU / MAU ratio
- **Streak Distribution:** Histogram of streak lengths
- **Viral Coefficient:** (shares / users) × (signups / shares)

### SQL Queries for Monitoring
```sql
-- Active users today
SELECT COUNT(DISTINCT user_id) 
FROM user_activity 
WHERE created_at >= CURRENT_DATE;

-- Shares today
SELECT COUNT(*) 
FROM user_activity 
WHERE activity_type = 'share' 
AND created_at >= CURRENT_DATE;

-- Streak distribution
SELECT current_streak, COUNT(*) as user_count
FROM profiles 
WHERE current_streak > 0
GROUP BY current_streak
ORDER BY current_streak;

-- Top sharers
SELECT p.full_name, p.invites_sent
FROM profiles p
ORDER BY p.invites_sent DESC
LIMIT 10;
```

---

## 🚀 Next Actions

### Immediate (Today)
1. ✅ Run database migration
2. ✅ Restart backend server
3. ✅ Test endpoints with curl/Postman
4. ✅ Commit changes to git

### This Week
1. 📱 Add ShareButton to at least 2 screens
2. 📊 Set up basic analytics dashboard
3. 🔔 Plan push notification for streak reminders
4. 🎨 Design achievement unlock modal

### Next Week
1. 💰 Plan referral reward system (double XP for both parties)
2. 🎁 Design "Share to Unlock" premium content
3. 📈 A/B test reward amounts (50 vs 100 XP)
4. 🏆 Add leaderboard screen

---

## 📞 Need Help?

### Common Questions

**Q: Can I customize reward amounts?**  
A: Yes! Edit values in `streakController.js` and `viralController.js`

**Q: How do I add more achievements?**  
A: Insert into `achievements` table with custom criteria JSON

**Q: Can I track which platform users share to?**  
A: Yes! The `platform` field in viral share tracks this (whatsapp, facebook, etc.)

**Q: How do I prevent XP farming?**  
A: Add rate limiting (see `IMPLEMENTATION_ROADMAP.md` → Security section)

---

## 🎉 You're Live!

If you've completed all steps, you now have:
- ✅ Working streak system
- ✅ Viral sharing tracking
- ✅ Variable reward distribution
- ✅ Achievement engine

**This is the pivot point.** You're now in growth mode.

**Next:** Ship this to production, monitor your metrics, and watch your K-factor climb! 🚀

---

**Time to Complete:** ~5 minutes  
**Complexity:** Easy  
**Risk:** Low (migrations are idempotent)  

**Status:** 🟢 READY TO LAUNCH

---

**Created:** November 26, 2025  
**Last Updated:** November 26, 2025  
**Version:** 1.0

# 🚀 Quick Start: Variable Rewards System

## ⏱️ 5-Minute Setup Guide

### Step 1: Database (2 minutes)
1. Open [Supabase Dashboard](https://app.supabase.com)
2. Select your ChitChat project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**
5. Open `backend/migrations/create_gamification_system.sql`
6. Copy all contents and paste into Supabase
7. Click **Run** (or press Ctrl+Enter)
8. ✅ Should see "Success. No rows returned"

**Verify:**
```sql
-- Quick check - paste and run this
SELECT COUNT(*) FROM achievements; -- Should return 8
SELECT total_xp, current_streak FROM profiles LIMIT 1;
```

---

### Step 2: Backend (1 minute)
```powershell
# Open terminal 1
cd c:\macode\ChitChat\backend
npm run dev
```

**Expected output:**
```
Server is running on http://localhost:3001
```

**Leave this terminal running!**

---

### Step 3: Frontend (1 minute)
```powershell
# Open terminal 2 (new window)
cd c:\macode\ChitChat\chitchat-app
npx expo start -c
```

**Expected output:**
```
› Metro waiting on exp://...
```

**Leave this terminal running!**

---

### Step 4: Test (1 minute)
1. Open ChitChat on your device/emulator
2. **Tap "Ask a Question"**
3. **Send any message** (e.g., "Tell me about AI")
4. **Check Terminal 1** - You should see:
   ```
   [Rewards] User {id} performed: message_sent
   ```
5. ✅ **Rewards working!**

---

## 🧪 Quick Tests

### Test 1: Check Your XP
```sql
-- Run in Supabase SQL Editor
SELECT 
  full_name,
  total_xp,
  current_streak,
  lessons_completed
FROM profiles
WHERE id = '{YOUR_USER_ID}';
```

### Test 2: View Reward History
```sql
-- See all rewards you've earned
SELECT 
  action_type,
  reward_type,
  reward_value,
  created_at
FROM reward_history
WHERE user_id = '{YOUR_USER_ID}'
ORDER BY created_at DESC
LIMIT 10;
```

### Test 3: API Test (Optional)
```powershell
# Get your auth token from app
# Then run:
curl -X GET "http://localhost:3001/api/v1/rewards/profile" `
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🎯 What Happens Now?

Every time you:
- ✅ **Send a message** → +10-60 XP (base + possible bonus)
- ✅ **Complete a lesson** → +50-200 XP
- ✅ **Complete a path** → +200-500 XP
- ✅ **Open app daily** → Streak +1 🔥

### Variable Rewards (The Slot Machine Effect)
- **30% chance** → Bonus XP (5-200 extra)
- **5% chance** → Mystery badge 🏆
- **1% chance** → Free Pro unlock ✨

---

## 🔥 Next Actions

### Now (Functional)
- [x] System works silently in background
- [x] XP accumulates
- [x] Streaks track
- [x] Achievements unlock

### Soon (Visual - Phase 2)
- [ ] **Toast notifications** for XP gains
- [ ] **Modal animations** for achievements
- [ ] **Profile screen** showing stats
- [ ] **Leaderboard screen**
- [ ] **Badge showcase**

---

## 📊 Monitor Progress

### Supabase Dashboard
1. Go to **Table Editor**
2. View tables:
   - `profiles` → See everyone's XP/streaks
   - `achievements` → See all badges
   - `user_achievements` → See who unlocked what
   - `reward_history` → See every XP award

### Backend Logs
Watch Terminal 1 for:
```
[Rewards] User abc123 performed: message_sent
[RewardsEngine] Mastery rewards: { level: 2, xp: 1150 }
```

---

## 🆘 Troubleshooting

### "achievement table does not exist"
→ Run Step 1 again (SQL migration)

### "No XP appearing"
→ Check backend terminal for errors
→ Verify Supabase env vars in `.env`

### "Streak not updating"
→ Check `last_activity_date` in profiles table
→ Must be 24+ hours since last activity

---

## 🎊 Success Criteria

After sending 3 messages, you should have:
- ✅ **Total XP**: ~30-180 (variable due to bonuses)
- ✅ **Current Streak**: 1 (or higher if used yesterday)
- ✅ **Reward History**: 3+ entries
- ✅ **Possible Achievement**: "First Steps" if first lesson

**Check in Supabase:**
```sql
SELECT * FROM profiles WHERE id = '{YOUR_ID}';
SELECT * FROM reward_history WHERE user_id = '{YOUR_ID}';
SELECT * FROM user_achievements WHERE user_id = '{YOUR_ID}';
```

---

## 📖 Full Documentation

See `VARIABLE_REWARDS_IMPLEMENTATION.md` for:
- Complete API reference
- Frontend integration examples
- Analytics queries
- Phase 2 roadmap
- Psychology principles

---

**Ready to build the UI? Let's make these rewards VISIBLE! 🎨**

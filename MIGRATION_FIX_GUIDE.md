# 🚨 MIGRATION ERROR FIX GUIDE

## Error: Column "category" does not exist

You encountered this error because the migrations need to be run **in a specific order**.

---

## ✅ CORRECT MIGRATION ORDER

### Step 1: Run create_gamification_system.sql FIRST
This creates the base tables: `achievements`, `user_achievements`, `reward_history`

1. Open Supabase Dashboard → SQL Editor
2. Copy **ALL** contents of: `backend/migrations/create_gamification_system.sql`
3. Paste → Click **"Run"**
4. Wait for: ✅ "Success" message

### Step 2: Run create_addiction_engine.sql SECOND
This adds the streak and viral features on top of the base system

1. Still in SQL Editor
2. Copy **ALL** contents of: `backend/migrations/create_addiction_engine.sql`
3. Paste → Click **"Run"**
4. Wait for: ✅ "Success" message

---

## 🔍 Verify Migrations Succeeded

Run these queries in SQL Editor to verify:

```sql
-- 1. Check if achievements table exists with all columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'achievements'
ORDER BY ordinal_position;

-- Expected columns:
-- id, name, description, icon, category, rarity, xp_reward, criteria, created_at

-- 2. Check if achievements were seeded
SELECT COUNT(*) FROM achievements;
-- Expected: 8+ rows

-- 3. Check if functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN ('update_user_streak', 'award_xp', 'check_achievements');
-- Expected: 3 rows

-- 4. Check if viral columns exist on profiles
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('invites_sent', 'referral_signups', 'shares_count');
-- Expected: 3 rows
```

---

## 🛠️ If You Already Ran the Wrong Order

### Option A: Start Fresh (Recommended)
```sql
-- WARNING: This deletes all gamification data!
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS reward_history CASCADE;
DROP FUNCTION IF EXISTS update_user_streak(UUID);
DROP FUNCTION IF EXISTS award_xp(UUID, INTEGER, VARCHAR);
DROP FUNCTION IF EXISTS check_achievements(UUID);
DROP FUNCTION IF EXISTS calculate_viral_coefficient();
DROP VIEW IF EXISTS leaderboards;

-- Now run migrations in correct order (Step 1, then Step 2 above)
```

### Option B: Fix Incrementally
```sql
-- 1. Add missing category column
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- 2. Add missing columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS invites_sent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_signups INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0;

-- 3. Now run create_addiction_engine.sql
```

---

## 📋 Quick Start Checklist (Correct Order)

- [ ] **Stop!** Don't run any migrations yet
- [ ] Open Supabase Dashboard → SQL Editor
- [ ] Copy `backend/migrations/create_gamification_system.sql`
- [ ] Paste → Run → Wait for success ✅
- [ ] Copy `backend/migrations/create_addiction_engine.sql`
- [ ] Paste → Run → Wait for success ✅
- [ ] Run verification queries above
- [ ] Restart backend: `cd backend && npm run dev`
- [ ] Test endpoint: `curl http://localhost:3001/`

---

## 🎯 What Each Migration Does

### create_gamification_system.sql (FIRST)
**Creates:**
- ✅ `achievements` table (with category column)
- ✅ `user_achievements` table
- ✅ `reward_history` table
- ✅ Base columns on `profiles` (total_xp, current_streak, etc.)
- ✅ Functions: `update_user_streak`, `award_xp`, `check_achievements`
- ✅ Initial 8 achievements

### create_addiction_engine.sql (SECOND)
**Adds:**
- ✅ Viral tracking columns (invites_sent, shares_count)
- ✅ Enhanced `update_user_streak` function (escalating rewards)
- ✅ New function: `calculate_viral_coefficient`
- ✅ 2 new achievements: "Viral Spreader", "Influencer"
- ✅ Performance indexes for sharing

---

## 🚨 Common Errors & Solutions

### Error: "column category does not exist"
**Cause:** Ran `create_addiction_engine.sql` before `create_gamification_system.sql`  
**Fix:** Run migrations in correct order (see above)

### Error: "table achievements does not exist"
**Cause:** `create_gamification_system.sql` not run yet  
**Fix:** Run it first, then run addiction engine migration

### Error: "function update_user_streak already exists"
**Cause:** Running migrations multiple times (this is OK!)  
**Fix:** Migrations are idempotent - safe to re-run. Just ignore this.

### Error: "duplicate key value violates unique constraint"
**Cause:** Trying to insert achievements that already exist  
**Fix:** The `ON CONFLICT (name) DO NOTHING` handles this - safe to ignore

---

## 🔄 Full Reset (Nuclear Option)

If everything is broken, start completely fresh:

```sql
-- 1. Drop all gamification tables (WARNING: DELETES ALL DATA)
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS reward_history CASCADE;

-- 2. Drop all functions
DROP FUNCTION IF EXISTS update_user_streak(UUID);
DROP FUNCTION IF EXISTS award_xp(UUID, INTEGER, VARCHAR);
DROP FUNCTION IF EXISTS check_achievements(UUID);
DROP FUNCTION IF EXISTS calculate_viral_coefficient();

-- 3. Drop leaderboard view
DROP VIEW IF EXISTS leaderboards;

-- 4. Remove columns from profiles (optional - keeps existing user data)
ALTER TABLE profiles 
DROP COLUMN IF EXISTS total_xp,
DROP COLUMN IF EXISTS current_streak,
DROP COLUMN IF EXISTS longest_streak,
DROP COLUMN IF EXISTS last_activity_date,
DROP COLUMN IF EXISTS invites_sent,
DROP COLUMN IF EXISTS referral_signups,
DROP COLUMN IF EXISTS shares_count;

-- 5. Now run migrations in correct order:
--    1st: create_gamification_system.sql
--    2nd: create_addiction_engine.sql
```

---

## ✅ Success Indicators

After running both migrations successfully, you should see:

```sql
-- Check achievements
SELECT name, category, rarity FROM achievements;
```

**Expected output:**
```
First Steps       | mastery  | common
Learning Streak   | mastery  | rare
Knowledge Seeker  | mastery  | rare
Master Learner    | mastery  | epic
Social Butterfly  | social   | rare
Community Builder | social   | epic
Curiosity Explorer| material | common
XP Hunter         | material | epic
Viral Spreader    | social   | rare      ← NEW
Influencer        | social   | epic      ← NEW
```

---

## 🎉 After Successful Migration

1. ✅ Restart backend server: `npm run dev`
2. ✅ Test streak endpoint:
   ```bash
   curl -X POST http://localhost:3001/api/v1/streak/check-in \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
3. ✅ Test viral endpoint:
   ```bash
   curl -X POST http://localhost:3001/api/v1/viral/share \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"content_type":"tile","content_id":"test","platform":"test"}'
   ```

---

## 📞 Still Having Issues?

### Check Supabase Logs
1. Supabase Dashboard → Logs
2. Look for migration errors
3. Check timestamps of when errors occurred

### Verify Table Structure
```sql
-- Get full table structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('achievements', 'profiles', 'user_achievements', 'reward_history')
ORDER BY table_name, ordinal_position;
```

### Check What Functions Exist
```sql
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name LIKE '%streak%' OR routine_name LIKE '%achievement%' OR routine_name LIKE '%xp%'
ORDER BY routine_name;
```

---

## 📚 Documentation References

- **Main Guide:** [QUICK_START_ADDICTION_ENGINE.md](QUICK_START_ADDICTION_ENGINE.md)
- **Full Details:** [ADDICTION_ENGINE_GUIDE.md](ADDICTION_ENGINE_GUIDE.md)
- **Integration:** [SHARE_BUTTON_INTEGRATION.md](SHARE_BUTTON_INTEGRATION.md)

---

**Created:** November 26, 2025  
**Status:** Troubleshooting Guide  
**For:** Migration Order Errors

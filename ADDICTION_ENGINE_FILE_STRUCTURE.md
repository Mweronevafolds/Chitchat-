# 📁 ADDICTION ENGINE - FILE STRUCTURE

## Complete File Map

This document shows you where everything is located and what each file does.

---

## 🗂️ Project Structure

```
ChitChat/
│
├── 📚 DOCUMENTATION (You are here)
│   ├── ADDICTION_ENGINE_SUMMARY.md          ⭐ START HERE - Overview
│   ├── QUICK_START_ADDICTION_ENGINE.md      ⭐ 5-minute setup guide
│   ├── ADDICTION_ENGINE_GUIDE.md            📖 Complete technical guide
│   ├── SHARE_BUTTON_INTEGRATION.md          💻 Code examples
│   └── IMPLEMENTATION_ROADMAP.md            🗺️ Deployment & metrics
│
├── 🔧 BACKEND
│   ├── server.js                            ✏️ UPDATED - New routes registered
│   │
│   ├── controllers/
│   │   ├── streakController.js              ✅ NEW - Streak logic
│   │   ├── viralController.js               ✅ NEW - Viral sharing tracker
│   │   └── tilesController.js               ✏️ UPDATED - 60/30/10 split
│   │
│   ├── routes/
│   │   ├── streakRoutes.js                  ✅ NEW - Streak endpoints
│   │   └── viralRoutes.js                   ✅ NEW - Viral endpoints
│   │
│   └── migrations/
│       └── create_addiction_engine.sql      ✅ NEW - Database schema
│
└── 🎨 FRONTEND
    └── components/
        └── ShareButton.tsx                   ✅ NEW - Viral sharing UI
```

---

## 📋 File Details

### 🌟 Documentation Files

#### 1. `ADDICTION_ENGINE_SUMMARY.md` (This file)
**Purpose:** High-level overview of the entire system  
**When to read:** First - to understand what was built  
**Contains:**
- Architecture diagram
- Psychology explanation
- Success metrics
- File reference guide

#### 2. `QUICK_START_ADDICTION_ENGINE.md`
**Purpose:** Get the system running in 5 minutes  
**When to read:** Second - when ready to deploy  
**Contains:**
- Step-by-step setup instructions
- Testing commands
- Troubleshooting guide
- Verification checklist

#### 3. `ADDICTION_ENGINE_GUIDE.md`
**Purpose:** Deep technical documentation  
**When to read:** When you need to understand internals  
**Contains:**
- Database schema details
- API endpoint documentation
- SQL function explanations
- Growth metrics to track

#### 4. `SHARE_BUTTON_INTEGRATION.md`
**Purpose:** Code examples for frontend integration  
**When to read:** When adding share functionality to screens  
**Contains:**
- Copy-paste code examples
- Integration patterns
- UI/UX best practices
- Common issues & fixes

#### 5. `IMPLEMENTATION_ROADMAP.md`
**Purpose:** Complete deployment strategy  
**When to read:** When planning rollout & monitoring  
**Contains:**
- Deployment checklist
- Security considerations
- Monitoring queries
- Growth tactics

---

### 🔧 Backend Files

#### `backend/server.js` (UPDATED)
**Status:** ✏️ Modified  
**Changes:** Added 2 new route registrations  
**Lines changed:** ~5 lines

```javascript
// Added:
const streakRoutes = require('./routes/streakRoutes');
const viralRoutes = require('./routes/viralRoutes');

app.use('/api/v1/streak', streakRoutes);
app.use('/api/v1/viral', viralRoutes);
```

**Why:** Registers new API endpoints for streak and viral systems

---

#### `backend/controllers/streakController.js` (NEW)
**Status:** ✅ Created  
**Size:** ~60 lines  
**Exports:** `updateStreak`, `getStreakStatus`

**Functions:**
1. **updateStreak(req, res)** - Checks user in for the day
   - Calls database function `update_user_streak()`
   - Returns streak data + bonus XP
   - Handles grace period logic

2. **getStreakStatus(req, res)** - Gets current streak info
   - Returns: current_streak, longest_streak, last_activity_date

**Dependencies:**
- Supabase Admin Client
- Database function: `update_user_streak()`

---

#### `backend/routes/streakRoutes.js` (NEW)
**Status:** ✅ Created  
**Size:** ~10 lines

**Endpoints:**
```
POST /api/v1/streak/check-in   (protected)
GET  /api/v1/streak/status     (protected)
```

**Middleware:** `protect` (requires auth token)

---

#### `backend/controllers/viralController.js` (NEW)
**Status:** ✅ Created  
**Size:** ~50 lines  
**Exports:** `trackShare`

**Function: trackShare(req, res)**
1. Logs share in `user_activity` table
2. Awards +50 XP via `award_xp()` function
3. Increments `invites_sent` counter
4. Returns success message

**Dependencies:**
- Supabase Admin Client
- Database function: `award_xp()`
- Database table: `user_activity`

---

#### `backend/routes/viralRoutes.js` (NEW)
**Status:** ✅ Created  
**Size:** ~8 lines

**Endpoint:**
```
POST /api/v1/viral/share  (protected)
```

**Request Body:**
```json
{
  "content_type": "tile|path|achievement",
  "content_id": "string",
  "platform": "whatsapp|facebook|twitter|generic"
}
```

---

#### `backend/controllers/tilesController.js` (UPDATED)
**Status:** ✏️ Modified  
**Changes:** Updated prompt to force 60/30/10 split  
**Lines changed:** ~20 lines

**What Changed:**
- AI prompt now explicitly requests:
  - 60% Personalized tiles (based on user history)
  - 30% Wildcard tiles (adjacent topics)
  - 10% Surprise tiles (viral-worthy content)

**Why:** Creates "slot machine" effect for variable rewards

---

#### `backend/migrations/create_addiction_engine.sql` (NEW)
**Status:** ✅ Created  
**Size:** ~300 lines  
**Purpose:** Database schema for addiction engine

**What It Creates:**
1. **Columns** (added to `profiles` table)
   - `current_streak`, `longest_streak`
   - `invites_sent`, `referral_signups`
   - `shares_count`

2. **Functions**
   - `update_user_streak()` - Streak logic
   - `award_xp()` - XP rewards (already existed, enhanced)
   - `check_achievements()` - Achievement checks (already existed, enhanced)
   - `calculate_viral_coefficient()` - Analytics

3. **Achievements** (inserts)
   - "Viral Spreader" (5 shares)
   - "Influencer" (5 referrals)

4. **Indexes** (performance)
   - `idx_profiles_shares_count`
   - `idx_user_activity_share`

**Idempotent:** Safe to run multiple times

---

### 🎨 Frontend Files

#### `chitchat-app/components/ShareButton.tsx` (NEW)
**Status:** ✅ Created  
**Size:** ~80 lines  
**Purpose:** Reusable viral sharing component

**Props:**
```typescript
{
  title: string;        // Share dialog title
  message: string;      // Share message content
  contentId: string;    // ID of content being shared
  type: 'tile' | 'path' | 'achievement';
}
```

**How It Works:**
1. User taps button
2. Opens native Share sheet (iOS/Android)
3. On share success → Calls API `/viral/share`
4. Shows alert: "🎉 +50 XP"

**Dependencies:**
- `react-native` Share API
- `@expo/vector-icons` (Feather icons)
- `../api` (API wrapper)
- `../context/AuthContext` (for auth token)

**Styling:** Customizable via StyleSheet

---

## 🔄 Data Flow Diagrams

### Streak Check-in Flow
```
User Opens App
      │
      ▼
_layout.tsx (useEffect)
      │
      ▼
POST /api/v1/streak/check-in
      │
      ▼
streakController.updateStreak()
      │
      ▼
Database: update_user_streak()
      │
      ├─► Calculate hours since last activity
      ├─► If <24h: Increment streak + Award XP
      ├─► If 24-48h: Maintain streak (grace)
      └─► If >48h: Reset to 1
      │
      ▼
Return: { current_streak, bonus_xp, ... }
      │
      ▼
Frontend: Show alert or toast
```

### Viral Sharing Flow
```
User Completes Tile
      │
      ▼
Tile Detail Screen
      │
      ▼
<ShareButton> rendered
      │
      ▼
User taps "Share"
      │
      ▼
Native Share Sheet opens
      │
      ├─► User cancels → No action
      └─► User shares
            │
            ▼
      POST /api/v1/viral/share
            │
            ▼
      viralController.trackShare()
            │
            ├─► Log to user_activity
            ├─► award_xp(+50)
            └─► Increment invites_sent
            │
            ▼
      check_achievements()
            │
            └─► If invites_sent == 5
                → Unlock "Viral Spreader"
            │
            ▼
      Return: { success: true, message: "+50 XP" }
            │
            ▼
      Frontend: Alert.alert("🎉 +50 XP")
```

---

## 🗄️ Database Schema

### Tables Used

#### `profiles` (EXTENDED)
```sql
-- New columns added:
current_streak INTEGER DEFAULT 0
longest_streak INTEGER DEFAULT 0
last_activity_date DATE DEFAULT CURRENT_DATE
invites_sent INTEGER DEFAULT 0
referral_signups INTEGER DEFAULT 0
shares_count INTEGER DEFAULT 0
total_xp INTEGER DEFAULT 0
```

#### `achievements` (ALREADY EXISTS)
```sql
id UUID PRIMARY KEY
name VARCHAR(100) UNIQUE
description TEXT
icon VARCHAR(10)
category VARCHAR(50)
rarity VARCHAR(20)
xp_reward INTEGER
criteria JSONB
created_at TIMESTAMP
```

#### `user_achievements` (ALREADY EXISTS)
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES profiles(id)
achievement_id UUID REFERENCES achievements(id)
unlocked_at TIMESTAMP
shared BOOLEAN
```

#### `reward_history` (ALREADY EXISTS)
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES profiles(id)
action_type VARCHAR(50)
reward_type VARCHAR(50)
reward_value INTEGER
reward_metadata JSONB
created_at TIMESTAMP
```

#### `user_activity` (ALREADY EXISTS)
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES profiles(id)
activity_type VARCHAR(50)
content TEXT
created_at TIMESTAMP
```

---

## 📊 API Reference

### Streak Endpoints

#### `POST /api/v1/streak/check-in`
**Auth:** Required (Bearer token)  
**Body:** None  
**Response:**
```json
{
  "current_streak": 3,
  "longest_streak": 5,
  "streak_maintained": true,
  "streak_broken": false,
  "bonus_xp": 20,
  "total_xp": 350
}
```

#### `GET /api/v1/streak/status`
**Auth:** Required (Bearer token)  
**Response:**
```json
{
  "current_streak": 3,
  "longest_streak": 5,
  "last_activity_date": "2025-11-26"
}
```

---

### Viral Endpoints

#### `POST /api/v1/viral/share`
**Auth:** Required (Bearer token)  
**Body:**
```json
{
  "content_type": "tile",
  "content_id": "abc123",
  "platform": "whatsapp"
}
```
**Response:**
```json
{
  "success": true,
  "message": "+50 XP for sharing!"
}
```

---

## 🔍 Quick Reference

### Need to...

**Deploy the system?**  
→ Read: `QUICK_START_ADDICTION_ENGINE.md`

**Understand how it works?**  
→ Read: `ADDICTION_ENGINE_GUIDE.md`

**Add share button to a screen?**  
→ Read: `SHARE_BUTTON_INTEGRATION.md`

**Track metrics?**  
→ Read: `IMPLEMENTATION_ROADMAP.md` → Metrics section

**Debug an issue?**  
→ Read: `QUICK_START_ADDICTION_ENGINE.md` → Troubleshooting

**Modify reward amounts?**  
→ Edit: `backend/controllers/streakController.js` (line ~40)  
→ Edit: `backend/controllers/viralController.js` (line ~25)

**Add new achievements?**  
→ Edit: `backend/migrations/create_addiction_engine.sql` (line ~150)  
→ Run: INSERT statement in Supabase SQL Editor

**Change tile distribution (60/30/10)?**  
→ Edit: `backend/controllers/tilesController.js` (line ~35)

---

## 📦 Dependencies

### Backend (Already Installed)
- `@supabase/supabase-js` - Database client
- `@google/generative-ai` - Gemini AI (for tiles)
- `express` - Web server
- `dotenv` - Environment variables

### Frontend (May Need to Install)
- `@expo/vector-icons` - Icon library
- `react-native` - Core (already there)

**Install if missing:**
```bash
cd chitchat-app
npx expo install @expo/vector-icons
```

---

## ✅ Verification Checklist

Use this to verify your installation:

### Backend
- [ ] `backend/controllers/streakController.js` exists
- [ ] `backend/controllers/viralController.js` exists
- [ ] `backend/routes/streakRoutes.js` exists
- [ ] `backend/routes/viralRoutes.js` exists
- [ ] `backend/server.js` imports new routes
- [ ] `backend/migrations/create_addiction_engine.sql` exists

### Frontend
- [ ] `chitchat-app/components/ShareButton.tsx` exists

### Documentation
- [ ] `ADDICTION_ENGINE_SUMMARY.md` exists
- [ ] `QUICK_START_ADDICTION_ENGINE.md` exists
- [ ] `ADDICTION_ENGINE_GUIDE.md` exists
- [ ] `SHARE_BUTTON_INTEGRATION.md` exists
- [ ] `IMPLEMENTATION_ROADMAP.md` exists

---

## 🎓 Learning Path

If you're new to this system, read in this order:

1. **ADDICTION_ENGINE_SUMMARY.md** (10 min)
   - Get high-level overview
   - Understand the psychology

2. **QUICK_START_ADDICTION_ENGINE.md** (5 min)
   - Follow setup steps
   - Get system running

3. **Test the endpoints** (5 min)
   - Use curl or Postman
   - Verify everything works

4. **SHARE_BUTTON_INTEGRATION.md** (15 min)
   - Add ShareButton to 1-2 screens
   - Test in app

5. **ADDICTION_ENGINE_GUIDE.md** (30 min)
   - Deep dive into architecture
   - Understand database functions

6. **IMPLEMENTATION_ROADMAP.md** (20 min)
   - Plan monitoring strategy
   - Set up analytics

**Total time:** ~90 minutes from zero to expert

---

## 🚀 Status

All files created and ready for deployment.

**Next action:** Run `QUICK_START_ADDICTION_ENGINE.md`

---

**Created:** November 26, 2025  
**Status:** ✅ Complete  
**Files:** 11 total (7 code, 5 docs, this file)

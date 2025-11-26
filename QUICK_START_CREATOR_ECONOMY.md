# Quick Start: Creator Economy Feature

## ⚡ Fast Setup (5 minutes)

### Step 1: Database Migration
1. Open your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `backend/migrations/create_tutor_system.sql`
4. Click "Run" to execute the migration

### Step 2: Restart Backend Server
```bash
cd backend
node server.js
```

You should see:
```
Server is running on http://localhost:3001
```

### Step 3: Test the Feature

#### A. Become a Tutor
1. Open the app and login
2. Navigate to **Profile** tab
3. Find **Creator Studio** section
4. Tap **"Become a Tutor"**
5. Complete the 4-step onboarding:
   - Select expertise areas
   - Choose teaching style
   - Write your bio
   - Configure AI persona
6. Tap **"Become a Tutor"** to finish

#### B. Access Creator Dashboard
1. After onboarding, you'll be redirected to your dashboard
2. Or access it via **Profile** > **"My Creator Studio"**

#### C. Create a Learning Path
1. In dashboard, go to **Paths** tab
2. Tap **"+ Create New"**
3. Fill in path details:
   - Title
   - Description
   - Category
   - Difficulty level
   - Topics
4. Save the learning path

## 🎯 Test Scenarios

### Scenario 1: First-Time Tutor
```
User: new_user@example.com
Action: Complete onboarding → Create path → View analytics
Expected: Successfully becomes tutor, creates path, sees dashboard
```

### Scenario 2: Returning Tutor
```
User: existing_tutor@example.com
Action: Open Profile → Access Creator Studio → Manage paths
Expected: Direct access to dashboard, can edit/delete paths
```

### Scenario 3: Analytics View
```
User: tutor_with_paths@example.com
Action: Dashboard → Overview tab
Expected: See student count, path count, enrollments, rating
```

## 🐛 Quick Troubleshooting

### Backend doesn't start?
**Check**: Is `.env` file present with correct credentials?
```bash
# Verify environment variables
node -e "require('dotenv').config(); console.log(process.env.SUPABASE_URL)"
```

### Can't access tutor routes?
**Check**: Are you logged in? Token present?
```bash
# Test endpoint manually
curl http://localhost:3001/api/v1/tutors/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### TypeScript errors?
**Fix**: Reinstall dependencies
```bash
cd chitchat-app
rm -rf node_modules
npm install
```

### Migration fails?
**Check**: Is `uuid-ossp` extension enabled?
```sql
-- Run in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

## 📋 Pre-flight Checklist

Before testing, ensure:
- [ ] Backend server is running on port 3001
- [ ] Database migration has been executed
- [ ] Frontend app is running
- [ ] You're logged in with a valid account
- [ ] Network connection is stable

## 🎨 UI Preview

### Onboarding Flow
```
Step 1: Expertise Selection
┌──────────────────────────┐
│  What's Your Expertise?  │
│  ○ Programming           │
│  ○ Data Science         │
│  ○ Design               │
└──────────────────────────┘

Step 2: Teaching Style
┌──────────────────────────┐
│  Your Teaching Style     │
│  ◉ Conversational       │
│  ○ Structured           │
└──────────────────────────┘

Step 3: Bio
┌──────────────────────────┐
│  Tell Us About Yourself  │
│  [Text Area]            │
└──────────────────────────┘

Step 4: AI Persona
┌──────────────────────────┐
│  Configure Your AI       │
│  Tone: 😊 Friendly      │
│  Formality: Casual      │
└──────────────────────────┘
```

### Dashboard Overview
```
┌──────────────────────────────────────┐
│       Creator Studio                 │
├──────────────────────────────────────┤
│  [Overview] [Paths] [Profile]        │
├──────────────────────────────────────┤
│  📊 Total Students: 0                │
│  📚 Learning Paths: 0                │
│  ⭐ Average Rating: 0.0              │
│                                      │
│  Top Performing Paths                │
│  (Empty - Create your first path!)   │
└──────────────────────────────────────┘
```

## 🚀 Next Steps

After basic testing:
1. Create multiple learning paths with different categories
2. Test public/private visibility toggle
3. Try editing and deleting paths
4. Update tutor profile information
5. Test the discovery endpoint (browse public paths)

## 📞 Support

If you encounter issues:
1. Check console logs (backend & frontend)
2. Verify database schema in Supabase
3. Review API responses in Network tab
4. Ensure all files are saved

## 🎓 Sample Data

### Test Learning Path
```json
{
  "title": "JavaScript Essentials",
  "description": "Master JavaScript fundamentals in 4 weeks",
  "category": "Programming",
  "difficulty": "beginner",
  "estimatedDuration": 28,
  "topics": ["Variables", "Functions", "Arrays", "Objects"],
  "isPublic": true
}
```

### Test Tutor Profile
```json
{
  "expertise": ["Programming", "Web Development"],
  "teachingStyle": "practical",
  "bio": "I'm a software engineer with 5 years of teaching experience...",
  "aiPersona": {
    "tone": "friendly",
    "style": "practical",
    "formality": "balanced"
  }
}
```

---

**Ready to empower creators! 🎉**

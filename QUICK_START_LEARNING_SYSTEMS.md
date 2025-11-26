# Quick Start: Learning Systems

## ⚡ Setup (5 Minutes)

### Step 1: Database Migration
1. Open Supabase Dashboard → SQL Editor
2. Execute `backend/migrations/create_review_system.sql`
3. Verify `user_reviews` table created

### Step 2: Restart Backend
```bash
cd backend
node server.js
```

Expected output:
```
Server is running on http://localhost:3001
```

### Step 3: Test Features

## 🎯 Test Scenario 1: Learning Path

1. **Open App** → Login
2. **Navigate** → Library tab
3. **Select** a learning path
4. **Observe**:
   - ✅ Visual skill tree displays
   - ✅ Progress bar shows completion %
   - ✅ Lessons have emojis and descriptions
   - ✅ Path connectors visible between levels
   - ✅ Final boss challenge at bottom

5. **Tap** any lesson
6. **Verify**:
   - ✅ Chat opens with seed prompt
   - ✅ Lesson title in header
   - ✅ Tutor mode activated

7. **Complete** the lesson
8. **Return** to path
9. **Check**:
   - ✅ Lesson marked with ✓
   - ✅ Progress bar updated

## 🧠 Test Scenario 2: Daily Review

### First Time (Day 1)
1. **Have Activity**: Chat for 5+ minutes about a topic
2. **Wait**: 24 hours (or test with manual DB insert)
3. **Open** Discover tab
4. **Look For**:
   - ✅ Daily Review tile at top
   - ✅ Emoji + topic displayed
   - ✅ "3 min" estimated time

5. **Tap** review tile
6. **Verify**:
   - ✅ Question displayed
   - ✅ Hint available
   - ✅ Text input for answer

7. **Type** an answer
8. **Submit**
9. **Check**:
   - ✅ AI evaluation shown
   - ✅ Feedback provided
   - ✅ Score displayed (0-100)
   - ✅ XP awarded (0-50)

### Next Day (Day 2)
1. **Open** Discover tab
2. **Verify**:
   - ✅ NEW review question appears
   - ✅ Different topic/question
   - ✅ Based on recent learning

## 🔍 Verification Checklist

### Backend Health
```bash
# Test review endpoint
curl http://localhost:3001/api/v1/review/daily \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: 200 OK with review data or "already reviewed" message
```

### Database Check
```sql
-- In Supabase SQL Editor
SELECT * FROM user_reviews WHERE user_id = 'YOUR_USER_ID' LIMIT 5;

-- Should show review records with:
-- - question
-- - hint
-- - topic
-- - completed status
-- - evaluation (if completed)
```

### Frontend Check
```typescript
// In useTiles.ts console logs
- "Fetching daily review..." 
- "Daily review tile created: {reviewId}"
- OR "No review today"
```

## 🐛 Quick Fixes

### Issue: No review tile appears
**Check**:
- [ ] Have you chatted in the past 7 days?
- [ ] Is it your first day using the app?
- [ ] Did you already review today?

**Fix**: Chat for 5 minutes, wait 24 hours, check again

### Issue: Learning path not visual
**Check**:
- [ ] Is pathData being passed correctly?
- [ ] Are levels and lessons in modules_json?

**Fix**: Verify JSON structure in database

### Issue: XP not awarding
**Check**:
- [ ] Does users table have xp column?
- [ ] Does increment_user_xp function exist?

**Fix**: Run `create_review_system.sql` migration

## 📱 Sample Data

### Test Review (Manual Insert)
```sql
INSERT INTO user_reviews (user_id, question, hint, topic, emoji, completed)
VALUES (
  'YOUR_USER_ID',
  'What is the main benefit of React hooks?',
  'Think about state management in function components',
  'React',
  '⚛️',
  false
);
```

### Test Learning Path
Check existing paths in database or create via tutor system.

## 🎉 Success Indicators

### Learning Path Working
- [ ] Visual map displays correctly
- [ ] Lessons are tappable
- [ ] Progress updates after completion
- [ ] Final boss is accessible
- [ ] Smooth navigation

### Daily Review Working
- [ ] Review tile appears daily
- [ ] Question is relevant to chat history
- [ ] Answer submission works
- [ ] AI evaluation is constructive
- [ ] XP is awarded
- [ ] Can view review history

## 🚀 Next Steps

After successful testing:

1. **Monitor Usage**
   - Track daily review completion rates
   - Measure learning path engagement
   - Analyze XP distribution

2. **Gather Feedback**
   - Are questions too easy/hard?
   - Is the UI intuitive?
   - Are rewards motivating?

3. **Iterate**
   - Adjust review intervals
   - Improve AI question generation
   - Add more gamification

---

## 📞 Need Help?

Check these resources:
- `LEARNING_SYSTEMS_GUIDE.md` - Complete documentation
- Backend logs: `console.log` in reviewController.js
- Frontend logs: React Native debugger
- Database: Supabase dashboard

---

**You're ready to transform learning! 🎓**

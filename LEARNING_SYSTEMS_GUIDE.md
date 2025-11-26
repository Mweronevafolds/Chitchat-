# ChitChat Learning Systems - Complete Guide

## 🎓 Overview

ChitChat has evolved from a simple chatbot to a **Personalized Education Platform** with two powerful learning systems:

1. **Learning Path Visualization** - Interactive skill tree showing curriculum progress
2. **Daily Review System** - Spaced repetition for long-term retention

---

## 📚 Part 1: Learning Path Visualization

### What It Is
An interactive "skill tree" that transforms JSON curriculum data into a visual learning journey. Users can see their progress, navigate through levels, and face a "final boss" challenge.

### Key Features

#### Visual Curriculum Map
- **Levels & Lessons**: Hierarchical structure with clear progression
- **Progress Tracking**: Visual progress bar showing completion percentage
- **Lesson States**: 
  - 🎯 Not started (with emoji icon)
  - ✅ Completed (with check mark)
- **Final Boss**: Culminating challenge to test mastery

#### Interactive Elements
- **Tap to Learn**: Each lesson opens a guided chat session
- **Seed Prompts**: Pre-written introductions for each lesson
- **Path Connectors**: Visual lines showing progression flow
- **Tutor Mode**: Special chat mode for teaching

### File Structure

```
app/
└── learning-path.tsx           ← Main visualization screen

Component Features:
- SafeAreaView with back navigation
- ScrollView for smooth scrolling
- TouchableOpacity for interactions
- Progress calculation and display
- Lesson completion tracking
- Final boss challenge
```

### How It Works

1. **Data Flow**:
   ```
   Library Tab → Select Path → learning-path.tsx
   └── Receives pathData as JSON
   └── Parses levels, lessons, progress
   └── Renders interactive map
   ```

2. **Progress Tracking**:
   ```typescript
   completedLessons: Set<string> // Tracks "levelIndex-lessonIndex"
   progressData: user_learning_progress[] // From database
   calculateProgress(): percentage // Real-time calculation
   ```

3. **Navigation**:
   ```typescript
   handleLessonPress() → /session with:
   - title: lesson.title
   - seed_prompt: lesson introduction
   - mode: 'tutor'
   - pathId: for tracking
   - lessonId: for completion
   - isLearningPath: 'true'
   ```

### Visual Design

```
┌─────────────────────────────────┐
│  ← Back  JavaScript Mastery     │
│          Learn JS from scratch  │
│  ████████░░░░░░  60% Complete   │
├─────────────────────────────────┤
│                                 │
│  📘 Level 1: Fundamentals       │
│  ┌───────────────────────────┐ │
│  │ 📖 Variables & Types      │ │
│  │ Learn basic data types    │ │
│  │ ▶ Start Lesson            │ │
│  └───────────────────────────┘ │
│         │                       │
│  ┌───────────────────────────┐ │
│  │ ✓ Functions               │ │
│  │ Master function syntax    │ │
│  │ ✓ Completed               │ │
│  └───────────────────────────┘ │
│         │                       │
│  📘 Level 2: Advanced           │
│  ...                            │
│         │                       │
│  ┌───────────────────────────┐ │
│  │ 👹 Final Boss Challenge   │ │
│  │ Test your mastery         │ │
│  │ ⚡ Face the Boss           │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

### Database Schema

```sql
-- Learning paths table (existing)
learning_paths:
- id
- title
- description
- modules_json (curriculum structure)

-- Progress tracking
user_learning_progress:
- user_id
- path_id
- progress_json: {
    completed_lessons: ["0-0", "0-1", "1-0"],
    current_level: 1,
    started_at: "ISO_DATE"
  }
```

---

## 🧠 Part 2: Daily Review System (Spaced Repetition)

### What It Is
An intelligent system that scans your chat history and generates personalized review questions to strengthen long-term memory retention.

### How It Works

#### 1. Daily Review Generation
```javascript
GET /api/v1/review/daily

Process:
1. Check if user already reviewed today
2. Fetch chat history from 3-7 days ago
3. Extract learning content from AI responses
4. Use Gemini AI to generate review question
5. Store review in database
6. Return question with hint and topic
```

#### 2. Spaced Repetition Algorithm
```javascript
Review Intervals:
- Day 1: Learn concept
- Day 3: First review
- Day 7: Second review
- Day 14: Third review
- Day 30: Fourth review

Calculation:
daysAgo = Math.min(lastReviewDaysAgo, 7)
reviewDate = today - daysAgo
```

#### 3. AI-Powered Evaluation
```javascript
POST /api/v1/review/submit

Process:
1. Receive user's answer
2. Use Gemini AI to evaluate understanding
3. Generate feedback and score (0-100)
4. Award XP based on quality (score/2)
5. Update review as completed
```

### File Structure

```
backend/
├── controllers/
│   └── reviewController.js      ← Review logic
├── routes/
│   └── reviewRoutes.js          ← API endpoints
└── migrations/
    └── create_review_system.sql ← Database schema

frontend/
└── hooks/
    └── useTiles.ts              ← Fetches and displays reviews
```

### API Endpoints

```
GET  /api/v1/review/daily        - Get today's review question
POST /api/v1/review/submit       - Submit answer and get feedback
GET  /api/v1/review/history      - View past reviews
GET  /api/v1/review/stats        - Get performance statistics
```

### Controller Functions

```javascript
getDailyReview()
├── Check if already reviewed today
├── Calculate review interval
├── Fetch relevant chat history
├── Generate AI question
└── Return: { question, hint, topic, emoji }

submitReview()
├── Validate review exists
├── Use AI to evaluate answer
├── Calculate quality score
├── Award XP (0-50 based on score)
└── Return: { evaluation, xpEarned, feedback }

getReviewHistory()
└── Return: { reviews, statistics }

getReviewStats()
├── Calculate streak
├── Compute average score
└── Return: { totalReviews, currentStreak, topicsReviewed }
```

### Database Schema

```sql
user_reviews:
- id (UUID)
- user_id (UUID)
- question (TEXT)
- hint (TEXT)
- topic (TEXT)
- emoji (TEXT)
- completed (BOOLEAN)
- user_answer (TEXT)
- evaluation (JSONB): {
    isCorrect: boolean,
    feedback: string,
    score: 0-100,
    keyPoints: string[]
  }
- created_at (TIMESTAMP)
- completed_at (TIMESTAMP)

users:
- xp (INTEGER) - added for gamification
```

### Frontend Integration

#### Updated TileData Type
```typescript
type TileData = {
  id: string;
  type: 'daily-review' | 'micro-lesson' | ...
  hook: string;
  question?: string;
  hint?: string;
  topic?: string;
  emoji?: string;
  reviewId?: string;
}
```

#### Tile Fetching Logic
```typescript
useTiles.ts:
1. Fetch daily review first
2. If review exists, create review tile
3. Fetch regular curiosity tiles
4. Prepend review tile to array
5. Return combined tiles
```

### Visual Design

```
┌─────────────────────────────────┐
│ 🧠 Daily Review: JavaScript     │
├─────────────────────────────────┤
│ Question:                       │
│ What is the difference between  │
│ let and const in JavaScript?    │
│                                 │
│ 💡 Hint: Think about            │
│ reassignment capabilities       │
│                                 │
│ [Text Input]                    │
│                                 │
│ [Submit Answer]                 │
└─────────────────────────────────┘
```

### Gamification Features

#### XP System
```javascript
Review Completion:
- Quality Score 0-100 (AI evaluated)
- XP Earned = Score / 2 (0-50 XP)
- Added to user's total XP

Streak Tracking:
- Daily completion tracking
- Streak counter
- Motivation to maintain consistency
```

#### Statistics Dashboard
```javascript
Review Stats:
- Total Reviews: 45
- Completed: 42
- Current Streak: 7 days
- Average Score: 85.3
- Topics Mastered: ["JavaScript", "Python", "React"]
```

---

## 🚀 Implementation Steps

### Step 1: Database Setup

```bash
# In Supabase SQL Editor:

# 1. Run tutor system migration (if not done)
backend/migrations/create_tutor_system.sql

# 2. Run review system migration
backend/migrations/create_review_system.sql
```

### Step 2: Backend Setup

```bash
cd backend

# Verify files exist:
# - controllers/reviewController.js
# - routes/reviewRoutes.js
# - server.js (updated)

node server.js
# Should show: Server is running on http://localhost:3001
```

### Step 3: Frontend Setup

```bash
cd chitchat-app

# Verify files:
# - app/learning-path.tsx (already exists)
# - hooks/useTiles.ts (updated)

npm start
```

### Step 4: Testing

#### Test Learning Path:
1. Open Library tab
2. Select a learning path
3. Verify visual map displays
4. Tap a lesson
5. Verify chat opens with seed prompt
6. Complete lesson
7. Return to path
8. Verify lesson marked complete

#### Test Daily Review:
1. Open Discover tab
2. Look for daily review tile at top
3. Tap to view question
4. Enter answer
5. Verify AI evaluation
6. Check XP awarded
7. Next day, verify new review appears

---

## 🎨 Design Principles

### Learning Path Visualization
- **Progressive Disclosure**: Show one level at a time
- **Visual Feedback**: Clear completion states
- **Gamification**: Progress bars, final boss
- **Mobile-First**: Touch-friendly, scrollable

### Daily Review System
- **Spaced Repetition**: Science-backed intervals
- **AI-Powered**: Personalized questions
- **Immediate Feedback**: Constructive evaluation
- **Gamification**: XP rewards, streaks

---

## 📊 Analytics & Tracking

### Learning Path Metrics
```javascript
- Path completion rate
- Average time per lesson
- Lessons completed per day
- Final boss pass rate
- Most popular paths
```

### Review System Metrics
```javascript
- Daily active reviewers
- Average streak length
- Review completion rate
- Average quality score
- Most reviewed topics
```

---

## 🔒 Security

### RLS Policies

```sql
user_reviews:
- Users can only view their own reviews
- System can insert reviews for any user
- Users can only update their own reviews

learning_paths:
- Public paths visible to all
- Private paths visible to creator only
```

### Authentication
- All endpoints require JWT token
- Token validated via authMiddleware
- User ID extracted from token

---

## 🐛 Troubleshooting

### Learning Path Not Loading
**Issue**: Path data not found
**Solution**: Verify pathData passed as param from Library tab

### Daily Review Not Appearing
**Issue**: No review tile in feed
**Solution**: 
- Check if already reviewed today
- Verify enough chat history (50+ messages)
- Check backend logs for AI generation errors

### XP Not Awarding
**Issue**: XP not incrementing
**Solution**:
- Verify increment_user_xp function exists
- Check users table has xp column
- Review database logs

---

## 🔮 Future Enhancements

### Learning Path System
- [ ] Collaborative paths (multiple creators)
- [ ] Branching paths (choose your adventure)
- [ ] Video/audio lesson support
- [ ] Interactive code challenges
- [ ] Certificate generation

### Review System
- [ ] Multiple choice reviews
- [ ] Voice-based reviews
- [ ] Peer reviews
- [ ] Review reminders
- [ ] Custom review schedules
- [ ] Review leaderboards

---

## 📈 Success Metrics

### Learning Path Adoption
- ✅ 80%+ path completion rate
- ✅ 10+ minutes avg session time
- ✅ 70%+ return rate

### Review System Engagement
- ✅ 60%+ daily review completion
- ✅ 7+ day average streak
- ✅ 80+ average quality score

---

## 🎯 Quick Reference

### Key Files
```
Backend:
- controllers/reviewController.js
- routes/reviewRoutes.js
- migrations/create_review_system.sql

Frontend:
- app/learning-path.tsx
- hooks/useTiles.ts
```

### Key Endpoints
```
GET  /api/v1/review/daily
POST /api/v1/review/submit
GET  /api/v1/review/history
GET  /api/v1/review/stats
```

### Database Tables
```
- user_reviews
- learning_paths
- user_learning_progress
- users (with xp column)
```

---

**Built with ❤️ for transforming ChitChat into a world-class personalized education platform!**

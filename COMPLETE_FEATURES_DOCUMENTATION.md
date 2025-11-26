# ChitChat - Complete Features Documentation

**Version:** 1.0.0  
**Last Updated:** November 26, 2025  
**Repository:** Chitchat-  
**Owner:** Mweronevafolds

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Authentication System](#authentication-system)
4. [Chat System](#chat-system)
5. [File Upload & Media Sharing](#file-upload--media-sharing)
6. [Learning Systems](#learning-systems)
7. [Daily Missions](#daily-missions)
8. [Review System (Spaced Repetition)](#review-system-spaced-repetition)
9. [Tutor/Creator Economy](#tutorcreator-economy)
10. [Recommendations & Personalization](#recommendations--personalization)
11. [Activity Tracking](#activity-tracking)
12. [Profile Management](#profile-management)
13. [Curiosity Tiles](#curiosity-tiles)
14. [Frontend Components](#frontend-components)
15. [Database Schema](#database-schema)
16. [API Endpoints](#api-endpoints)
17. [Environment Configuration](#environment-configuration)
18. [Deployment](#deployment)

---

## Overview

ChitChat is a comprehensive AI-powered learning and social platform that combines:
- **Intelligent Chat System** with AI assistance
- **File & Media Sharing** capabilities
- **Personalized Learning Paths** with AI recommendations
- **Spaced Repetition Review System** for knowledge retention
- **Creator Economy** allowing users to become tutors
- **Daily Missions** for gamified learning
- **Activity Tracking** for analytics and insights
- **Curiosity Tiles** for content discovery

### Technology Stack

**Backend:**
- Node.js + Express
- Supabase (PostgreSQL + Auth + Storage)
- Google Gemini AI (via @google/generative-ai)
- BullMQ + Redis (job queue)
- Multer (file uploads)

**Frontend:**
- React Native + Expo
- TypeScript
- Expo Router (file-based routing)
- Expo Image Picker & Document Picker
- AsyncStorage for local state

**AI Integration:**
- Google Gemini Pro (text generation)
- Google Gemini Pro Vision (image analysis)
- Custom context-aware AI assistants

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     ChitChat Mobile App                      │
│                  (React Native + Expo)                       │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ HTTP/REST API
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                   Backend API Server                         │
│                  (Node.js + Express)                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Auth MW    │  │   Routes     │  │ Controllers  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────┬───────────────────────────────────────────┘
                  │
       ┌──────────┼──────────┐
       │          │           │
       ▼          ▼           ▼
┌─────────┐  ┌─────────┐  ┌─────────┐
│Supabase │  │ Gemini  │  │  Redis  │
│(DB+Auth)│  │   AI    │  │ +BullMQ │
└─────────┘  └─────────┘  └─────────┘
```

### Directory Structure

```
ChitChat/
├── backend/                    # Node.js API Server
│   ├── server.js              # Main entry point
│   ├── supabase.js            # Supabase client setup
│   ├── queue.js               # BullMQ setup
│   ├── worker.js              # Background job processor
│   ├── controllers/           # Business logic
│   │   ├── chatController.js
│   │   ├── uploadController.js
│   │   ├── profileController.js
│   │   ├── tilesController.js
│   │   ├── pathController.js
│   │   ├── recommendationController.js
│   │   ├── activityController.js
│   │   ├── missionController.js
│   │   ├── tutorController.js
│   │   └── reviewController.js
│   ├── routes/                # API route definitions
│   ├── middleware/            # Auth & validation
│   └── migrations/            # Database migrations
│
└── chitchat-app/              # React Native Frontend
    ├── app/                   # Expo Router screens
    │   ├── (tabs)/           # Main tab navigation
    │   │   ├── index.tsx     # Home/Dashboard
    │   │   ├── chat.tsx      # Chat interface
    │   │   ├── discover.tsx  # Content discovery
    │   │   ├── library.tsx   # Saved content
    │   │   └── profile.tsx   # User profile
    │   ├── tutor/            # Tutor features
    │   ├── login.tsx         # Authentication
    │   ├── onboarding.tsx    # User onboarding
    │   ├── session.tsx       # Chat sessions
    │   └── learning-path.tsx # Learning paths
    ├── components/            # Reusable UI components
    ├── context/              # React Context providers
    └── hooks/                # Custom React hooks
```

---

## Authentication System

### Features
- **Supabase Auth Integration**: Secure authentication using Supabase
- **Row Level Security (RLS)**: Database-level access control
- **JWT Tokens**: Stateless authentication
- **Protected Routes**: Middleware-based route protection

### Implementation

**Backend Middleware** (`backend/middleware/authMiddleware.js`):
```javascript
// Validates JWT token from Supabase
// Attaches user info to req.user
// Returns 401 for invalid/missing tokens
```

**Frontend Auth Flow**:
1. User enters credentials on `login.tsx`
2. App calls Supabase Auth
3. Token stored in AsyncStorage
4. Token included in all API requests
5. Backend validates token via middleware

### User Table Structure
```sql
users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  xp INTEGER DEFAULT 0,
  is_tutor BOOLEAN DEFAULT false,
  created_at TIMESTAMP
)
```

---

## Chat System

### Features
- **AI-Powered Conversations**: Google Gemini AI integration
- **Session Management**: Multiple chat sessions per user
- **Context Awareness**: AI remembers conversation history
- **File Attachments**: Support for documents and images
- **Media Sharing**: Images, videos, documents
- **Real-time Updates**: Message persistence in Supabase

### API Endpoints

**POST /api/v1/chat**
- Create new chat message
- AI generates response
- Saves conversation to database
- Returns AI response

**GET /api/v1/chat/sessions**
- List all user's chat sessions
- Returns sessions with metadata

**GET /api/v1/chat/:sessionId/messages**
- Fetch messages for specific session
- Returns chronological message list

**POST /api/v1/chat/upload**
- Upload file for chat context
- Supports documents, images
- Returns file URL

### Database Schema

```sql
chat_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

chat_messages (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id),
  user_id UUID REFERENCES users(id),
  content TEXT,
  role TEXT, -- 'user' or 'assistant'
  media_url TEXT,
  media_type TEXT, -- 'image', 'video', 'document'
  metadata JSONB,
  created_at TIMESTAMP
)
```

### AI Integration

**Model**: Google Gemini Pro
**Features**:
- Context-aware responses
- Multi-turn conversations
- Document analysis
- Image understanding (Gemini Pro Vision)

**Implementation**:
```javascript
// backend/controllers/chatController.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
```

---

## File Upload & Media Sharing

### Features
- **Multi-Format Support**: Images, videos, documents (PDF, DOCX, TXT)
- **Supabase Storage**: Secure cloud storage
- **Pre-signed URLs**: Secure file access
- **Document Processing**: PDF parsing and text extraction
- **Image Analysis**: AI-powered image understanding
- **Progress Tracking**: Upload progress indicators

### Upload Flow

1. **Initialize Upload** - `POST /api/v1/upload/init`
   - Returns signed upload URL
   - Creates storage bucket path

2. **Upload File** - Direct to Supabase Storage
   - Uses pre-signed URL
   - Supports large files

3. **Complete Upload** - `POST /api/v1/upload/complete`
   - Stores metadata in database
   - Generates public URL
   - Returns file info

### Storage Structure

```
supabase-storage/
└── user-uploads/
    └── {user_id}/
        ├── documents/
        ├── images/
        └── videos/
```

### Supported File Types

**Documents**:
- PDF (.pdf)
- Text (.txt)
- Word (.docx)
- Markdown (.md)

**Images**:
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

**Videos**:
- MP4 (.mp4)
- MOV (.mov)
- WebM (.webm)

### Document Processing

**PDF Parsing**:
```javascript
const pdfParse = require('pdf-parse');
// Extracts text content from PDF
// Sends to AI for analysis
```

**AI Analysis**:
- Summarization
- Key concept extraction
- Question generation
- Context integration

---

## Learning Systems

### Overview
The learning system provides personalized, AI-generated learning paths with structured lessons and progress tracking.

### Features
- **AI-Generated Paths**: Custom learning journeys
- **Structured Lessons**: Step-by-step content
- **Progress Tracking**: Lesson completion status
- **Suggested Paths**: AI recommendations based on user interests
- **Adaptive Learning**: Paths adjust to user progress

### API Endpoints

**POST /api/v1/paths/generate**
- Generate personalized learning path
- Input: topic, level, goals
- Output: Structured path with lessons

**GET /api/v1/paths**
- Get user's learning paths
- Returns all paths with progress

**GET /api/v1/paths/suggested**
- AI-suggested paths based on profile
- Uses recommendation engine

**POST /api/v1/paths/:pathId/complete-lesson**
- Mark lesson as complete
- Updates progress
- Awards XP

### Database Schema

```sql
learning_paths (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  topic TEXT,
  difficulty_level TEXT, -- 'beginner', 'intermediate', 'advanced'
  estimated_hours INTEGER,
  lessons JSONB, -- Array of lesson objects
  progress JSONB, -- Completion tracking
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Lesson Structure

```json
{
  "id": "lesson-1",
  "title": "Introduction to Topic",
  "content": "Lesson content...",
  "duration": 30,
  "resources": [
    {
      "type": "video",
      "url": "...",
      "title": "..."
    }
  ],
  "quiz": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correct": 0
    }
  ]
}
```

### Progress Tracking

```json
{
  "completed_lessons": ["lesson-1", "lesson-2"],
  "current_lesson": "lesson-3",
  "completion_percentage": 40,
  "time_spent": 120, // minutes
  "quiz_scores": {
    "lesson-1": 0.9,
    "lesson-2": 0.85
  }
}
```

---

## Daily Missions

### Features
- **Daily Challenges**: New mission every day
- **XP Rewards**: Points for completion
- **Streak Tracking**: Consecutive day completion
- **Variety**: Different types of missions
- **Gamification**: Progress bars and achievements

### Mission Types

1. **Learning Missions**
   - Complete a lesson
   - Watch educational content
   - Read articles

2. **Chat Missions**
   - Have conversations with AI
   - Ask specific questions
   - Explore topics

3. **Review Missions**
   - Complete daily reviews
   - Practice spaced repetition

4. **Social Missions**
   - Share knowledge
   - Help others
   - Create content

### API Endpoints

**GET /api/v1/missions/today**
- Fetch today's mission
- Creates new if none exists
- Returns mission details

**POST /api/v1/missions/complete**
- Mark mission complete
- Awards XP
- Updates streak

**GET /api/v1/missions/stats**
- User mission statistics
- Total completed
- Current streak
- XP earned

### Database Schema

```sql
daily_missions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  date DATE NOT NULL,
  mission_type TEXT,
  title TEXT,
  description TEXT,
  emoji TEXT,
  xp_reward INTEGER DEFAULT 50,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  created_at TIMESTAMP,
  UNIQUE(user_id, date)
)
```

### XP System

**Mission Completion**: 50 XP  
**Streak Bonus**: +10 XP per day (max 100)  
**Perfect Week**: +200 XP bonus

---

## Review System (Spaced Repetition)

### Features
- **Spaced Repetition Algorithm**: Optimized review scheduling
- **AI-Generated Questions**: Custom review questions
- **Progress Tracking**: Review history and stats
- **XP Rewards**: Points for completing reviews
- **Smart Hints**: AI-powered assistance

### How It Works

1. **Content Learning**: User learns new topics via chat/paths
2. **Question Generation**: AI creates review questions
3. **Scheduling**: Questions scheduled using spaced repetition
4. **Daily Reviews**: User answers questions
5. **Evaluation**: AI evaluates answers
6. **Rescheduling**: Based on performance

### API Endpoints

**GET /api/v1/review/daily**
- Fetch today's review questions
- AI generates new questions from chat history
- Returns unanswered reviews

**POST /api/v1/review/submit**
- Submit answer to review question
- AI evaluates correctness
- Awards XP
- Updates review schedule

**GET /api/v1/review/history**
- Past review sessions
- Performance over time

**GET /api/v1/review/stats**
- Overall statistics
- Accuracy rate
- Total reviews completed
- Streak information

### Database Schema

```sql
user_reviews (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  question TEXT NOT NULL,
  hint TEXT,
  topic TEXT NOT NULL,
  emoji TEXT,
  completed BOOLEAN DEFAULT false,
  user_answer TEXT,
  evaluation JSONB, -- {correct: boolean, feedback: string, score: number}
  created_at TIMESTAMP,
  completed_at TIMESTAMP
)
```

### Evaluation System

**AI Evaluation**:
- Checks answer correctness
- Provides constructive feedback
- Assigns score (0-1)
- Suggests improvements

**XP Awards**:
- Correct answer: 20 XP
- Partial credit: 10 XP
- Daily review streak: +5 XP bonus

---

## Tutor/Creator Economy

### Features
- **Tutor Upgrade**: Users can become tutors
- **Learning Path Creation**: Tutors create custom paths
- **Public Path Publishing**: Share paths with community
- **Analytics Dashboard**: Track student engagement
- **Tutor Profiles**: Showcase expertise
- **Revenue Potential**: Monetization ready (future)

### Tutor Workflow

1. **Upgrade to Tutor** - `POST /api/v1/tutors/upgrade`
   - User requests tutor status
   - Profile enhanced with tutor fields

2. **Create Profile** - `PUT /api/v1/tutors/profile`
   - Bio, expertise, credentials
   - Profile picture
   - Social links

3. **Create Learning Paths** - `POST /api/v1/tutors/paths`
   - Design custom curriculum
   - Add lessons and resources
   - Set difficulty and duration

4. **Publish Paths** - Make paths public
   - Available in discovery feed
   - Students can enroll

5. **Track Analytics** - `GET /api/v1/tutors/analytics`
   - Student enrollments
   - Completion rates
   - Engagement metrics

### API Endpoints

**Tutor Management**:
- `POST /api/v1/tutors/upgrade` - Become a tutor
- `GET /api/v1/tutors/profile` - Get tutor profile
- `PUT /api/v1/tutors/profile` - Update tutor profile
- `GET /api/v1/tutors/analytics` - View analytics

**Learning Path Management**:
- `POST /api/v1/tutors/paths` - Create learning path
- `GET /api/v1/tutors/paths` - Get my paths
- `PUT /api/v1/tutors/paths/:pathId` - Update path
- `DELETE /api/v1/tutors/paths/:pathId` - Delete path

**Discovery**:
- `GET /api/v1/tutors/discover/paths` - Browse public paths

### Database Schema

```sql
tutor_profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) UNIQUE,
  bio TEXT,
  expertise TEXT[],
  credentials TEXT,
  rating DECIMAL(3,2),
  total_students INTEGER DEFAULT 0,
  total_paths INTEGER DEFAULT 0,
  social_links JSONB,
  created_at TIMESTAMP
)

tutor_learning_paths (
  id UUID PRIMARY KEY,
  tutor_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  topic TEXT,
  difficulty_level TEXT,
  estimated_hours INTEGER,
  lessons JSONB,
  is_public BOOLEAN DEFAULT false,
  price DECIMAL(10,2) DEFAULT 0,
  enrollment_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

path_enrollments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  path_id UUID REFERENCES tutor_learning_paths(id),
  progress JSONB,
  enrolled_at TIMESTAMP,
  completed_at TIMESTAMP
)
```

### Analytics Tracking

**Metrics**:
- Total enrollments
- Active students
- Completion rate
- Average rating
- Revenue (future)
- Engagement time

---

## Recommendations & Personalization

### Features
- **AI-Powered Recommendations**: Personalized content suggestions
- **Interest Tracking**: Learn from user behavior
- **Content Discovery**: Find relevant topics
- **Adaptive Algorithm**: Improves over time
- **Privacy Controls**: Clear user data option

### How It Works

1. **Data Collection**:
   - Chat topics
   - Learning path enrollments
   - Mission completions
   - Review topics
   - Time spent on topics

2. **Analysis**:
   - AI analyzes user interests
   - Identifies patterns
   - Determines skill level

3. **Recommendation Generation**:
   - Suggest learning paths
   - Recommend tutors
   - Propose topics
   - Curiosity tiles

### API Endpoints

**GET /api/v1/recommendations**
- Get personalized recommendations
- Returns paths, topics, tutors

**GET /api/v1/recommendations/interests**
- View tracked interests
- Shows what system knows

**POST /api/v1/recommendations/clear**
- Clear recommendation data
- Privacy control

### Recommendation Types

1. **Learning Paths**
   - Based on completed paths
   - Skill progression
   - Related topics

2. **Curiosity Tiles**
   - Trending topics
   - Related interests
   - New discoveries

3. **Tutor Suggestions**
   - Match expertise to interests
   - Ratings and reviews
   - Teaching style

4. **Next Steps**
   - Continue learning
   - Practice recommendations
   - Advanced topics

### Database Schema

```sql
user_interests (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  topic TEXT,
  interest_score DECIMAL(3,2), -- 0-1 confidence
  interaction_count INTEGER,
  last_interaction TIMESTAMP,
  created_at TIMESTAMP
)

user_activity (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  activity_type TEXT, -- 'chat', 'lesson', 'mission', 'review'
  activity_data JSONB,
  created_at TIMESTAMP
)
```

---

## Activity Tracking

### Features
- **User Actions Logging**: Track all user interactions
- **Analytics**: User behavior insights
- **Progress Monitoring**: Learning journey tracking
- **Engagement Metrics**: Time spent, frequency
- **Privacy-Focused**: User data control

### Tracked Activities

**Learning Activities**:
- Lesson completions
- Path enrollments
- Review sessions
- Mission completions

**Chat Activities**:
- Message count
- Topics discussed
- AI interactions

**Social Activities**:
- Content creation
- Path enrollments
- Tutor interactions

### API Endpoint

**POST /api/v1/activity/log**
- Log user activity
- Input: activity type, data
- Async processing

### Database Schema

```sql
user_activity (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  activity_type TEXT NOT NULL,
  activity_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP
)

-- Indexes for performance
CREATE INDEX idx_activity_user_id ON user_activity(user_id);
CREATE INDEX idx_activity_type ON user_activity(activity_type);
CREATE INDEX idx_activity_created ON user_activity(created_at DESC);
```

---

## Profile Management

### Features
- **User Profiles**: Display name, avatar, bio
- **Onboarding Flow**: Initial setup
- **XP System**: Gamification points
- **Achievements**: Badges and milestones
- **Settings**: Preferences and privacy

### API Endpoints

**GET /api/v1/profiles/me**
- Fetch current user profile
- Returns profile data

**POST /api/v1/profiles/onboard**
- Complete onboarding
- Set initial preferences
- Create profile

### Profile Data Structure

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "display_name": "John Doe",
  "avatar_url": "https://...",
  "bio": "Learning enthusiast",
  "xp": 1250,
  "level": 5,
  "is_tutor": false,
  "interests": ["AI", "Programming", "Design"],
  "preferences": {
    "theme": "dark",
    "notifications": true,
    "language": "en"
  },
  "stats": {
    "paths_completed": 5,
    "missions_completed": 30,
    "reviews_completed": 45,
    "current_streak": 7
  }
}
```

---

## Curiosity Tiles

### Features
- **AI-Generated Content**: Personalized topic tiles
- **Topic Discovery**: Explore new areas
- **Quick Learning**: Bite-sized content
- **Visual Design**: Emoji + title + description
- **Interactive**: Tap to explore

### How It Works

1. User requests tiles from `discover.tsx`
2. API analyzes user interests
3. AI generates relevant topics
4. Returns formatted tiles
5. User taps to start chat about topic

### API Endpoint

**POST /api/v1/tiles**
- Generate curiosity tiles
- AI-powered suggestions
- Returns array of tiles

### Tile Structure

```json
{
  "id": "tile-1",
  "emoji": "🧬",
  "title": "DNA and Genetics",
  "description": "Explore the building blocks of life",
  "topic": "Biology",
  "difficulty": "intermediate",
  "estimated_time": 15
}
```

---

## Frontend Components

### Core Components

**ChatBubble.tsx**
- Displays chat messages
- Supports text and media
- User vs AI styling
- Timestamp display

**Composer.tsx**
- Message input
- File attachment button
- Send button
- Multiline support

**CuriosityTile.tsx**
- Tile display component
- Emoji + text layout
- Tap animation
- Gradient background

**TypingIndicator.tsx**
- Animated dots
- Shows AI is thinking
- Loading state

**ResourceCard.tsx**
- Learning resource display
- Image + title + description
- Progress indicator

**ResourceSelectionModal.tsx**
- Path/resource picker
- Search functionality
- Category filter

### Screens

**app/(tabs)/index.tsx** - Home/Dashboard
- Daily mission card
- XP progress
- Quick actions
- Recent activity

**app/(tabs)/chat.tsx** - Chat Interface
- Message list
- Composer
- File attachments
- Session management

**app/(tabs)/discover.tsx** - Discovery Feed
- Curiosity tiles
- Trending topics
- Recommended paths
- Tutor showcase

**app/(tabs)/library.tsx** - Saved Content
- Enrolled paths
- Bookmarked content
- Downloaded files
- History

**app/(tabs)/profile.tsx** - User Profile
- Profile info
- Stats display
- Settings access
- Achievements

**app/learning-path.tsx** - Learning Path Details
- Lesson list
- Progress tracker
- Next lesson button
- Resources section

**app/tutor/dashboard.tsx** - Tutor Dashboard
- Analytics overview
- Path management
- Student list
- Earnings (future)

**app/session.tsx** - Chat Session View
- Full conversation
- Message history
- Context display

---

## Database Schema

### Complete Schema Overview

```sql
-- Users and Authentication
users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  xp INTEGER DEFAULT 0,
  is_tutor BOOLEAN DEFAULT false,
  preferences JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

-- Chat System
chat_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

chat_messages (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  role TEXT NOT NULL, -- 'user' or 'assistant'
  media_url TEXT,
  media_type TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
)

-- Learning Paths
learning_paths (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  topic TEXT,
  difficulty_level TEXT,
  estimated_hours INTEGER,
  lessons JSONB,
  progress JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

-- Daily Missions
daily_missions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mission_type TEXT,
  title TEXT NOT NULL,
  description TEXT,
  emoji TEXT,
  xp_reward INTEGER DEFAULT 50,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date)
)

-- Review System
user_reviews (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  hint TEXT,
  topic TEXT NOT NULL,
  emoji TEXT,
  completed BOOLEAN DEFAULT false,
  user_answer TEXT,
  evaluation JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
)

-- Tutor System
tutor_profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  bio TEXT,
  expertise TEXT[],
  credentials TEXT,
  rating DECIMAL(3,2) DEFAULT 0,
  total_students INTEGER DEFAULT 0,
  total_paths INTEGER DEFAULT 0,
  social_links JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

tutor_learning_paths (
  id UUID PRIMARY KEY,
  tutor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  topic TEXT,
  difficulty_level TEXT,
  estimated_hours INTEGER,
  lessons JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  price DECIMAL(10,2) DEFAULT 0,
  enrollment_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

path_enrollments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  path_id UUID REFERENCES tutor_learning_paths(id) ON DELETE CASCADE,
  progress JSONB,
  enrolled_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  UNIQUE(user_id, path_id)
)

-- Activity Tracking
user_activity (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
)

-- Recommendations
user_interests (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  interest_score DECIMAL(3,2) DEFAULT 0.5,
  interaction_count INTEGER DEFAULT 1,
  last_interaction TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
)
```

### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX idx_learning_paths_user ON learning_paths(user_id);
CREATE INDEX idx_missions_user_date ON daily_missions(user_id, date);
CREATE INDEX idx_reviews_user_completed ON user_reviews(user_id, completed);
CREATE INDEX idx_activity_user ON user_activity(user_id);
CREATE INDEX idx_activity_created ON user_activity(created_at DESC);
CREATE INDEX idx_users_xp ON users(xp DESC);
CREATE INDEX idx_tutor_paths_public ON tutor_learning_paths(is_public) WHERE is_public = true;
```

---

## API Endpoints

### Complete API Reference

#### Authentication
All endpoints require authentication via Bearer token (except debug endpoints)

**Header**: `Authorization: Bearer <token>`

---

#### Chat System

**POST /api/v1/chat**
```json
Request:
{
  "message": "Explain quantum computing",
  "sessionId": "uuid" // optional
}

Response:
{
  "sessionId": "uuid",
  "response": "Quantum computing is...",
  "messageId": "uuid"
}
```

**GET /api/v1/chat/sessions**
```json
Response:
{
  "sessions": [
    {
      "id": "uuid",
      "title": "Quantum Physics Discussion",
      "updatedAt": "2025-11-26T10:00:00Z",
      "messageCount": 15
    }
  ]
}
```

**GET /api/v1/chat/:sessionId/messages**
```json
Response:
{
  "messages": [
    {
      "id": "uuid",
      "content": "Message text",
      "role": "user",
      "mediaUrl": null,
      "createdAt": "2025-11-26T10:00:00Z"
    }
  ]
}
```

**POST /api/v1/chat/upload**
```
Content-Type: multipart/form-data
file: [binary]

Response:
{
  "fileUrl": "https://...",
  "fileType": "document",
  "analysis": "Document summary..."
}
```

---

#### File Upload

**POST /api/v1/upload/init**
```json
Request:
{
  "fileName": "document.pdf",
  "fileType": "application/pdf",
  "fileSize": 1024000
}

Response:
{
  "uploadUrl": "https://...",
  "uploadId": "uuid",
  "path": "user-uploads/..."
}
```

**POST /api/v1/upload/complete**
```json
Request:
{
  "uploadId": "uuid",
  "path": "user-uploads/..."
}

Response:
{
  "fileUrl": "https://...",
  "fileId": "uuid"
}
```

---

#### Profile

**GET /api/v1/profiles/me**
```json
Response:
{
  "id": "uuid",
  "email": "user@example.com",
  "displayName": "John Doe",
  "avatarUrl": "https://...",
  "xp": 1250,
  "isTutor": false,
  "stats": { ... }
}
```

**POST /api/v1/profiles/onboard**
```json
Request:
{
  "displayName": "John Doe",
  "interests": ["AI", "Programming"],
  "learningGoals": "Master web development"
}

Response:
{
  "success": true,
  "profile": { ... }
}
```

---

#### Curiosity Tiles

**POST /api/v1/tiles**
```json
Request:
{
  "count": 6 // optional, default 6
}

Response:
{
  "tiles": [
    {
      "id": "tile-1",
      "emoji": "🧬",
      "title": "DNA and Genetics",
      "description": "Explore the building blocks of life",
      "topic": "Biology"
    }
  ]
}
```

---

#### Learning Paths

**POST /api/v1/paths/generate**
```json
Request:
{
  "topic": "Machine Learning",
  "level": "beginner",
  "goals": "Build ML models"
}

Response:
{
  "pathId": "uuid",
  "path": {
    "title": "Machine Learning Fundamentals",
    "lessons": [ ... ]
  }
}
```

**GET /api/v1/paths**
```json
Response:
{
  "paths": [
    {
      "id": "uuid",
      "title": "Machine Learning Fundamentals",
      "progress": 45,
      "lessonsCompleted": 3,
      "totalLessons": 10
    }
  ]
}
```

**GET /api/v1/paths/suggested**
```json
Response:
{
  "suggested": [
    {
      "id": "uuid",
      "title": "Advanced Python",
      "reason": "Based on your interest in programming",
      "estimatedHours": 20
    }
  ]
}
```

**POST /api/v1/paths/:pathId/complete-lesson**
```json
Request:
{
  "lessonId": "lesson-1"
}

Response:
{
  "success": true,
  "xpAwarded": 25,
  "progress": 50
}
```

---

#### Recommendations

**GET /api/v1/recommendations**
```json
Response:
{
  "paths": [ ... ],
  "topics": [ ... ],
  "tutors": [ ... ]
}
```

**GET /api/v1/recommendations/interests**
```json
Response:
{
  "interests": [
    {
      "topic": "Machine Learning",
      "score": 0.85,
      "interactionCount": 25
    }
  ]
}
```

**POST /api/v1/recommendations/clear**
```json
Response:
{
  "success": true,
  "message": "Recommendation data cleared"
}
```

---

#### Activity Tracking

**POST /api/v1/activity/log**
```json
Request:
{
  "activityType": "lesson_completed",
  "activityData": {
    "pathId": "uuid",
    "lessonId": "lesson-1",
    "timeSpent": 300
  }
}

Response:
{
  "success": true
}
```

---

#### Daily Missions

**GET /api/v1/missions/today**
```json
Response:
{
  "mission": {
    "id": "uuid",
    "title": "Complete a Lesson",
    "description": "Finish any lesson to earn XP",
    "emoji": "📚",
    "xpReward": 50,
    "completed": false
  }
}
```

**POST /api/v1/missions/complete**
```json
Request:
{
  "missionId": "uuid"
}

Response:
{
  "success": true,
  "xpAwarded": 50,
  "newStreak": 7
}
```

**GET /api/v1/missions/stats**
```json
Response:
{
  "totalCompleted": 45,
  "currentStreak": 7,
  "longestStreak": 15,
  "totalXpEarned": 2250
}
```

---

#### Tutor System

**POST /api/v1/tutors/upgrade**
```json
Request:
{
  "bio": "Experienced educator...",
  "expertise": ["Math", "Physics"],
  "credentials": "PhD in Mathematics"
}

Response:
{
  "success": true,
  "tutorProfile": { ... }
}
```

**GET /api/v1/tutors/profile**
```json
Response:
{
  "id": "uuid",
  "bio": "Experienced educator...",
  "expertise": ["Math", "Physics"],
  "rating": 4.8,
  "totalStudents": 150,
  "totalPaths": 12
}
```

**PUT /api/v1/tutors/profile**
```json
Request:
{
  "bio": "Updated bio...",
  "socialLinks": {
    "twitter": "@username"
  }
}

Response:
{
  "success": true,
  "profile": { ... }
}
```

**GET /api/v1/tutors/analytics**
```json
Response:
{
  "totalEnrollments": 150,
  "activeStudents": 75,
  "completionRate": 0.68,
  "averageRating": 4.8,
  "pathPerformance": [ ... ]
}
```

**POST /api/v1/tutors/paths**
```json
Request:
{
  "title": "Advanced JavaScript",
  "description": "Deep dive into JS",
  "topic": "Programming",
  "difficultyLevel": "advanced",
  "estimatedHours": 40,
  "lessons": [ ... ],
  "isPublic": true
}

Response:
{
  "success": true,
  "pathId": "uuid"
}
```

**GET /api/v1/tutors/paths**
```json
Response:
{
  "paths": [
    {
      "id": "uuid",
      "title": "Advanced JavaScript",
      "enrollmentCount": 50,
      "rating": 4.7
    }
  ]
}
```

**PUT /api/v1/tutors/paths/:pathId**
```json
Request:
{
  "title": "Updated title",
  "lessons": [ ... ]
}

Response:
{
  "success": true
}
```

**DELETE /api/v1/tutors/paths/:pathId**
```json
Response:
{
  "success": true,
  "message": "Path deleted"
}
```

**GET /api/v1/tutors/discover/paths**
```json
Query params: ?topic=Programming&level=beginner

Response:
{
  "paths": [
    {
      "id": "uuid",
      "title": "Intro to Programming",
      "tutorName": "Jane Doe",
      "rating": 4.9,
      "enrollmentCount": 200
    }
  ]
}
```

---

#### Review System

**GET /api/v1/review/daily**
```json
Response:
{
  "reviews": [
    {
      "id": "uuid",
      "question": "What is quantum entanglement?",
      "hint": "Think about particle connections",
      "topic": "Quantum Physics",
      "emoji": "⚛️"
    }
  ],
  "totalToday": 5,
  "completed": 2
}
```

**POST /api/v1/review/submit**
```json
Request:
{
  "reviewId": "uuid",
  "answer": "Quantum entanglement is..."
}

Response:
{
  "success": true,
  "evaluation": {
    "correct": true,
    "score": 0.95,
    "feedback": "Excellent answer!",
    "xpAwarded": 20
  }
}
```

**GET /api/v1/review/history**
```json
Response:
{
  "reviews": [
    {
      "id": "uuid",
      "question": "...",
      "userAnswer": "...",
      "correct": true,
      "completedAt": "2025-11-26T10:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

**GET /api/v1/review/stats**
```json
Response:
{
  "totalReviews": 150,
  "correctAnswers": 120,
  "accuracyRate": 0.80,
  "currentStreak": 12,
  "totalXpEarned": 3000
}
```

---

#### Debug

**GET /api/v1/debug/list-models**
```json
Response:
{
  "models": [
    "gemini-pro",
    "gemini-pro-vision"
  ]
}
```

---

## Environment Configuration

### Backend Environment Variables

Create `backend/.env` file:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Redis Configuration (optional for BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# File Upload Configuration
MAX_FILE_SIZE=10485760 # 10MB in bytes
ALLOWED_FILE_TYPES=image/*,application/pdf,text/*

# CORS Configuration
CORS_ORIGIN=http://localhost:8081
```

### Frontend Environment Variables

Create `chitchat-app/.env`:

```env
# API Configuration
EXPO_PUBLIC_API_URL=http://localhost:3001

# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Getting API Keys

**Supabase**:
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings > API
4. Copy URL, anon key, and service key

**Google Gemini**:
1. Visit [ai.google.dev](https://ai.google.dev)
2. Get API key from Google AI Studio
3. Enable Gemini API

---

## Deployment

### Backend Deployment (Node.js)

**Recommended Platforms**:
- Railway
- Render
- DigitalOcean App Platform
- AWS ECS
- Heroku

**Deployment Steps**:

1. **Prepare for production**:
   ```bash
   cd backend
   npm install --production
   ```

2. **Set environment variables** in hosting platform

3. **Configure build command**:
   ```bash
   npm install
   ```

4. **Configure start command**:
   ```bash
   npm start
   ```

5. **Enable health checks** at `GET /`

### Frontend Deployment (React Native)

**For iOS**:
```bash
cd chitchat-app
eas build --platform ios
eas submit --platform ios
```

**For Android**:
```bash
cd chitchat-app
eas build --platform android
eas submit --platform android
```

**For Web** (if needed):
```bash
npx expo export:web
```

### Database Migrations

Run migrations in Supabase dashboard:

1. Go to SQL Editor
2. Copy contents of each migration file
3. Execute in order:
   - `create_user_activity_table.sql`
   - `create_daily_missions_table.sql`
   - `create_review_system.sql`
   - `create_tutor_system.sql`
   - `add_media_support_to_chat_messages.sql`
   - `create_save_chat_message_function.sql`
   - `update_save_chat_message_function.sql`

### Supabase Storage Setup

1. Create buckets:
   - `user-uploads`
   - `avatars`

2. Set CORS policies:
   ```json
   {
     "allowedOrigins": ["*"],
     "allowedMethods": ["GET", "POST", "PUT"],
     "allowedHeaders": ["*"],
     "maxAge": 3600
   }
   ```

3. Configure RLS policies (see storage setup guide)

---

## Testing

### Backend Testing

```bash
cd backend
npm test
```

**Test Files**:
- `test-ai.js` - Test AI integration
- Manual API testing with Postman/Insomnia

### Frontend Testing

```bash
cd chitchat-app
npm run lint
```

**Manual Testing**:
1. Start Expo: `npm start`
2. Test on iOS simulator
3. Test on Android emulator
4. Test on physical device

### End-to-End Testing

1. Create account
2. Complete onboarding
3. Send chat message
4. Upload file
5. Generate learning path
6. Complete mission
7. Submit review
8. Upgrade to tutor
9. Create learning path

---

## Feature Checklist

### ✅ Implemented Features

- [x] User Authentication (Supabase Auth)
- [x] Chat System with AI
- [x] File Upload & Media Sharing
- [x] Document Processing (PDF, text)
- [x] Image Analysis
- [x] Learning Path Generation
- [x] Learning Path Progress Tracking
- [x] Daily Missions
- [x] Mission XP Rewards
- [x] Review System (Spaced Repetition)
- [x] AI-Generated Review Questions
- [x] Review Answer Evaluation
- [x] Tutor System
- [x] Tutor Profile Management
- [x] Learning Path Creation (Tutors)
- [x] Public Path Discovery
- [x] Tutor Analytics
- [x] AI Recommendations
- [x] Interest Tracking
- [x] Activity Logging
- [x] Profile Management
- [x] Onboarding Flow
- [x] Curiosity Tiles
- [x] XP System
- [x] Streak Tracking
- [x] Chat Sessions
- [x] Message History
- [x] Media Message Support
- [x] Row Level Security (RLS)

### 🚧 Future Enhancements

- [ ] Push Notifications
- [ ] Real-time Chat
- [ ] Video Lessons
- [ ] Live Tutoring Sessions
- [ ] Payment Integration
- [ ] Subscription Plans
- [ ] Social Features (Following, Comments)
- [ ] Leaderboards
- [ ] Badges & Achievements System
- [ ] Offline Mode
- [ ] Dark Mode (full implementation)
- [ ] Multi-language Support
- [ ] Voice Messages
- [ ] Screen Recording Lessons
- [ ] Quiz Builder
- [ ] Certificate Generation
- [ ] Email Notifications
- [ ] SMS Reminders
- [ ] Calendar Integration
- [ ] Study Groups
- [ ] Discussion Forums

---

## Maintenance & Support

### Regular Maintenance Tasks

**Daily**:
- Monitor error logs
- Check API response times
- Review user feedback

**Weekly**:
- Database backup verification
- Security updates
- Performance optimization

**Monthly**:
- Dependency updates
- Feature usage analytics
- Cost optimization review

### Monitoring

**Key Metrics**:
- API response time
- Error rate
- User engagement
- Conversion rate (free → tutor)
- Daily active users
- Path completion rate

**Tools**:
- Supabase Dashboard
- Gemini API usage dashboard
- Application logs
- User feedback

---

## Contributing

### Development Setup

1. **Clone repository**:
   ```bash
   git clone https://github.com/Mweronevafolds/Chitchat-.git
   cd ChitChat
   ```

2. **Install backend dependencies**:
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**:
   ```bash
   cd ../chitchat-app
   npm install
   ```

4. **Configure environment variables** (see Environment Configuration section)

5. **Run migrations** in Supabase

6. **Start backend**:
   ```bash
   cd backend
   npm run dev
   ```

7. **Start frontend**:
   ```bash
   cd chitchat-app
   npm start
   ```

### Coding Standards

- Use ESLint configuration
- Follow TypeScript best practices
- Write meaningful commit messages
- Document new features
- Add comments for complex logic
- Test before committing

---

## License

Copyright © 2025 ChitChat. All rights reserved.

---

## Contact & Support

**Developer**: Mweronevafolds  
**Repository**: [Chitchat-](https://github.com/Mweronevafolds/Chitchat-)  
**Documentation Version**: 1.0.0  
**Last Updated**: November 26, 2025

---

**End of Documentation**

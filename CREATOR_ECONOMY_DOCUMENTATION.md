# ChitChat Creator Economy - Tutor System

## Overview
The Creator Economy feature enables users to transition from learners to tutors, creating their own AI personas and learning paths for others to consume. This transforms ChitChat into a two-sided marketplace where knowledge creators can share their expertise.

## Architecture

### Backend Components

#### 1. Tutor Controller (`backend/controllers/tutorController.js`)
Handles all tutor-related business logic:
- **upgradeTutor**: Converts a regular user to tutor status
- **getTutorProfile**: Retrieves tutor profile information
- **updateTutorProfile**: Updates tutor profile (bio, expertise, AI persona)
- **createLearningPath**: Creates new learning paths
- **getMyLearningPaths**: Retrieves tutor's learning paths
- **updateLearningPath**: Updates existing learning path
- **deleteLearningPath**: Removes a learning path
- **getTutorAnalytics**: Provides performance metrics and statistics
- **getPublicLearningPaths**: Discovery endpoint for browsing public paths

#### 2. Tutor Routes (`backend/routes/tutorRoutes.js`)
RESTful API endpoints:
```
POST   /api/v1/tutors/upgrade           - Upgrade to tutor
GET    /api/v1/tutors/profile            - Get tutor profile
PUT    /api/v1/tutors/profile            - Update tutor profile
GET    /api/v1/tutors/analytics          - Get analytics
POST   /api/v1/tutors/paths              - Create learning path
GET    /api/v1/tutors/paths              - Get my learning paths
PUT    /api/v1/tutors/paths/:pathId      - Update learning path
DELETE /api/v1/tutors/paths/:pathId      - Delete learning path
GET    /api/v1/tutors/discover/paths     - Browse public paths
```

#### 3. Database Schema

**tutor_profiles table**:
```sql
- id (UUID, primary key)
- user_id (UUID, references auth.users)
- expertise (TEXT[])
- teaching_style (TEXT)
- bio (TEXT)
- ai_persona (JSONB)
- total_students (INTEGER)
- total_paths (INTEGER)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**tutor_learning_paths table**:
```sql
- id (UUID, primary key)
- tutor_id (UUID, references auth.users)
- title (TEXT)
- description (TEXT)
- category (TEXT)
- difficulty (TEXT)
- estimated_duration (INTEGER)
- topics (TEXT[])
- is_public (BOOLEAN)
- enrollment_count (INTEGER)
- completion_count (INTEGER)
- rating (DECIMAL)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Frontend Components

#### 1. Tutor Onboarding (`app/tutor-onboarding.tsx`)
Multi-step wizard that captures:
- **Step 1**: Areas of expertise (up to 5)
- **Step 2**: Teaching style (conversational, structured, socratic, practical)
- **Step 3**: Bio/About section
- **Step 4**: AI Persona configuration (tone and formality)

Features:
- Progress indicator
- Form validation
- Smooth navigation between steps
- Visual feedback for selections

#### 2. Tutor Dashboard (`app/tutor/dashboard.tsx`)
Main control center with three tabs:

**Overview Tab**:
- Performance metrics (students, paths, enrollments, rating)
- Completion rate analytics
- Top performing paths

**Paths Tab**:
- List of all learning paths
- Create, edit, and delete functionality
- Status indicators (public/draft)
- Engagement metrics per path

**Profile Tab**:
- View tutor profile details
- Expertise tags
- AI persona settings
- Edit profile button

#### 3. Profile Integration
Added "Creator Studio" section in the Profile tab:
- Dynamic button that shows:
  - "Become a Tutor" for regular users
  - "My Creator Studio" for existing tutors
- Gradient icon design
- Routes to appropriate screen based on user role

## User Flow

### Becoming a Tutor
1. User navigates to Profile tab
2. Taps on "Become a Tutor" in Creator Studio section
3. Goes through 4-step onboarding process
4. Upon completion, user role is upgraded to 'tutor'
5. Redirected to Tutor Dashboard

### Managing Content
1. Tutor accesses dashboard via Profile > Creator Studio
2. Can create new learning paths with:
   - Title and description
   - Category and difficulty level
   - Estimated duration
   - Topics list
   - Public/private visibility
3. View analytics and performance metrics
4. Edit or delete existing paths
5. Update tutor profile and AI persona settings

### Discovery (Future)
- Public learning paths can be browsed by all users
- Filter by category, difficulty, or search
- Enroll in paths created by tutors
- Rate and review completed paths

## AI Persona Configuration

Tutors can customize how their AI assistant interacts with students:

**Tone Options**:
- Friendly 😊
- Professional 💼
- Enthusiastic 🎉
- Calm 😌

**Formality Levels**:
- Casual
- Balanced
- Formal

**Teaching Styles**:
- Conversational: Friendly and casual
- Structured: Step-by-step guidance
- Socratic: Question-based learning
- Practical: Hands-on and project-based

## Security & Permissions

### Row Level Security (RLS)
- Users can only view/edit their own tutor profile
- Only tutors can create learning paths
- Public paths visible to everyone
- Private paths only visible to creator

### Authentication
All tutor endpoints require valid JWT authentication via `authMiddleware`.

## Testing Checklist

### Backend
- [ ] User can upgrade to tutor role
- [ ] Tutor profile is created successfully
- [ ] Learning paths can be created, read, updated, deleted
- [ ] Analytics return correct metrics
- [ ] Public paths are discoverable
- [ ] RLS policies prevent unauthorized access

### Frontend
- [ ] Onboarding wizard completes successfully
- [ ] All form validations work correctly
- [ ] Dashboard loads tutor data
- [ ] Tab navigation works smoothly
- [ ] Profile integration button appears
- [ ] Correct routing based on user role

### Integration
- [ ] Backend server restarts successfully
- [ ] Database migrations run without errors
- [ ] API endpoints respond correctly
- [ ] Frontend connects to backend successfully

## Setup Instructions

### 1. Backend Setup
```bash
cd backend
# Routes are already registered in server.js
node server.js
```

### 2. Database Migration
Run the SQL migration in Supabase:
```sql
-- Execute: backend/migrations/create_tutor_system.sql
```

### 3. Frontend Setup
```bash
cd chitchat-app
npm install
npm start
```

### 4. Test the Feature
1. Log in as a user
2. Navigate to Profile tab
3. Tap "Become a Tutor"
4. Complete onboarding
5. Access Creator Studio dashboard
6. Create a test learning path

## API Examples

### Upgrade to Tutor
```javascript
POST /api/v1/tutors/upgrade
Headers: Authorization: Bearer <token>
Body: {
  "expertise": ["Programming", "Data Science"],
  "teachingStyle": "conversational",
  "bio": "I'm passionate about teaching...",
  "aiPersona": {
    "tone": "friendly",
    "style": "conversational",
    "formality": "casual"
  }
}
```

### Create Learning Path
```javascript
POST /api/v1/tutors/paths
Headers: Authorization: Bearer <token>
Body: {
  "title": "JavaScript Fundamentals",
  "description": "Learn JavaScript from scratch",
  "category": "Programming",
  "difficulty": "beginner",
  "estimatedDuration": 30,
  "topics": ["Variables", "Functions", "Objects"],
  "isPublic": true
}
```

## Future Enhancements

### Phase 2
- [ ] Student enrollment system
- [ ] Progress tracking for enrolled students
- [ ] Review and rating system
- [ ] Tutor earnings/monetization
- [ ] Content moderation tools

### Phase 3
- [ ] Live sessions with AI tutors
- [ ] Certificate generation
- [ ] Collaborative learning paths
- [ ] Advanced analytics dashboard
- [ ] Marketing tools for tutors

## Known Limitations

1. No enrollment system yet (students can't join paths)
2. Analytics are calculated but not tracked in real-time
3. No payment/monetization system
4. No content moderation or approval workflow
5. Learning paths don't have detailed curriculum builder yet

## Troubleshooting

### Issue: Routes not working
**Solution**: Ensure server.js has been updated with tutorRoutes import and registration

### Issue: Database errors
**Solution**: Run the migration file in Supabase SQL editor

### Issue: TypeScript errors in frontend
**Solution**: Ensure all dependencies are installed (`npm install`)

### Issue: 403 Forbidden on tutor endpoints
**Solution**: Check that user has been upgraded to tutor role in database

## Performance Considerations

- Indexes created on frequently queried columns
- RLS policies optimized for performance
- Analytics endpoint caches common queries (future optimization)
- Pagination implemented for large path lists

## Maintenance

### Regular Tasks
- Monitor tutor profile completeness
- Track learning path engagement metrics
- Review and moderate public content
- Analyze tutor retention and activity

### Scaling Considerations
- Add caching layer for popular learning paths
- Implement CDN for media content
- Consider read replicas for analytics queries
- Archive inactive tutor profiles

---

## Quick Reference

### File Structure
```
backend/
  controllers/
    tutorController.js         ← All tutor logic
  routes/
    tutorRoutes.js            ← API endpoints
  migrations/
    create_tutor_system.sql   ← Database schema
  server.js                   ← Routes registered here

chitchat-app/
  app/
    tutor-onboarding.tsx      ← Onboarding wizard
    tutor/
      dashboard.tsx           ← Main dashboard
    (tabs)/
      profile.tsx             ← Updated with Creator Studio button
```

### Key Concepts
- **Learner**: Default user role, consumes content
- **Tutor**: Upgraded role, creates content
- **Learning Path**: Structured content created by tutors
- **AI Persona**: Customized teaching assistant configuration
- **Creator Studio**: Tutor's control center

---

**Built with ❤️ for the ChitChat Creator Community**

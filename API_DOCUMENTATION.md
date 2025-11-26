# ChitChat API Documentation

**Version**: 1.0.0  
**Base URL**: `http://localhost:3001/api/v1`  
**Production URL**: `https://your-domain.com/api/v1`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Error Handling](#error-handling)
3. [Rate Limiting](#rate-limiting)
4. [Chat Endpoints](#chat-endpoints)
5. [File Upload Endpoints](#file-upload-endpoints)
6. [Profile Endpoints](#profile-endpoints)
7. [Curiosity Tiles Endpoints](#curiosity-tiles-endpoints)
8. [Learning Path Endpoints](#learning-path-endpoints)
9. [Recommendation Endpoints](#recommendation-endpoints)
10. [Activity Tracking Endpoints](#activity-tracking-endpoints)
11. [Daily Mission Endpoints](#daily-mission-endpoints)
12. [Tutor Endpoints](#tutor-endpoints)
13. [Review System Endpoints](#review-system-endpoints)
14. [Debug Endpoints](#debug-endpoints)

---

## Authentication

All endpoints (except debug endpoints) require authentication using Supabase JWT tokens.

### Request Headers

```http
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

### Getting Authentication Token

1. **Sign up/Login** via Supabase Auth in the mobile app
2. Token is automatically stored in AsyncStorage
3. Token is included in all API requests

### Token Validation

- Backend validates token using `authMiddleware.js`
- Invalid/expired tokens return `401 Unauthorized`
- Token format: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

## Error Handling

### Standard Error Response

```json
{
  "error": "Error message",
  "details": "Additional information (optional)",
  "code": "ERROR_CODE"
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

---

## Rate Limiting

**Current Implementation**: No rate limiting (development)

**Recommended Production Limits**:
- General endpoints: 100 requests/minute
- AI generation endpoints: 10 requests/minute
- File upload endpoints: 20 requests/hour

---

## Chat Endpoints

### POST /chat

Create a new chat message and get AI response.

**Authentication**: Required

**Request Body**:
```json
{
  "message": "string (required)",
  "sessionId": "uuid (optional)",
  "context": "string (optional)"
}
```

**Example Request**:
```json
{
  "message": "Explain quantum computing in simple terms",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Success Response** (200 OK):
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "response": "Quantum computing is a type of computing that uses quantum mechanics...",
  "messageId": "660e8400-e29b-41d4-a716-446655440001",
  "timestamp": "2025-11-26T10:30:00Z"
}
```

**Error Responses**:
- `400`: Missing message field
- `401`: Unauthorized
- `500`: AI generation error

---

### GET /chat/sessions

Get list of all user's chat sessions.

**Authentication**: Required

**Query Parameters**: None

**Success Response** (200 OK):
```json
{
  "sessions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Quantum Physics Discussion",
      "lastMessage": "Thanks for explaining!",
      "updatedAt": "2025-11-26T10:30:00Z",
      "messageCount": 15
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "title": "Machine Learning Basics",
      "lastMessage": "What is supervised learning?",
      "updatedAt": "2025-11-25T14:20:00Z",
      "messageCount": 8
    }
  ],
  "total": 2
}
```

---

### GET /chat/:sessionId/messages

Get all messages for a specific chat session.

**Authentication**: Required

**URL Parameters**:
- `sessionId` (uuid): Session identifier

**Query Parameters**:
- `limit` (integer, optional): Number of messages to return (default: 50)
- `offset` (integer, optional): Pagination offset (default: 0)

**Example Request**:
```http
GET /api/v1/chat/550e8400-e29b-41d4-a716-446655440000/messages?limit=20&offset=0
```

**Success Response** (200 OK):
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "messages": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "content": "What is quantum computing?",
      "role": "user",
      "mediaUrl": null,
      "mediaType": null,
      "createdAt": "2025-11-26T10:25:00Z"
    },
    {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "content": "Quantum computing is...",
      "role": "assistant",
      "mediaUrl": null,
      "mediaType": null,
      "createdAt": "2025-11-26T10:25:15Z"
    }
  ],
  "total": 15,
  "hasMore": false
}
```

**Error Responses**:
- `404`: Session not found
- `403`: Session doesn't belong to user

---

### POST /chat/upload

Upload a file for chat context (images, documents).

**Authentication**: Required

**Content-Type**: `multipart/form-data`

**Form Data**:
- `file`: File binary data
- `sessionId` (optional): Session to attach file to

**Example Request**:
```http
POST /api/v1/chat/upload
Content-Type: multipart/form-data

file: [binary data]
sessionId: 550e8400-e29b-41d4-a716-446655440000
```

**Success Response** (200 OK):
```json
{
  "fileUrl": "https://your-project.supabase.co/storage/v1/object/public/user-uploads/...",
  "fileType": "document",
  "fileName": "document.pdf",
  "fileSize": 1024000,
  "analysis": "This document discusses quantum mechanics and covers topics including...",
  "messageId": "990e8400-e29b-41d4-a716-446655440004"
}
```

**Supported File Types**:
- Images: JPG, PNG, GIF, WebP
- Documents: PDF, TXT, DOCX, MD
- Videos: MP4, MOV, WebM

**File Size Limits**:
- Images: 5 MB
- Documents: 10 MB
- Videos: 50 MB

---

## File Upload Endpoints

### POST /upload/init

Initialize a file upload and get signed URL.

**Authentication**: Required

**Request Body**:
```json
{
  "fileName": "string (required)",
  "fileType": "string (required)",
  "fileSize": "number (required)"
}
```

**Example Request**:
```json
{
  "fileName": "presentation.pdf",
  "fileType": "application/pdf",
  "fileSize": 2048000
}
```

**Success Response** (200 OK):
```json
{
  "uploadUrl": "https://your-project.supabase.co/storage/v1/object/user-uploads/...",
  "uploadId": "aa0e8400-e29b-41d4-a716-446655440005",
  "path": "user-uploads/user-123/documents/presentation.pdf",
  "expiresAt": "2025-11-26T11:30:00Z"
}
```

---

### POST /upload/complete

Mark upload as complete and get public URL.

**Authentication**: Required

**Request Body**:
```json
{
  "uploadId": "string (required)",
  "path": "string (required)"
}
```

**Example Request**:
```json
{
  "uploadId": "aa0e8400-e29b-41d4-a716-446655440005",
  "path": "user-uploads/user-123/documents/presentation.pdf"
}
```

**Success Response** (200 OK):
```json
{
  "fileId": "bb0e8400-e29b-41d4-a716-446655440006",
  "fileUrl": "https://your-project.supabase.co/storage/v1/object/public/user-uploads/...",
  "fileName": "presentation.pdf",
  "fileType": "application/pdf",
  "fileSize": 2048000,
  "createdAt": "2025-11-26T10:35:00Z"
}
```

---

## Profile Endpoints

### GET /profiles/me

Get current user's profile information.

**Authentication**: Required

**Success Response** (200 OK):
```json
{
  "id": "user-123",
  "email": "user@example.com",
  "displayName": "John Doe",
  "avatarUrl": "https://...",
  "bio": "Learning enthusiast passionate about technology",
  "xp": 1250,
  "level": 5,
  "isTutor": false,
  "interests": ["AI", "Programming", "Design"],
  "preferences": {
    "theme": "dark",
    "notifications": true,
    "language": "en"
  },
  "stats": {
    "pathsCompleted": 5,
    "missionsCompleted": 30,
    "reviewsCompleted": 45,
    "currentStreak": 7,
    "totalXp": 1250
  },
  "createdAt": "2025-10-01T10:00:00Z",
  "updatedAt": "2025-11-26T10:00:00Z"
}
```

---

### POST /profiles/onboard

Complete user onboarding with preferences.

**Authentication**: Required

**Request Body**:
```json
{
  "displayName": "string (required)",
  "interests": "array of strings (required)",
  "learningGoals": "string (optional)",
  "experienceLevel": "string (optional)"
}
```

**Example Request**:
```json
{
  "displayName": "John Doe",
  "interests": ["AI", "Programming", "Machine Learning"],
  "learningGoals": "Master web development and AI",
  "experienceLevel": "intermediate"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "profile": {
    "id": "user-123",
    "displayName": "John Doe",
    "interests": ["AI", "Programming", "Machine Learning"],
    "xp": 100
  }
}
```

---

## Curiosity Tiles Endpoints

### POST /tiles

Generate personalized curiosity tiles.

**Authentication**: Required

**Request Body**:
```json
{
  "count": "number (optional, default: 6)"
}
```

**Example Request**:
```json
{
  "count": 6
}
```

**Success Response** (200 OK):
```json
{
  "tiles": [
    {
      "id": "tile-1",
      "emoji": "🧬",
      "title": "DNA and Genetics",
      "description": "Explore the building blocks of life and how genetic information is passed on",
      "topic": "Biology",
      "difficulty": "intermediate",
      "estimatedTime": 15
    },
    {
      "id": "tile-2",
      "emoji": "🤖",
      "title": "Neural Networks",
      "description": "Understand how artificial brains learn and make decisions",
      "topic": "AI",
      "difficulty": "advanced",
      "estimatedTime": 20
    }
  ]
}
```

---

## Learning Path Endpoints

### POST /paths/generate

Generate a personalized learning path using AI.

**Authentication**: Required

**Request Body**:
```json
{
  "topic": "string (required)",
  "level": "string (optional, default: beginner)",
  "goals": "string (optional)",
  "estimatedHours": "number (optional)"
}
```

**Example Request**:
```json
{
  "topic": "Machine Learning",
  "level": "beginner",
  "goals": "Build and deploy ML models",
  "estimatedHours": 40
}
```

**Success Response** (200 OK):
```json
{
  "pathId": "path-123",
  "path": {
    "id": "path-123",
    "title": "Machine Learning Fundamentals",
    "description": "Comprehensive introduction to ML concepts and practical applications",
    "topic": "Machine Learning",
    "difficultyLevel": "beginner",
    "estimatedHours": 40,
    "lessons": [
      {
        "id": "lesson-1",
        "title": "Introduction to Machine Learning",
        "content": "Learn the basics of ML...",
        "duration": 30,
        "resources": [
          {
            "type": "video",
            "url": "https://...",
            "title": "ML Overview"
          }
        ]
      }
    ],
    "createdAt": "2025-11-26T10:40:00Z"
  }
}
```

---

### GET /paths

Get all user's learning paths.

**Authentication**: Required

**Query Parameters**:
- `status` (string, optional): Filter by status (active, completed)
- `limit` (number, optional): Results per page (default: 10)
- `offset` (number, optional): Pagination offset

**Success Response** (200 OK):
```json
{
  "paths": [
    {
      "id": "path-123",
      "title": "Machine Learning Fundamentals",
      "description": "Comprehensive intro to ML",
      "topic": "Machine Learning",
      "progress": 45,
      "lessonsCompleted": 3,
      "totalLessons": 10,
      "estimatedHours": 40,
      "timeSpent": 18,
      "createdAt": "2025-11-20T10:00:00Z",
      "updatedAt": "2025-11-26T10:00:00Z"
    }
  ],
  "total": 1
}
```

---

### GET /paths/suggested

Get AI-suggested learning paths based on user profile.

**Authentication**: Required

**Success Response** (200 OK):
```json
{
  "suggested": [
    {
      "id": "path-456",
      "title": "Advanced Python Programming",
      "description": "Deep dive into Python",
      "topic": "Programming",
      "difficultyLevel": "advanced",
      "estimatedHours": 30,
      "reason": "Based on your completed Python basics path and interest in programming",
      "matchScore": 0.92
    }
  ]
}
```

---

### POST /paths/:pathId/complete-lesson

Mark a lesson as completed.

**Authentication**: Required

**URL Parameters**:
- `pathId` (uuid): Path identifier

**Request Body**:
```json
{
  "lessonId": "string (required)",
  "timeSpent": "number (optional)",
  "quizScore": "number (optional)"
}
```

**Example Request**:
```json
{
  "lessonId": "lesson-1",
  "timeSpent": 35,
  "quizScore": 0.9
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "xpAwarded": 25,
  "progress": 50,
  "completedLessons": 5,
  "totalLessons": 10,
  "nextLesson": {
    "id": "lesson-6",
    "title": "Neural Network Basics"
  }
}
```

---

## Recommendation Endpoints

### GET /recommendations

Get personalized content recommendations.

**Authentication**: Required

**Query Parameters**:
- `type` (string, optional): Filter by type (paths, topics, tutors)
- `limit` (number, optional): Results per page

**Success Response** (200 OK):
```json
{
  "paths": [
    {
      "id": "path-789",
      "title": "Data Structures & Algorithms",
      "reason": "Complements your programming skills",
      "matchScore": 0.88
    }
  ],
  "topics": [
    {
      "topic": "Computer Vision",
      "description": "Explore how computers see",
      "relevance": 0.85
    }
  ],
  "tutors": [
    {
      "id": "tutor-123",
      "name": "Jane Smith",
      "expertise": ["AI", "Machine Learning"],
      "rating": 4.9,
      "reason": "Expert in your areas of interest"
    }
  ]
}
```

---

### GET /recommendations/interests

View tracked user interests.

**Authentication**: Required

**Success Response** (200 OK):
```json
{
  "interests": [
    {
      "topic": "Machine Learning",
      "score": 0.92,
      "interactionCount": 45,
      "lastInteraction": "2025-11-26T10:00:00Z",
      "trending": "up"
    },
    {
      "topic": "Web Development",
      "score": 0.78,
      "interactionCount": 23,
      "lastInteraction": "2025-11-25T15:00:00Z",
      "trending": "stable"
    }
  ]
}
```

---

### POST /recommendations/clear

Clear all recommendation data.

**Authentication**: Required

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Recommendation data cleared successfully"
}
```

---

## Activity Tracking Endpoints

### POST /activity/log

Log user activity for analytics.

**Authentication**: Required

**Request Body**:
```json
{
  "activityType": "string (required)",
  "activityData": "object (optional)"
}
```

**Activity Types**:
- `lesson_completed`
- `mission_completed`
- `review_submitted`
- `chat_message_sent`
- `path_enrolled`
- `file_uploaded`

**Example Request**:
```json
{
  "activityType": "lesson_completed",
  "activityData": {
    "pathId": "path-123",
    "lessonId": "lesson-5",
    "timeSpent": 42,
    "score": 0.95
  }
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "activityId": "activity-123"
}
```

---

## Daily Mission Endpoints

### GET /missions/today

Get today's daily mission.

**Authentication**: Required

**Success Response** (200 OK):
```json
{
  "mission": {
    "id": "mission-123",
    "date": "2025-11-26",
    "title": "Complete a Learning Lesson",
    "description": "Finish any lesson from your active learning paths to earn XP",
    "emoji": "📚",
    "missionType": "lesson_completion",
    "xpReward": 50,
    "completed": false,
    "progress": {
      "current": 0,
      "required": 1
    }
  },
  "streak": {
    "current": 7,
    "longest": 15
  }
}
```

---

### POST /missions/complete

Mark mission as completed.

**Authentication**: Required

**Request Body**:
```json
{
  "missionId": "string (required)"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "xpAwarded": 50,
  "bonusXp": 10,
  "totalXp": 60,
  "newStreak": 8,
  "streakBonus": true,
  "message": "Great job! 8 day streak!"
}
```

---

### GET /missions/stats

Get user's mission statistics.

**Authentication**: Required

**Success Response** (200 OK):
```json
{
  "totalCompleted": 45,
  "currentStreak": 7,
  "longestStreak": 15,
  "totalXpEarned": 2700,
  "completionRate": 0.89,
  "recentMissions": [
    {
      "date": "2025-11-26",
      "title": "Complete a Lesson",
      "completed": true,
      "xpEarned": 60
    }
  ]
}
```

---

## Tutor Endpoints

### POST /tutors/upgrade

Upgrade user to tutor status.

**Authentication**: Required

**Request Body**:
```json
{
  "bio": "string (required)",
  "expertise": "array of strings (required)",
  "credentials": "string (optional)",
  "socialLinks": "object (optional)"
}
```

**Example Request**:
```json
{
  "bio": "Experienced educator with 10+ years in mathematics and computer science",
  "expertise": ["Mathematics", "Computer Science", "Physics"],
  "credentials": "PhD in Mathematics, Stanford University",
  "socialLinks": {
    "twitter": "@johndoe",
    "linkedin": "linkedin.com/in/johndoe"
  }
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "tutorProfile": {
    "id": "tutor-123",
    "userId": "user-123",
    "bio": "Experienced educator...",
    "expertise": ["Mathematics", "Computer Science"],
    "rating": 0,
    "totalStudents": 0,
    "totalPaths": 0
  }
}
```

---

### GET /tutors/profile

Get tutor profile information.

**Authentication**: Required (must be tutor)

**Success Response** (200 OK):
```json
{
  "id": "tutor-123",
  "userId": "user-123",
  "displayName": "John Doe",
  "avatarUrl": "https://...",
  "bio": "Experienced educator...",
  "expertise": ["Mathematics", "Computer Science"],
  "credentials": "PhD in Mathematics",
  "rating": 4.8,
  "totalStudents": 250,
  "totalPaths": 12,
  "socialLinks": {
    "twitter": "@johndoe"
  },
  "createdAt": "2025-11-01T10:00:00Z"
}
```

---

### PUT /tutors/profile

Update tutor profile.

**Authentication**: Required (must be tutor)

**Request Body**:
```json
{
  "bio": "string (optional)",
  "expertise": "array of strings (optional)",
  "credentials": "string (optional)",
  "socialLinks": "object (optional)"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "profile": { /* updated profile */ }
}
```

---

### GET /tutors/analytics

Get tutor analytics and statistics.

**Authentication**: Required (must be tutor)

**Query Parameters**:
- `period` (string, optional): Time period (week, month, year, all)

**Success Response** (200 OK):
```json
{
  "overview": {
    "totalEnrollments": 250,
    "activeStudents": 125,
    "completionRate": 0.68,
    "averageRating": 4.8,
    "totalRevenue": 0
  },
  "pathPerformance": [
    {
      "pathId": "path-123",
      "title": "Advanced Mathematics",
      "enrollments": 80,
      "completions": 54,
      "averageRating": 4.9,
      "revenue": 0
    }
  ],
  "recentActivity": [
    {
      "type": "enrollment",
      "pathTitle": "Advanced Mathematics",
      "studentName": "Jane Smith",
      "timestamp": "2025-11-26T09:00:00Z"
    }
  ],
  "trends": {
    "enrollmentsThisWeek": 15,
    "growthRate": 0.12
  }
}
```

---

### POST /tutors/paths

Create a new learning path (tutor only).

**Authentication**: Required (must be tutor)

**Request Body**:
```json
{
  "title": "string (required)",
  "description": "string (required)",
  "topic": "string (required)",
  "difficultyLevel": "string (required)",
  "estimatedHours": "number (required)",
  "lessons": "array (required)",
  "isPublic": "boolean (optional)",
  "price": "number (optional)"
}
```

**Example Request**:
```json
{
  "title": "Advanced JavaScript Patterns",
  "description": "Master advanced JS concepts and design patterns",
  "topic": "Programming",
  "difficultyLevel": "advanced",
  "estimatedHours": 35,
  "lessons": [
    {
      "id": "lesson-1",
      "title": "Closures and Scope",
      "content": "Deep dive into JavaScript closures...",
      "duration": 45,
      "resources": []
    }
  ],
  "isPublic": true,
  "price": 0
}
```

**Success Response** (201 Created):
```json
{
  "success": true,
  "pathId": "path-789",
  "path": { /* full path object */ }
}
```

---

### GET /tutors/paths

Get tutor's learning paths.

**Authentication**: Required (must be tutor)

**Success Response** (200 OK):
```json
{
  "paths": [
    {
      "id": "path-789",
      "title": "Advanced JavaScript Patterns",
      "enrollmentCount": 45,
      "completionCount": 30,
      "rating": 4.7,
      "isPublic": true,
      "createdAt": "2025-11-15T10:00:00Z"
    }
  ],
  "total": 1
}
```

---

### PUT /tutors/paths/:pathId

Update a learning path.

**Authentication**: Required (must be tutor and path owner)

**Request Body**: Same as create path

**Success Response** (200 OK):
```json
{
  "success": true,
  "path": { /* updated path */ }
}
```

---

### DELETE /tutors/paths/:pathId

Delete a learning path.

**Authentication**: Required (must be tutor and path owner)

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Learning path deleted successfully"
}
```

---

### GET /tutors/discover/paths

Discover public learning paths from tutors.

**Authentication**: Required

**Query Parameters**:
- `topic` (string, optional): Filter by topic
- `level` (string, optional): Filter by difficulty
- `search` (string, optional): Search query
- `sortBy` (string, optional): Sort by (rating, popular, recent)
- `limit` (number, optional): Results per page
- `offset` (number, optional): Pagination offset

**Success Response** (200 OK):
```json
{
  "paths": [
    {
      "id": "path-789",
      "title": "Advanced JavaScript Patterns",
      "description": "Master advanced JS concepts",
      "tutorId": "tutor-123",
      "tutorName": "John Doe",
      "tutorRating": 4.8,
      "topic": "Programming",
      "difficultyLevel": "advanced",
      "estimatedHours": 35,
      "enrollmentCount": 45,
      "rating": 4.7,
      "price": 0
    }
  ],
  "total": 1
}
```

---

## Review System Endpoints

### GET /review/daily

Get today's daily review questions.

**Authentication**: Required

**Success Response** (200 OK):
```json
{
  "reviews": [
    {
      "id": "review-123",
      "question": "What is the time complexity of binary search?",
      "hint": "Think about how the search space is divided",
      "topic": "Algorithms",
      "emoji": "🔍",
      "createdAt": "2025-11-26T00:00:00Z"
    },
    {
      "id": "review-124",
      "question": "Explain the concept of closures in JavaScript",
      "hint": "Consider function scope and variable access",
      "topic": "JavaScript",
      "emoji": "🎯",
      "createdAt": "2025-11-26T00:00:00Z"
    }
  ],
  "totalToday": 5,
  "completed": 2,
  "remaining": 3,
  "streak": {
    "current": 12,
    "longest": 25
  }
}
```

---

### POST /review/submit

Submit answer to a review question.

**Authentication**: Required

**Request Body**:
```json
{
  "reviewId": "string (required)",
  "answer": "string (required)"
}
```

**Example Request**:
```json
{
  "reviewId": "review-123",
  "answer": "Binary search has O(log n) time complexity because it divides the search space in half with each iteration"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "evaluation": {
    "correct": true,
    "score": 0.95,
    "feedback": "Excellent answer! You correctly identified the time complexity and explained the reasoning.",
    "xpAwarded": 20,
    "keyPoints": [
      "Correct time complexity",
      "Good explanation of divide-and-conquer"
    ]
  },
  "newXp": 1270,
  "streakUpdated": true
}
```

---

### GET /review/history

Get review history and past performance.

**Authentication**: Required

**Query Parameters**:
- `limit` (number, optional): Results per page
- `offset` (number, optional): Pagination offset
- `topic` (string, optional): Filter by topic

**Success Response** (200 OK):
```json
{
  "reviews": [
    {
      "id": "review-123",
      "question": "What is the time complexity of binary search?",
      "topic": "Algorithms",
      "userAnswer": "O(log n)...",
      "correct": true,
      "score": 0.95,
      "xpEarned": 20,
      "completedAt": "2025-11-26T10:15:00Z"
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### GET /review/stats

Get overall review statistics.

**Authentication**: Required

**Success Response** (200 OK):
```json
{
  "totalReviews": 150,
  "correctAnswers": 128,
  "accuracyRate": 0.85,
  "currentStreak": 12,
  "longestStreak": 25,
  "totalXpEarned": 3040,
  "averageScore": 0.87,
  "topicBreakdown": [
    {
      "topic": "Algorithms",
      "total": 45,
      "correct": 38,
      "accuracy": 0.84
    },
    {
      "topic": "JavaScript",
      "total": 30,
      "correct": 27,
      "accuracy": 0.90
    }
  ],
  "recentActivity": [
    {
      "date": "2025-11-26",
      "completed": 3,
      "correct": 3,
      "xpEarned": 60
    }
  ]
}
```

---

## Debug Endpoints

### GET /debug/list-models

List available AI models (no authentication required).

**Authentication**: Not required

**Success Response** (200 OK):
```json
{
  "models": [
    "gemini-pro",
    "gemini-pro-vision"
  ],
  "defaultModel": "gemini-pro"
}
```

---

## Webhook Events (Future)

### Planned Webhook Events

- `user.created` - New user registration
- `mission.completed` - Daily mission completed
- `path.completed` - Learning path finished
- `review.submitted` - Review answer submitted
- `tutor.upgraded` - User became tutor
- `enrollment.created` - Student enrolled in path

---

## Best Practices

### Request Optimization

1. **Pagination**: Use `limit` and `offset` for large datasets
2. **Filtering**: Apply filters server-side
3. **Caching**: Cache responses when appropriate
4. **Batch Requests**: Group related operations

### Error Handling

```javascript
try {
  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  
  return data;
} catch (error) {
  console.error('API Error:', error);
  // Handle error appropriately
}
```

### Authentication

```javascript
const token = await getStoredToken();

const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
});
```

---

## Changelog

### Version 1.0.0 (2025-11-26)
- Initial API documentation
- All core endpoints documented
- Authentication flow documented
- Error handling standardized

---

**End of API Documentation**

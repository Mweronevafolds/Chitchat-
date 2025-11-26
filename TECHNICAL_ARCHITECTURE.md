# ChitChat - Technical Architecture Documentation

**Version**: 1.0.0  
**Last Updated**: November 26, 2025

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Technology Stack](#technology-stack)
3. [Database Design](#database-design)
4. [AI Integration Architecture](#ai-integration-architecture)
5. [Authentication & Security](#authentication--security)
6. [File Storage Architecture](#file-storage-architecture)
7. [API Layer](#api-layer)
8. [Frontend Architecture](#frontend-architecture)
9. [State Management](#state-management)
10. [Scalability Considerations](#scalability-considerations)
11. [Performance Optimization](#performance-optimization)
12. [Security Best Practices](#security-best-practices)
13. [Deployment Architecture](#deployment-architecture)

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Mobile Application                     │
│              (React Native + Expo)                       │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │  Screens │  │Components│  │ Services │            │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘            │
│       │             │              │                   │
│       └─────────────┴──────────────┘                   │
│                     │                                   │
└─────────────────────┼───────────────────────────────────┘
                      │
                      │ HTTPS/REST
                      │
┌─────────────────────▼───────────────────────────────────┐
│              Backend API Server (Express)                │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │             Middleware Layer                      │  │
│  │  • Authentication  • CORS  • Body Parser         │  │
│  └──────────────────┬───────────────────────────────┘  │
│                     │                                   │
│  ┌──────────────────▼───────────────────────────────┐  │
│  │             Routing Layer                         │  │
│  │  • Chat  • Upload  • Profile  • Learning         │  │
│  └──────────────────┬───────────────────────────────┘  │
│                     │                                   │
│  ┌──────────────────▼───────────────────────────────┐  │
│  │          Controller Layer                         │  │
│  │  • Business Logic  • Validation  • Processing    │  │
│  └──────────────────┬───────────────────────────────┘  │
└─────────────────────┼───────────────────────────────────┘
                      │
       ┌──────────────┼──────────────┐
       │              │               │
       ▼              ▼               ▼
┌────────────┐  ┌──────────┐  ┌────────────┐
│  Supabase  │  │  Gemini  │  │   Redis    │
│            │  │    AI    │  │  (Future)  │
│ • Database │  │          │  │            │
│ • Auth     │  │ • Text   │  │ • Queue    │
│ • Storage  │  │ • Vision │  │ • Cache    │
└────────────┘  └──────────┘  └────────────┘
```

### Component Interaction Flow

**User Action → Response Flow**:

1. **User Interaction** (Mobile App)
   - User taps button/types message
   - UI component triggers action

2. **API Request** (Frontend Service)
   - Construct HTTP request
   - Add authentication token
   - Send to backend

3. **Authentication** (Backend Middleware)
   - Validate JWT token
   - Extract user information
   - Attach to request object

4. **Routing** (Express Router)
   - Match URL pattern
   - Route to appropriate controller

5. **Business Logic** (Controller)
   - Process request
   - Validate input
   - Call external services (AI, DB)

6. **Data Layer** (Supabase/AI)
   - Query/update database
   - Generate AI responses
   - Store files

7. **Response** (Back through stack)
   - Format response
   - Return to frontend
   - Update UI

---

## Technology Stack

### Backend Technologies

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Runtime | Node.js | 18+ | JavaScript runtime |
| Framework | Express.js | 4.19+ | Web framework |
| Database | PostgreSQL (Supabase) | 15+ | Primary database |
| Auth | Supabase Auth | 2.76+ | Authentication |
| Storage | Supabase Storage | 2.76+ | File storage |
| AI | Google Gemini | 1.26+ | AI generation |
| Queue | BullMQ (optional) | 5.61+ | Job processing |
| Cache | Redis (optional) | Latest | Caching |
| File Upload | Multer | 2.0+ | Multipart handling |

### Frontend Technologies

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Framework | React Native | 0.81+ | Mobile framework |
| Platform | Expo | 54+ | Development platform |
| Language | TypeScript | 5.9+ | Type safety |
| Navigation | Expo Router | 6+ | File-based routing |
| State | React Context | Built-in | State management |
| Storage | AsyncStorage | 2.2+ | Local storage |
| HTTP | Fetch API | Built-in | API requests |
| Images | Expo Image | 3.0+ | Image handling |

### Development Tools

- **Version Control**: Git + GitHub
- **Package Manager**: npm
- **Linter**: ESLint
- **Formatter**: Prettier (via ESLint)
- **API Testing**: Postman/Insomnia
- **Mobile Testing**: Expo Go

---

## Database Design

### Entity Relationship Diagram

```
┌─────────────┐
│    users    │
└──────┬──────┘
       │
       │ 1:N
       │
   ┌───┴───────────────────────┐
   │                           │
   ▼                           ▼
┌──────────────┐        ┌─────────────┐
│chat_sessions │        │  learning   │
└──────┬───────┘        │   _paths    │
       │ 1:N            └─────────────┘
       │
       ▼
┌──────────────┐
│chat_messages │
└──────────────┘

┌─────────────┐
│    users    │
└──────┬──────┘
       │ 1:1
       ▼
┌─────────────┐
│   tutor_    │
│  profiles   │
└──────┬──────┘
       │ 1:N
       ▼
┌─────────────┐
│tutor_learning│
│   _paths    │
└──────┬──────┘
       │
       │ N:M
       │
┌──────▼──────┐
│    path_    │
│ enrollments │
└─────────────┘
```

### Table Schemas

#### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  xp INTEGER DEFAULT 0,
  is_tutor BOOLEAN DEFAULT false,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_xp ON users(xp DESC);
CREATE INDEX idx_users_tutor ON users(is_tutor) WHERE is_tutor = true;
```

#### Chat Sessions Table
```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_updated ON chat_sessions(updated_at DESC);
```

#### Chat Messages Table
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'document')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at DESC);
```

#### Learning Paths Table
```sql
CREATE TABLE learning_paths (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  topic TEXT,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  estimated_hours INTEGER,
  lessons JSONB NOT NULL DEFAULT '[]',
  progress JSONB DEFAULT '{"completed_lessons": [], "current_lesson": null, "completion_percentage": 0}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_learning_paths_user ON learning_paths(user_id);
CREATE INDEX idx_learning_paths_topic ON learning_paths(topic);
```

### Row Level Security (RLS) Policies

```sql
-- Users can view their own data
CREATE POLICY "Users view own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Users view own chat sessions
CREATE POLICY "Users view own sessions"
  ON chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Users view own chat messages
CREATE POLICY "Users view own messages"
  ON chat_messages FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert messages
CREATE POLICY "System insert messages"
  ON chat_messages FOR INSERT
  WITH CHECK (true);
```

### Database Functions

#### Save Chat Message Function
```sql
CREATE OR REPLACE FUNCTION save_chat_message(
  p_session_id UUID,
  p_user_id UUID,
  p_content TEXT,
  p_role TEXT,
  p_media_url TEXT DEFAULT NULL,
  p_media_type TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
BEGIN
  -- Create session if doesn't exist
  IF NOT EXISTS (SELECT 1 FROM chat_sessions WHERE id = p_session_id) THEN
    INSERT INTO chat_sessions (id, user_id, title)
    VALUES (p_session_id, p_user_id, 'New Conversation');
  END IF;
  
  -- Insert message
  INSERT INTO chat_messages (
    session_id, user_id, content, role, media_url, media_type
  )
  VALUES (
    p_session_id, p_user_id, p_content, p_role, p_media_url, p_media_type
  )
  RETURNING id INTO v_message_id;
  
  -- Update session timestamp
  UPDATE chat_sessions
  SET updated_at = NOW()
  WHERE id = p_session_id;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Increment User XP Function
```sql
CREATE OR REPLACE FUNCTION increment_user_xp(
  p_user_id UUID,
  p_xp_amount INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_new_xp INTEGER;
BEGIN
  UPDATE users
  SET xp = COALESCE(xp, 0) + p_xp_amount
  WHERE id = p_user_id
  RETURNING xp INTO v_new_xp;
  
  RETURN v_new_xp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## AI Integration Architecture

### Google Gemini Integration

#### Model Selection Strategy

```javascript
// backend/controllers/chatController.js

const modelSelector = (messageContent, hasMedia) => {
  if (hasMedia) {
    return 'gemini-pro-vision'; // For image analysis
  }
  
  if (messageContent.length > 10000) {
    return 'gemini-pro'; // For long-form content
  }
  
  return 'gemini-pro'; // Default model
};
```

#### Context Management

```javascript
// Maintain conversation context
const buildContext = async (sessionId) => {
  const messages = await getSessionMessages(sessionId, 10); // Last 10 messages
  
  const context = messages.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }]
  }));
  
  return context;
};
```

#### Prompt Engineering

```javascript
// System prompts for different features
const PROMPTS = {
  chat: `You are a helpful AI learning assistant. Provide clear, 
         accurate, and educational responses.`,
  
  learningPath: `Generate a structured learning path with:
                 - Clear learning objectives
                 - Progressive difficulty
                 - Practical exercises
                 - Estimated completion time`,
  
  review: `Generate review questions that test understanding.
           Include hints and multiple difficulty levels.`,
  
  curiosityTiles: `Suggest interesting topics related to user interests.
                   Format: emoji, title, short description`
};
```

#### Error Handling & Fallbacks

```javascript
const generateAIResponse = async (prompt, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      if (i === retries - 1) {
        throw new Error('AI service unavailable');
      }
      await sleep(1000 * (i + 1)); // Exponential backoff
    }
  }
};
```

### AI Response Processing

```javascript
// Parse structured AI responses
const parseAIResponse = (response, format = 'json') => {
  if (format === 'json') {
    // Extract JSON from markdown code blocks
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    return JSON.parse(response);
  }
  
  return response; // Plain text
};
```

---

## Authentication & Security

### Authentication Flow

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Mobile  │         │  Backend │         │ Supabase │
│   App    │         │   API    │         │   Auth   │
└────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                     │
     │ Login Request      │                     │
     ├───────────────────>│                     │
     │                    │  Validate           │
     │                    ├────────────────────>│
     │                    │                     │
     │                    │  JWT Token          │
     │                    │<────────────────────┤
     │  JWT Token         │                     │
     │<───────────────────┤                     │
     │                    │                     │
     │ API Request + JWT  │                     │
     ├───────────────────>│                     │
     │                    │  Verify Token       │
     │                    ├────────────────────>│
     │                    │  User Info          │
     │                    │<────────────────────┤
     │  Response          │                     │
     │<───────────────────┤                     │
     │                    │                     │
```

### Middleware Implementation

```javascript
// backend/middleware/authMiddleware.js

const { createClient } = require('@supabase/supabase-js');

const protect = async (req, res, next) => {
  try {
    // Extract token
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Verify token with Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};
```

### Security Best Practices

1. **Environment Variables**: Store sensitive keys in `.env`
2. **HTTPS Only**: Enforce encrypted connections
3. **CORS Configuration**: Whitelist allowed origins
4. **Input Validation**: Sanitize all user inputs
5. **SQL Injection Prevention**: Use parameterized queries
6. **XSS Protection**: Escape output data
7. **Rate Limiting**: Prevent abuse (future implementation)
8. **File Upload Validation**: Check file types and sizes
9. **RLS Policies**: Database-level access control
10. **Token Expiry**: Refresh tokens periodically

---

## File Storage Architecture

### Supabase Storage Structure

```
user-uploads/
├── {user_id}/
│   ├── documents/
│   │   ├── {timestamp}_{filename}.pdf
│   │   └── {timestamp}_{filename}.docx
│   ├── images/
│   │   ├── {timestamp}_{filename}.jpg
│   │   └── {timestamp}_{filename}.png
│   └── videos/
│       └── {timestamp}_{filename}.mp4
│
avatars/
└── {user_id}/
    └── avatar.jpg
```

### Upload Flow

```javascript
// 1. Initialize upload
const initUpload = async (fileName, fileType, fileSize) => {
  const path = `user-uploads/${userId}/${category}/${timestamp}_${fileName}`;
  const { data, error } = await supabase.storage
    .from('user-uploads')
    .createSignedUploadUrl(path);
  
  return { uploadUrl: data.signedUrl, path };
};

// 2. Client uploads file to signed URL
// (Handled by frontend)

// 3. Complete upload
const completeUpload = async (path) => {
  const { data } = await supabase.storage
    .from('user-uploads')
    .getPublicUrl(path);
  
  return data.publicUrl;
};
```

### File Processing Pipeline

```javascript
// Document processing
const processDocument = async (fileUrl) => {
  if (fileUrl.endsWith('.pdf')) {
    const pdfData = await fetch(fileUrl).then(r => r.arrayBuffer());
    const parsed = await pdfParse(pdfData);
    return parsed.text;
  }
  
  // Other formats...
};

// AI analysis
const analyzeDocument = async (text) => {
  const prompt = `Summarize this document and extract key concepts:\n\n${text}`;
  return await generateAIResponse(prompt);
};
```

---

## API Layer

### Controller Pattern

```javascript
// controllers/chatController.js

exports.postChatMessage = async (req, res) => {
  try {
    // 1. Validate input
    const { message, sessionId } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }
    
    // 2. Get user from auth middleware
    const userId = req.user.id;
    
    // 3. Save user message
    await saveMessage(sessionId, userId, message, 'user');
    
    // 4. Generate AI response
    const aiResponse = await generateAIResponse(message, sessionId);
    
    // 5. Save AI message
    await saveMessage(sessionId, userId, aiResponse, 'assistant');
    
    // 6. Return response
    res.json({
      sessionId,
      response: aiResponse,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
};
```

### Service Layer Pattern (Future Enhancement)

```javascript
// services/chatService.js

class ChatService {
  async createMessage(sessionId, userId, content, role) {
    // Database operations
  }
  
  async getSessionMessages(sessionId, limit = 50) {
    // Database operations
  }
  
  async generateAIResponse(prompt, context) {
    // AI operations
  }
}

module.exports = new ChatService();
```

---

## Frontend Architecture

### Expo Router Structure

```
app/
├── _layout.tsx              # Root layout
├── login.tsx                # Auth screen
├── onboarding.tsx           # First-time setup
├── (tabs)/                  # Tab navigation
│   ├── _layout.tsx         # Tab layout
│   ├── index.tsx           # Home/Dashboard
│   ├── chat.tsx            # Chat interface
│   ├── discover.tsx        # Discovery feed
│   ├── library.tsx         # Saved content
│   └── profile.tsx         # User profile
├── tutor/                   # Tutor features
│   └── dashboard.tsx       # Tutor dashboard
├── session.tsx              # Chat session view
└── learning-path.tsx        # Path details
```

### Component Architecture

```
components/
├── ui/                      # Base UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   └── Modal.tsx
├── ChatBubble.tsx          # Message display
├── Composer.tsx            # Message input
├── CuriosityTile.tsx       # Topic tile
├── ResourceCard.tsx        # Learning resource
└── TypingIndicator.tsx     # Loading state
```

### API Service Layer

```typescript
// lib/api.ts

class API {
  private baseURL = process.env.EXPO_PUBLIC_API_URL;
  
  async request(endpoint: string, options: RequestOptions) {
    const token = await AsyncStorage.getItem('token');
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      throw new Error('Request failed');
    }
    
    return response.json();
  }
  
  // Specific methods
  async sendMessage(message: string, sessionId?: string) {
    return this.request('/api/v1/chat', {
      method: 'POST',
      body: JSON.stringify({ message, sessionId })
    });
  }
  
  async getSessions() {
    return this.request('/api/v1/chat/sessions');
  }
}

export default new API();
```

---

## State Management

### React Context Implementation

```typescript
// context/AuthContext.tsx

interface AuthContextType {
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Check stored session
    checkSession();
  }, []);
  
  const checkSession = async () => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      // Validate token and get user
    }
    setLoading(false);
  };
  
  return (
    <AuthContext.Provider value={{ user, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

## Scalability Considerations

### Database Optimization

1. **Indexing Strategy**
   - Index foreign keys
   - Index commonly queried columns
   - Composite indexes for multi-column queries

2. **Query Optimization**
   - Use EXPLAIN ANALYZE
   - Limit result sets
   - Implement pagination

3. **Connection Pooling**
   - Supabase handles this automatically
   - Configure pool size for high traffic

### API Scalability

1. **Horizontal Scaling**
   - Deploy multiple API instances
   - Use load balancer

2. **Caching Strategy**
   - Redis for session data
   - Cache AI responses for common queries
   - CDN for static assets

3. **Queue System**
   - BullMQ for background jobs
   - Async processing for heavy tasks

### AI Cost Optimization

1. **Response Caching**
   - Cache similar queries
   - TTL-based invalidation

2. **Request Batching**
   - Group similar requests
   - Reduce API calls

3. **Model Selection**
   - Use appropriate model for task
   - Monitor token usage

---

## Performance Optimization

### Backend Optimizations

1. **Database Query Optimization**
   ```sql
   -- Use indexes
   CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
   
   -- Limit results
   SELECT * FROM chat_messages 
   WHERE session_id = $1 
   ORDER BY created_at DESC 
   LIMIT 50;
   ```

2. **API Response Compression**
   ```javascript
   const compression = require('compression');
   app.use(compression());
   ```

3. **Async Operations**
   ```javascript
   // Don't block response
   app.post('/activity/log', async (req, res) => {
     res.json({ success: true });
     
     // Log asynchronously
     logActivity(req.body).catch(console.error);
   });
   ```

### Frontend Optimizations

1. **Image Optimization**
   ```typescript
   <Image 
     source={{ uri }}
     contentFit="cover"
     placeholder={{ blurhash }}
     transition={200}
   />
   ```

2. **List Virtualization**
   ```typescript
   <FlatList
     data={messages}
     renderItem={renderMessage}
     initialNumToRender={10}
     maxToRenderPerBatch={10}
     windowSize={5}
   />
   ```

3. **Code Splitting**
   ```typescript
   // Lazy load heavy screens
   const TutorDashboard = lazy(() => import('./tutor/dashboard'));
   ```

---

## Security Best Practices

### Input Validation

```javascript
const validateMessage = (message) => {
  if (!message || typeof message !== 'string') {
    throw new Error('Invalid message');
  }
  
  if (message.length > 10000) {
    throw new Error('Message too long');
  }
  
  // Sanitize HTML
  return message.replace(/<[^>]*>/g, '');
};
```

### File Upload Security

```javascript
const validateFile = (file) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error('Invalid file type');
  }
  
  if (file.size > maxSize) {
    throw new Error('File too large');
  }
};
```

### Rate Limiting (Future)

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

---

## Deployment Architecture

### Production Environment

```
┌──────────────────────────────────────┐
│         Load Balancer (HTTPS)        │
└────────────┬─────────────────────────┘
             │
   ┌─────────┴─────────┐
   │                   │
   ▼                   ▼
┌────────┐        ┌────────┐
│ API    │        │ API    │
│ Server │        │ Server │
│   #1   │        │   #2   │
└────┬───┘        └───┬────┘
     │                │
     └────────┬───────┘
              │
      ┌───────┴────────┐
      │                │
      ▼                ▼
┌──────────┐    ┌──────────┐
│ Supabase │    │ Gemini   │
│          │    │   AI     │
└──────────┘    └──────────┘
```

### Deployment Checklist

1. **Environment Variables**
   - Set all required env vars
   - Use secrets management

2. **Database Migrations**
   - Run all migrations
   - Verify RLS policies

3. **Storage Buckets**
   - Create buckets
   - Set CORS policies
   - Configure RLS

4. **API Server**
   - Build and deploy
   - Configure health checks
   - Set up monitoring

5. **Mobile App**
   - Build for iOS/Android
   - Submit to app stores
   - Configure update strategy

---

**End of Technical Documentation**

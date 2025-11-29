require('dotenv').config();
const express = require('express');
const cors = require('cors');

console.log('=== SERVER STARTUP ===');
console.log('Environment variables loaded:');
console.log('- GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✓ SET' : '✗ MISSING');
console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ SET' : '✗ MISSING');
console.log('- SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✓ SET' : '✗ MISSING');
console.log('- SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✓ SET' : '✗ MISSING');

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is required! Please check your .env file');
  process.exit(1);
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ Supabase configuration is required! Please check your .env file');
  process.exit(1);
}

const chatRoutes = require('./routes/chatRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const profileRoutes = require('./routes/profileRoutes');
const tilesRoutes = require('./routes/tilesRoutes'); // Add this
const debugRoutes = require('./routes/debugRoutes'); // Add this
const pathRoutes = require('./routes/pathRoutes'); // Learning paths
const recommendationRoutes = require('./routes/recommendationRoutes'); // AI recommendations
const activityRoutes = require('./routes/activityRoutes'); // Activity logging
const missionRoutes = require('./routes/missionRoutes'); // Daily missions
const tutorRoutes = require('./routes/tutorRoutes'); // Tutor system
const reviewRoutes = require('./routes/reviewRoutes'); // Daily review system
const rewardsRoutes = require('./routes/rewardsRoutes'); // Variable rewards system
const streakRoutes = require('./routes/streakRoutes'); // Streak system (Addiction Engine)
const viralRoutes = require('./routes/viralRoutes'); // Viral sharing system
const gameRoutes = require('./routes/gameRoutes'); // Gamification routes
const flashcardRoutes = require('./routes/flashcardRoutes'); // Flashcard game routes
const curiosityRoutes = require('./routes/curiosityRoutes'); // Curiosity tile opening messages
const proactiveRoutes = require('./routes/proactive'); // Proactive AI system
const monetizationRoutes = require('./routes/monetization'); // Monetization system
const iapRoutes = require('./routes/iap'); // In-App Purchases (IAP)

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

// IMPORTANT: Webhook route MUST come before express.json() middleware
// Stripe webhooks need raw body for signature verification
app.use('/api/v1/monetization/webhook', express.raw({ type: 'application/json' }));

// Parse JSON for all other routes
app.use(express.json());

app.use('/api/v1/debug', debugRoutes);

// API Routes
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/chat/proactive', proactiveRoutes); // Proactive AI endpoints
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/profiles', profileRoutes);
app.use('/api/v1/tiles', tilesRoutes); // And this
app.use('/api/v1/paths', pathRoutes); // Learning paths
app.use('/api/v1/recommendations', recommendationRoutes); // AI recommendations
app.use('/api/v1/activity', activityRoutes); // Activity logging
app.use('/api/v1/missions', missionRoutes); // Daily missions
app.use('/api/v1/tutors', tutorRoutes); // Tutor system
app.use('/api/v1/review', reviewRoutes); // Daily review system
app.use('/api/v1/rewards', rewardsRoutes); // Variable rewards system
app.use('/api/v1/streak', streakRoutes); // Streak system (Addiction Engine)
app.use('/api/v1/viral', viralRoutes); // Viral sharing system
app.use('/api/v1/games', gameRoutes); // Gamification games
app.use('/api/v1/flashcards', flashcardRoutes); // Flashcard rapid-fire game
app.use('/api/v1/curiosity', curiosityRoutes); // Curiosity tile opening messages
app.use('/api/v1/monetization', monetizationRoutes); // Monetization system
app.use('/api/v1/iap', iapRoutes); // In-App Purchases (Lives, Energy, etc.)

app.get('/', (req, res) => {
  res.send('ChitChat API is alive!');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
  console.log(`Access from your phone at http://192.168.1.6:${PORT}`);
});


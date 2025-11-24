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

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/api/v1/debug', debugRoutes);

// API Routes
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/profiles', profileRoutes);
app.use('/api/v1/tiles', tilesRoutes); // And this
app.use('/api/v1/paths', pathRoutes); // Learning paths

app.get('/', (req, res) => {
  res.send('ChitChat API is alive!');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


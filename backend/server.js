require('dotenv').config();
const express = require('express');
const cors = require('cors');

const chatRoutes = require('./routes/chatRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const profileRoutes = require('./routes/profileRoutes');
const tilesRoutes = require('./routes/tilesRoutes'); // Add this

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/profiles', profileRoutes);
app.use('/api/v1/tiles', tilesRoutes); // And this

app.get('/', (req, res) => {
  res.send('ChitChat API is alive!');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


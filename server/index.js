
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const pickOutfit = require('./outfitPicker');
const sampleCloset = require('./sampleCloset');

const app = express();
const PORT = process.env.PORT || 3001;

// Allow our React frontend to communicate with the backend.
app.use(cors());
app.use(express.json());

// Test endpoint to make sure our backend is working.
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'The Fitting Room backend is running!'
  });
});
// List of options for the Style Me screen.
app.get('/api/options', (req, res) => {
  res.json({
    occasions: ['Class', 'First date', 'Brunch', 'Party', 'Interview'],
    aesthetics: ['90s rom-com', 'Clean girl', 'Y2K', 'Dark academia', 'Streetwear'],
  });
});

// Real route: the frontend sends the user's closet and choices.
app.post('/api/outfit', (req, res) => {
  const { closet, aesthetic, weather } = req.body;

  // Make sure we actually got clothes.
  if (!Array.isArray(closet) || closet.length === 0) {
    return res.status(400).json({ error: 'Please send a closet with at least one item.' });
  }

  const outfit = pickOutfit(closet, aesthetic, weather);
  res.json(outfit);
});

// TODO: Add Gemini AI outfit recommendations here.

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

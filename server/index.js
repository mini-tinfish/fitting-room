
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

// Test route: build an outfit from the sample closet.
app.get('/api/outfit/test', (req, res) => {
  const { aesthetic, weather } = req.query;
  const outfit = pickOutfit(sampleCloset, aesthetic, weather);
  res.json(outfit);
});

// TODO: Add Gemini AI outfit recommendations here.

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

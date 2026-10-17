
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const pickOutfit = require('./outfitPicker');
const sampleCloset = require('./sampleCloset');

const app = express();
const PORT = process.env.PORT || 3001;

// Allow our React frontend to communicate with the backend.
app.use(cors());
app.use(express.json({ limit: '15mb' }));

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
// Remove the background from a clothing photo using remove.bg.
app.post('/api/remove-background', async (req, res) => {
  try {
    // The frontend sends the photo as a data URL: "data:image/jpeg;base64,....."
    const { image } = req.body;

    if (!image || !image.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Please send an image as a data URL.' });
    }

    // Keep only the base64 part (everything after the comma).
    const base64 = image.split(',')[1];

    // Build the request for remove.bg.
    const form = new FormData();
    form.append('image_file_b64', base64);
    form.append('size', 'preview'); // free-tier size
    form.append('format', 'png');   // PNG keeps the transparent background

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': process.env.REMOVE_BG_API_KEY },
      body: form,
    });

    // If remove.bg says no, log why and tell the frontend.
    if (!response.ok) {
      const details = await response.text();
      console.error('remove.bg error:', response.status, details);
      return res.status(502).json({ error: 'Background removal failed.' });
    }

    // Turn the PNG it sends back into a data URL for the frontend.
    const pngBuffer = Buffer.from(await response.arrayBuffer());
    res.json({ image: `data:image/png;base64,${pngBuffer.toString('base64')}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong removing the background.' });
  }
});
// TODO: Add Gemini AI outfit recommendations here.

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

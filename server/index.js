
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
// Get the weather for a place and date, as "hot", "mild", or "cold".
app.get('/api/weather', async (req, res) => {
  try {
    // date is optional, like "2026-10-24". No date = today.
    const { lat, lon, date } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Please send lat and lon.' });
    }

    // Build the Open-Meteo request.
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', lat);
    url.searchParams.set('longitude', lon);
    url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_probability_max');
    url.searchParams.set('temperature_unit', 'fahrenheit');
    url.searchParams.set('timezone', 'auto');
    if (date) {
      url.searchParams.set('start_date', date);
      url.searchParams.set('end_date', date);
    } else {
      url.searchParams.set('forecast_days', '1');
    }

    const response = await fetch(url);

    if (!response.ok) {
      const details = await response.text();
      console.error('Open-Meteo error:', response.status, details);
      return res.status(502).json({ error: 'Could not get the weather. Forecasts only go about 2 weeks ahead.' });
    }

    const data = await response.json();
    const high = data.daily.temperature_2m_max[0];
    const low = data.daily.temperature_2m_min[0];
    const rainChance = data.daily.precipitation_probability_max[0];

    // Turn the high temperature into a word the outfit picker understands.
    let weather = 'cold';
    if (high >= 80) weather = 'hot';
    else if (high >= 60) weather = 'mild';

    res.json({ date: data.daily.time[0], high, low, rainChance, weather });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong getting the weather.' });
  }
});
// TODO: Add Gemini AI outfit recommendations here.

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

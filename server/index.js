
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const pickOutfit = require('./outfitPicker');
const { buildPrompt, cleanCloset, responseSchema, validateRecommendation } = require('./darling');
const sampleCloset = require('./sampleCloset');

const app = express();
const PORT = process.env.PORT || 5000;

// Only our own frontends may call the API from a browser.
// CORS_ORIGINS (comma-separated) adds more, e.g. a phone testing over the LAN: http://192.168.1.20:5173
const allowedOrigins = new Set([
  'https://outfit-darling-web-production.up.railway.app',
  'https://outfit-darling.us',
  ...(process.env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim().replace(/\/+$/, '')).filter(Boolean),
]);
// Local development on any port (Vite dev is 5173, vite preview is 4173).
const localOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use(cors({
  // Requests with no Origin (curl, health checks) aren't from a browser, so CORS doesn't apply.
  origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin) || localOrigin.test(origin)),
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json({ limit: '15mb' }));

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
  // mode is optional: 'separates' (top + bottom) or 'dress'.
  const { closet, aesthetic, weather, mode } = req.body;

  // Make sure we actually got clothes.
  if (!Array.isArray(closet) || closet.length === 0) {
    return res.status(400).json({ error: 'Please send a closet with at least one item.' });
  }

  const outfit = pickOutfit(closet, aesthetic, weather, mode);
  res.json(outfit);
});
// Turn a remove.bg error into a message the closet popup can show.
// retryable tells the frontend whether "Try Again" makes sense.
function removeBgError(status, details) {
  let code = '';
  try {
    code = JSON.parse(details).errors?.[0]?.code || '';
  } catch {
    // remove.bg sent something that isn't JSON; fall through to the generic message.
  }

  if (code === 'unknown_foreground') {
    return { status: 422, error: "Couldn't find the clothing in this photo. Try a photo with the piece clearly in view.", retryable: false };
  }
  if (status === 402) {
    return { status: 402, error: 'The background remover is out of credits for now.', retryable: false };
  }
  if (status === 403) {
    return { status: 503, error: 'The background remover API key was rejected. Check REMOVE_BG_API_KEY in server/.env.', retryable: false };
  }
  if (status === 429) {
    return { status: 429, error: 'The background remover is busy. Please wait a moment and try again.', retryable: true };
  }
  return { status: 502, error: 'Background removal failed.', retryable: true };
}

// Remove the background from a clothing photo using remove.bg.
app.post('/api/remove-background', async (req, res) => {
  try {
    // The frontend sends the photo as a data URL: "data:image/jpeg;base64,....."
    const { image } = req.body;

    if (typeof image !== 'string' || !image.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Please send an image as a data URL.', retryable: false });
    }

    // Like Gemini, remove.bg is optional: say so clearly instead of calling it with no key.
    if (!process.env.REMOVE_BG_API_KEY) {
      return res.status(503).json({
        error: "Background removal isn't set up yet: add REMOVE_BG_API_KEY to server/.env.",
        code: 'not_configured',
        retryable: false,
      });
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
      const { status, error, retryable } = removeBgError(response.status, details);
      return res.status(status).json({ error, retryable });
    }

    // Turn the PNG it sends back into a data URL for the frontend.
    const pngBuffer = Buffer.from(await response.arrayBuffer());
    res.json({ image: `data:image/png;base64,${pngBuffer.toString('base64')}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong removing the background.', retryable: true });
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
// Gemini is optional: without a key, every other endpoint keeps working.
// GEMINI_MODEL lets the team switch models from server/.env without a code change.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
let gemini = null;
function getGemini() {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!gemini) gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return gemini;
}

// Ask Darling: turn the user's own words into an outfit from their saved closet.
// The rule-based /api/outfit above stays as the quick "Style Me!" option.
app.post('/api/recommend-outfit', async (req, res) => {
  try {
    const { closet, request, occasion, aesthetic, weather, forecast, today, avoid } = req.body || {};

    if (!closet || !Array.isArray(closet) || closet.length === 0) {
      return res.status(400).json({ error: 'Closet items are required.' });
    }

    const items = cleanCloset(closet);
    if (items.length === 0) {
      return res.status(400).json({ error: 'Closet items need an id and a category.' });
    }

    const hasRequest = [request, occasion, aesthetic].some((value) => typeof value === 'string' && value.trim());
    if (!hasRequest) {
      return res.status(400).json({ error: 'Tell Darling what you need help with.' });
    }

    const ai = getGemini();
    if (!ai) {
      return res.status(503).json({ error: "Ask Darling isn't set up yet: add GEMINI_API_KEY to server/.env." });
    }

    const prompt = buildPrompt({ closet: items, request, occasion, aesthetic, weather, forecast, today, avoid });

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema,
        // A little more variety when the user asks to "Try Another".
        temperature: Array.isArray(avoid) && avoid.length > 0 ? 1 : 0.7,
      }
    });

    let recommendation;
    try {
      recommendation = JSON.parse(response.text || '{}');
    } catch {
      return res.status(502).json({ error: 'Darling sent back an answer we could not read. Please try again.' });
    }

    return res.json(validateRecommendation(recommendation, items));
  } catch (error) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({ error: 'Darling could not put an outfit together right now. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

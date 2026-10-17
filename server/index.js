
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { GoogleGenAI, Type } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'The Fitting Room backend is running!'
  });
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/recommend-outfit', async (req, res) => {
  try {
    const { closet, occasion, aesthetic, weather } = req.body;

    if (!closet || !Array.isArray(closet) || closet.length === 0) {
      return res.status(400).json({ error: 'Closet items are required.' });
    }

    const prompt = `
      You are the AI stylist for "The Fitting Room".
      User Request:
      - Occasion: ${occasion || 'Casual'}
      - Aesthetic: ${aesthetic || '90s Rom-Com'}
      - Weather: ${weather || 'Warm and sunny'}

      Available Closet Items:
      ${JSON.stringify(closet, null, 2)}

      Instructions:
      1. Select EXACT item IDs from the user's available closet to build a complete outfit (Top, Bottom/Dress, Shoes, Accessories).
      2. ONLY pick item IDs that exist in the provided closet list.
      3. Provide a witty, stylish explanation for why this outfit was picked.
    `;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        selectedItemIds: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'List of string IDs corresponding to selected closet items.'
        },
        stylistComment: {
          type: Type.STRING,
          description: 'A fun explanation of the outfit choice.'
        }
      },
      required: ['selectedItemIds', 'stylistComment']
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.7,
      }
    });

    const recommendation = JSON.parse(response.text || '{}');

    if (!recommendation.selectedItemIds || !recommendation.stylistComment) {
      return res.status(500).json({ error: 'The AI returned an incomplete outfit recommendation.' });
    }

    return res.json(recommendation);
  } catch (error) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({ error: 'Failed to generate outfit recommendation.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

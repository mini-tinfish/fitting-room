import { API_URL } from './config';

// Gemini AI stylist. Not used on a page yet; kept for a future custom-prompt screen.
export async function getOutfitRecommendation({ closet, occasion, aesthetic, weather }) {
  try {
    const response = await fetch(`${API_URL}/api/recommend-outfit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ closet, occasion, aesthetic, weather }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch recommendation');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
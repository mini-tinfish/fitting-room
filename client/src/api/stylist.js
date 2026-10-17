export async function getOutfitRecommendation({ closet, occasion, aesthetic, weather }) {
  try {
    const response = await fetch('http://localhost:5001/api/recommend-outfit', {
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
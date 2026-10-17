import { API_URL } from './config';
import { OUTFIT_MODES, normalizeOutfit } from '../outfit';

// Only the info Darling needs: never the photos (they're large and private).
function lightCloset(closet) {
  return closet.map(({ id, name, category, color, warmth, tags }) => ({ id, name, category, color, warmth, tags }));
}

// Gemini AI stylist ("Ask Darling").
// Sends the closet plus whatever the user typed; extra fields are optional.
export async function getOutfitRecommendation({ closet, request, occasion, aesthetic, weather, forecast, today, avoid }) {
  let response;
  try {
    response = await fetch(`${API_URL}/api/recommend-outfit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ closet: lightCloset(closet), request, occasion, aesthetic, weather, forecast, today, avoid }),
    });
  } catch (error) {
    console.error('API Error:', error);
    throw new Error("Can't reach Darling right now. You can still style by hand ♡", { cause: error });
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch recommendation');
  }
  return data;
}

function stringList(value) {
  return Array.isArray(value) ? value.filter((text) => typeof text === 'string' && text.trim()).map((text) => text.trim()) : [];
}

// The server already checks Gemini's answer, but check again here against the closet this page
// actually has, so a stale or odd response can never put a made-up piece on the dressing room.
export function validateRecommendation(data, closet) {
  const byId = new Map(closet.map((item) => [item.id, item]));
  const type = data?.mode === 'dress' ? 'dress' : 'separates';
  const outfit = normalizeOutfit({ type, accessories: [] });
  let dropped = false;

  for (const slot of OUTFIT_MODES[type]) {
    const id = data?.[slot];
    if (!id) continue;
    if (byId.get(id)?.category === slot) outfit[slot] = id;
    else dropped = true;
  }
  for (const id of Array.isArray(data?.accessories) ? data.accessories : []) {
    if (byId.get(id)?.category === 'accessory' && !outfit.accessories.includes(id)) outfit.accessories.push(id);
    else dropped = true;
  }

  const limitations = stringList(data?.limitations);
  if (dropped) limitations.push("Darling mentioned a piece that isn't in your closet, so it was left out.");

  const understood = data?.understood && typeof data.understood === 'object' ? data.understood : {};

  return {
    outfit,
    selectedItemIds: [...OUTFIT_MODES[type].map((slot) => outfit[slot]), ...outfit.accessories].filter(Boolean),
    explanation: typeof data?.explanation === 'string' ? data.explanation : data?.stylistComment || '',
    stylingTips: stringList(data?.stylingTips),
    limitations,
    missingPieces: stringList(data?.missingPieces),
    meetsRequest: data?.meetsRequest !== false && !dropped,
    understood: Object.fromEntries(
      Object.entries(understood).filter(([, value]) => typeof value === 'string' && value.trim())
    ),
  };
}

export async function askDarling({ closet, ...details }) {
  const data = await getOutfitRecommendation({ closet, ...details });
  return validateRecommendation(data, closet);
}

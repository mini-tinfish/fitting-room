// "Ask Darling": the prompt, response shape and safety checks for Gemini outfit recommendations.
// Kept apart from index.js so the checks can be tested without calling Gemini.
const { Type } = require('@google/genai');

// Which slots each outfit type uses. Accessories are always optional.
const SLOTS = {
  separates: ['top', 'bottom', 'shoes'],
  dress: ['dress', 'shoes'],
};
const MAX_ITEMS = 300;

function clip(value, max = 200) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function stringList(value, maxItems = 5, maxLength = 240) {
  if (!Array.isArray(value)) return [];
  return value.map((text) => clip(text, maxLength)).filter(Boolean).slice(0, maxItems);
}

// Keep only the item info the stylist needs (never photos), and only well-formed items.
function cleanCloset(closet) {
  return closet
    .filter((item) => item && typeof item.id === 'string' && typeof item.category === 'string')
    .slice(0, MAX_ITEMS)
    .map((item) => ({
      id: item.id,
      name: clip(item.name, 80),
      category: item.category,
      color: clip(item.color, 40),
      warmth: clip(item.warmth, 20),
      tags: stringList(item.tags, 10, 40),
    }));
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    understood: {
      type: Type.OBJECT,
      description: 'Short phrases for what the user asked for. Empty string when unknown.',
      properties: {
        occasion: { type: Type.STRING },
        dressCode: { type: Type.STRING },
        weather: { type: Type.STRING },
        aesthetic: { type: Type.STRING },
        colors: { type: Type.STRING },
        formality: { type: Type.STRING },
        notes: { type: Type.STRING },
      },
    },
    mode: { type: Type.STRING, enum: ['separates', 'dress'] },
    top: { type: Type.STRING, description: 'Closet id of a "top" item, or "".' },
    bottom: { type: Type.STRING, description: 'Closet id of a "bottom" item, or "".' },
    dress: { type: Type.STRING, description: 'Closet id of a "dress" item, or "".' },
    shoes: { type: Type.STRING, description: 'Closet id of a "shoes" item, or "".' },
    accessories: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Closet ids of "accessory" items.' },
    explanation: { type: Type.STRING },
    stylingTips: { type: Type.ARRAY, items: { type: Type.STRING } },
    limitations: { type: Type.ARRAY, items: { type: Type.STRING } },
    missingPieces: { type: Type.ARRAY, items: { type: Type.STRING } },
    meetsRequest: { type: Type.BOOLEAN },
  },
  required: ['understood', 'mode', 'top', 'bottom', 'dress', 'shoes', 'accessories', 'explanation', 'stylingTips', 'limitations', 'missingPieces', 'meetsRequest'],
};

function describeForecast(forecast) {
  const high = Number(forecast?.high);
  const low = Number(forecast?.low);
  if (!Number.isFinite(high) || !Number.isFinite(low)) return '';
  const rain = Number(forecast.rainChance);
  const rainText = Number.isFinite(rain) ? `, ${Math.round(rain)}% chance of rain` : '';
  return `Forecast for ${clip(forecast.date, 10) || 'the day'}: high ${Math.round(high)}°F, low ${Math.round(low)}°F${rainText}.`;
}

function buildPrompt({ closet, request, occasion, aesthetic, weather, forecast, today, avoid }) {
  const lines = [
    'You are Darling, the warm, witty personal stylist in "Outfit Darling", a 90s/Y2K-inspired dress-up closet app.',
    `Today's date: ${clip(today, 10) || new Date().toISOString().slice(0, 10)}.`,
    '',
    "THE USER'S REQUEST (their own words, the most important input):",
    `"""${clip(request, 600) || 'Something cute for today.'}"""`,
  ];

  if (clip(occasion, 80)) lines.push(`Occasion picked in the app: ${clip(occasion, 80)}.`);
  if (clip(aesthetic, 80)) lines.push(`Aesthetic picked in the app: ${clip(aesthetic, 80)}.`);
  if (['hot', 'mild', 'cold'].includes(weather)) {
    lines.push(`Weather picked in the app: ${weather}. If the user's own words describe the weather differently, follow the user's words.`);
  }
  const forecastText = describeForecast(forecast);
  lines.push(
    forecastText
      ? `${forecastText} If the user's own words describe the weather differently, follow the user's words.`
      : 'No forecast was provided. Only use weather the user described or picked; never invent a forecast.'
  );

  const previous = Array.isArray(avoid) ? avoid.filter(Array.isArray).slice(-5) : [];
  if (previous.length > 0) {
    lines.push(
      `Combinations already suggested (pick a noticeably different one if the wardrobe allows, keeping the same requirements): ${JSON.stringify(previous)}`
    );
  }

  lines.push(
    '',
    "THE USER'S WARDROBE (the ONLY clothes you may use):",
    JSON.stringify(closet),
    '',
    'How to style:',
    '1. Work out the occasion, dress code, weather or temperature, aesthetic, colors, theme, formality, comfort needs and any explicit likes or dislikes. Put short phrases in "understood" ("" when unknown).',
    '2. Consider both outfit modes and pick the one that suits the request best:',
    '   - "separates": one "top", one "bottom" and one "shoes".',
    '   - "dress": one "dress" and one "shoes".',
    '3. Use ONLY ids that appear in the wardrobe, copied exactly. Each id must belong to an item whose category matches its slot. Never invent items or ids.',
    '4. Use "" for a slot when nothing in the wardrobe suits it, and for every slot of the mode you did not choose.',
    '5. "accessories": 0 to 3 ids of items with category "accessory", only if they help. Accessories are optional.',
    '6. Be honest. If the wardrobe cannot meet the request (for example a black-tie event when the user only owns jeans and casual tops), set "meetsRequest" to false, say plainly in "limitations" that the outfit does not meet the dress code, list what is missing in "missingPieces" as general descriptions (like "floor-length evening gown"), and you may still pick the closest available pieces. Never claim an outfit meets a dress code it does not.',
    '7. "explanation": 2 or 3 friendly sentences on why this outfit works for the request. Refer to pieces by their names.',
    '8. "stylingTips": 0 to 3 short, practical tips (tucking, layering, how to wear it).'
  );

  return lines.join('\n');
}

// Never trust the model's ids: keep only ids that exist in this closet and match their slot.
function validateRecommendation(raw, closet) {
  const byId = new Map(closet.map((item) => [item.id, item]));
  const mode = raw?.mode === 'dress' ? 'dress' : 'separates';
  const outfit = { mode, top: null, bottom: null, dress: null, shoes: null, accessories: [] };
  let invalid = 0;

  for (const slot of SLOTS[mode]) {
    const id = clip(raw?.[slot]);
    if (!id) continue;
    if (byId.get(id)?.category === slot) outfit[slot] = id;
    else invalid += 1;
  }

  for (const value of Array.isArray(raw?.accessories) ? raw.accessories : []) {
    const id = clip(value);
    if (!id) continue;
    if (byId.get(id)?.category === 'accessory' && !outfit.accessories.includes(id)) {
      if (outfit.accessories.length < 3) outfit.accessories.push(id);
    } else {
      invalid += 1;
    }
  }

  const selectedItemIds = [...SLOTS[mode].map((slot) => outfit[slot]), ...outfit.accessories].filter(Boolean);
  const limitations = stringList(raw?.limitations, 5, 300);
  if (invalid > 0) limitations.push("Darling mentioned a piece that isn't in your closet, so it was left out.");
  if (selectedItemIds.length === 0 && limitations.length === 0) {
    limitations.push("Darling couldn't find pieces in your closet that work for this request.");
  }

  const understood = {};
  for (const key of ['occasion', 'dressCode', 'weather', 'aesthetic', 'colors', 'formality', 'notes']) {
    understood[key] = clip(raw?.understood?.[key], 60);
  }
  const explanation = clip(raw?.explanation, 700);

  return {
    ...outfit,
    selectedItemIds,
    understood,
    explanation,
    stylingTips: stringList(raw?.stylingTips, 3, 240),
    limitations,
    missingPieces: stringList(raw?.missingPieces, 5, 80),
    meetsRequest: raw?.meetsRequest === true && invalid === 0 && selectedItemIds.length > 0,
    // Kept so the original { selectedItemIds, stylistComment } response shape still works.
    stylistComment: explanation,
  };
}

module.exports = { buildPrompt, cleanCloset, responseSchema, validateRecommendation };

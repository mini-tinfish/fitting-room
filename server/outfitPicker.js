// Which warmth levels make sense for each kind of weather.
const warmthForWeather = {
  hot: ['light'],
  mild: ['light', 'medium'],
  cold: ['medium', 'warm'],
};

// Grab a random item from a list.
function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Pick the best item for ONE category (like "top" or "shoes").
function pickItem(closet, category, aesthetic, weather) {
  // 1. Only keep items in this category.
  const items = closet.filter((item) => item.category === category);
  if (items.length === 0) return null;

  // 2. Prefer items that fit the weather.
  const okWarmth = warmthForWeather[weather];
  const weatherMatches = okWarmth
    ? items.filter((item) => okWarmth.includes(item.warmth))
    : [];
  const pool = weatherMatches.length > 0 ? weatherMatches : items;

  // 3. Of those, prefer items tagged with the chosen aesthetic.
  const wanted = (aesthetic || '').toLowerCase();
  const styleMatches = pool.filter((item) => (item.tags || []).includes(wanted));

  // 4. Pick randomly from the best matches, so "shuffle" gives new outfits.
  return randomFrom(styleMatches.length > 0 ? styleMatches : pool);
}

// Build a whole outfit: one top, one bottom, one pair of shoes.
function pickOutfit(closet, aesthetic, weather) {
  return {
    top: pickItem(closet, 'top', aesthetic, weather),
    bottom: pickItem(closet, 'bottom', aesthetic, weather),
    shoes: pickItem(closet, 'shoes', aesthetic, weather),
  };
}

module.exports = pickOutfit;
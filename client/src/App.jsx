async function handleStyleMe() {
  setLoading(true);
  try {
    const result = await getOutfitRecommendation({ closet, occasion, aesthetic, weather });
    setRecommendedIds(result.selectedItemIds);
    setStylistNote(result.stylistComment);
  } catch (err) {
    // Fallback logic: Pick 1 Top, 1 Bottom, and 1 Pair of Shoes randomly from closet
    const fallbackTop = closet.find(i => i.category === 'tops')?.id;
    const fallbackBottom = closet.find(i => i.category === 'bottoms')?.id;
    const fallbackShoes = closet.find(i => i.category === 'shoes')?.id;
    
    setRecommendedIds([fallbackTop, fallbackBottom, fallbackShoes].filter(Boolean));
    setStylistNote("Here's a quick staple combo from your wardrobe!");
  } finally {
    setLoading(false);
  }
}
// One outfit shape shared by Style Me, Lookbook and My Week:
//   { type: 'separates' | 'dress', top, bottom, dress, shoes, accessories: [] }
// Every value is a closet item id (or null), never a copy of the photo.
// Older saved looks only have { top, bottom, shoes }, so always read outfits through normalizeOutfit().

export const OUTFIT_MODES = {
  separates: ['top', 'bottom', 'shoes'],
  dress: ['dress', 'shoes'],
}

export const SLOT_LABELS = {
  top: 'Top',
  bottom: 'Bottom',
  dress: 'Dress',
  shoes: 'Shoes',
  accessory: 'Accessory',
}

export function normalizeOutfit(raw) {
  const outfit = raw || {}
  // Looks saved before dresses existed have no type, so they are separates.
  const type = outfit.type === 'dress' || (!outfit.type && outfit.dress) ? 'dress' : 'separates'
  const accessories = Array.isArray(outfit.accessories) ? outfit.accessories.filter(Boolean) : []

  return {
    type,
    top: type === 'separates' ? outfit.top || null : null,
    bottom: type === 'separates' ? outfit.bottom || null : null,
    dress: type === 'dress' ? outfit.dress || null : null,
    shoes: outfit.shoes || null,
    accessories: [...new Set(accessories)],
  }
}

export function outfitItemIds(outfit) {
  const normalized = normalizeOutfit(outfit)
  return [...OUTFIT_MODES[normalized.type].map((slot) => normalized[slot]), ...normalized.accessories].filter(Boolean)
}

export function isOutfitEmpty(outfit) {
  return outfitItemIds(outfit).length === 0
}

// Same pieces in the same order means the same outfit (used to block duplicate saves).
export function outfitSignature(outfit) {
  const normalized = normalizeOutfit(outfit)
  return JSON.stringify({ ...normalized, accessories: [...normalized.accessories].sort() })
}

// Every slot in display order, with its closet item.
// item is null when the slot is empty (no id) or the piece was deleted from My Closet (id but no item).
export function outfitPieces(outfit, closet) {
  const normalized = normalizeOutfit(outfit)
  const byId = new Map(closet.map((item) => [item.id, item]))
  const pieces = OUTFIT_MODES[normalized.type].map((slot) => ({
    slot,
    id: normalized[slot],
    item: normalized[slot] ? byId.get(normalized[slot]) || null : null,
  }))
  for (const id of normalized.accessories) {
    pieces.push({ slot: 'accessory', id, item: byId.get(id) || null })
  }
  return pieces
}

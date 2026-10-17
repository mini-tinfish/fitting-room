import { get, set, update } from 'idb-keyval';
const KEY = 'closet';

// Make an id that won't collide, even for two items saved in the same millisecond.
// crypto.randomUUID only exists on https/localhost, so fall back elsewhere (e.g. phone on LAN).
function makeId() {
  if (globalThis.crypto?.randomUUID) return `item-${crypto.randomUUID()}`;
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// Get every item in the closet (empty list if none yet).
export async function getCloset() {
  return (await get(KEY)) || [];
}

// Add one item and give it a unique id.
// update() reads and writes in one transaction, so quick saves can't overwrite each other.
export async function addItem(item) {
  const newItem = { ...item, id: makeId() };
  await update(KEY, (closet = []) => [...closet, newItem]);
  return newItem;
}

// Remove one item by its id.
export async function removeItem(id) {
  await update(KEY, (closet = []) => closet.filter((item) => item.id !== id));
}

// ---------- Saved looks (Lookbook) ----------
const LOOKS_KEY = 'looks';

export async function getLooks() {
  return (await get(LOOKS_KEY)) || [];
}

export async function saveLook(look) {
  const looks = await getLooks();
  const newLook = { ...look, id: `look-${Date.now()}`, savedAt: new Date().toISOString() };
  await set(LOOKS_KEY, [...looks, newLook]);
  return newLook;
}

export async function removeLook(id) {
  const looks = await getLooks();
  await set(LOOKS_KEY, looks.filter((look) => look.id !== id));
}
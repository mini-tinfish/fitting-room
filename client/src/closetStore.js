import { get, update } from 'idb-keyval';
const KEY = 'closet';

// Make an id that won't collide, even for two items saved in the same millisecond.
// crypto.randomUUID only exists on https/localhost, so fall back elsewhere (e.g. phone on LAN).
function makeId(prefix = 'item') {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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
  const newLook = { ...look, id: makeId('look'), savedAt: new Date().toISOString() };
  await update(LOOKS_KEY, (looks = []) => [...looks, newLook]);
  return newLook;
}

export async function removeLook(id) {
  await update(LOOKS_KEY, (looks = []) => looks.filter((look) => look.id !== id));
}

// ---------- Planned outfits (My Week) ----------
// Kept apart from Lookbook favorites: a plan is an outfit pinned to a calendar date.
// Plans for dates outside the visible week stay stored until they are removed.
const PLANS_KEY = 'plans';

export async function getPlans() {
  return (await get(PLANS_KEY)) || [];
}

export async function addPlan(plan) {
  const newPlan = { ...plan, id: makeId('plan'), createdAt: new Date().toISOString() };
  await update(PLANS_KEY, (plans = []) => [...plans, newPlan]);
  return newPlan;
}

// Returns the updated plan, or null if it no longer exists.
export async function updatePlan(id, changes) {
  let updated = null;
  await update(PLANS_KEY, (plans = []) =>
    plans.map((plan) => {
      if (plan.id !== id) return plan;
      updated = { ...plan, ...changes, id, updatedAt: new Date().toISOString() };
      return updated;
    })
  );
  return updated;
}

export async function removePlan(id) {
  await update(PLANS_KEY, (plans = []) => plans.filter((plan) => plan.id !== id));
}

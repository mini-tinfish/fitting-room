import { get, set } from 'idb-keyval';

const KEY = 'closet';

// Get every item in the closet (empty list if none yet).
export async function getCloset() {
  return (await get(KEY)) || [];
}

// Add one item and give it a unique id.
export async function addItem(item) {
  const closet = await getCloset();
  const newItem = { ...item, id: `item-${Date.now()}` };
  await set(KEY, [...closet, newItem]);
  return newItem;
}

// Remove one item by its id.
export async function removeItem(id) {
  const closet = await getCloset();
  await set(KEY, closet.filter((item) => item.id !== id));
}
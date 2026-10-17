import { useEffect, useState } from 'react';
import { getCloset, getLooks, removeLook } from '../closetStore';

const SLOTS = ['top', 'bottom', 'shoes'];

export default function MyLooks() {
  const [looks, setLooks] = useState([]);
  const [closet, setCloset] = useState([]);
  // Which look is open (null = show the grid).
  const [openLookId, setOpenLookId] = useState(null);

  useEffect(() => {
    getLooks().then(setLooks);
    getCloset().then(setCloset);
  }, []);

  // Find a clothing item's full info (with photo) by its id.
  function findItem(id) {
    return closet.find((item) => item.id === id);
  }

  async function handleRemove(id) {
    await removeLook(id);
    setLooks(await getLooks());
    setOpenLookId(null);
  }

  const openLook = looks.find((look) => look.id === openLookId);

  // ---------- Detail view: one look, every piece up close ----------
  if (openLook) {
    return (
      <div>
        <button onClick={() => setOpenLookId(null)}>← Back to Lookbook</button>
        <h3>{openLook.aesthetic} · {openLook.weather}</h3>
        {openLook.savedAt && <p>Saved {new Date(openLook.savedAt).toLocaleDateString()}</p>}

        {SLOTS.map((category) => {
          const item = findItem(openLook.itemIds[category]);
          return (
            <div key={category} style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
              <div style={{ width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #ccc' }}>
                {item
                  ? <img src={item.image} alt={category} style={{ maxWidth: '100%', maxHeight: '100%' }} />
                  : <span>No {category}</span>}
              </div>
              <div>
                <strong style={{ textTransform: 'capitalize' }}>{category}</strong>
                {item ? (
                  <>
                    <div>Color: {item.color || '—'}</div>
                    <div>Warmth: {item.warmth || '—'}</div>
                    <div>Style: {(item.tags || []).join(', ') || '—'}</div>
                  </>
                ) : (
                  <div>This piece isn't in your closet anymore.</div>
                )}
              </div>
            </div>
          );
        })}

        <button onClick={() => handleRemove(openLook.id)}>Remove this look</button>
      </div>
    );
  }

  // ---------- Grid view: all saved looks ----------
  return (
    <div>
      {looks.length === 0 && <p>No saved looks yet. Save one from Style Me!</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
        {looks.map((look) => (
          <div
            key={look.id}
            onClick={() => setOpenLookId(look.id)}
            style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center', cursor: 'pointer' }}
          >
            {SLOTS.map((category) => {
              const item = findItem(look.itemIds[category]);
              return item ? (
                <img
                  key={category}
                  src={item.image}
                  alt={category}
                  style={{ display: 'block', margin: '0 auto', maxWidth: '100%', height: 80, objectFit: 'contain' }}
                />
              ) : null;
            })}
            <div>{look.aesthetic} · {look.weather}</div>
            <small>Tap to see the outfit</small>
          </div>
        ))}
      </div>
    </div>
  );
}
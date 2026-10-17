import { useState } from 'react';
import PlanOutfitModal from '../components/PlanOutfitModal';
import { SLOT_LABELS, normalizeOutfit, outfitPieces } from '../outfit';
import './MyLooks.css';

// closet and looks come from App.jsx, so the Lookbook always matches My Closet and Style Me.
// Looks saved before dresses existed only have { top, bottom, shoes }; normalizeOutfit() reads both shapes.
export default function MyLooks({ closet, looks, onRemoveLook, onAddPlan, onRestyle, onGoTo }) {
  // Which look is open (null = show the grid).
  const [openLookId, setOpenLookId] = useState(null);
  const [planning, setPlanning] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState('');

  async function handleRemove(id) {
    if (removing) return;
    setRemoving(true);
    setMessage('');
    try {
      await onRemoveLook(id);
      setOpenLookId(null);
    } catch {
      setMessage('Could not remove this look. Please try again.');
    } finally {
      setRemoving(false);
    }
  }

  async function handlePlan(look, { date, occasion, notes }) {
    // The plan gets its own copy of the item ids, so editing it later never changes this favorite.
    await onAddPlan({ date, occasion, notes, outfit: normalizeOutfit(look.itemIds), lookId: look.id });
    setPlanning(false);
    setMessage('📅 Added to My Week!');
  }

  const openLook = looks.find((look) => look.id === openLookId);

  // ---------- Detail view: one look, every piece up close ----------
  if (openLook) {
    const pieces = outfitPieces(openLook.itemIds, closet);
    return (
      <div className="lookbook-detail">
        <button className="od-secondary-btn" onClick={() => { setOpenLookId(null); setMessage(''); }}>
          ← Back to Lookbook
        </button>
        <h3>{openLook.aesthetic} · {openLook.weather}</h3>
        {openLook.savedAt && <p className="lookbook-muted">Saved {new Date(openLook.savedAt).toLocaleDateString()}</p>}
        {openLook.darling?.request && (
          <blockquote className="lookbook-darling">
            <p>“{openLook.darling.request}”</p>
            {openLook.darling.explanation && <p>{openLook.darling.explanation}</p>}
          </blockquote>
        )}

        {pieces.map((piece) => {
          const item = piece.item;
          return (
            <div key={`${piece.slot}-${piece.id || 'empty'}`} className="lookbook-piece">
              <div className="lookbook-piece-image">
                {item
                  ? <img src={item.image} alt={item.name || piece.slot} />
                  : <span>No {SLOT_LABELS[piece.slot].toLowerCase()}</span>}
              </div>
              <div>
                <strong>{item?.name || SLOT_LABELS[piece.slot]}</strong>
                {item ? (
                  <>
                    <div>Color: {item.color || '—'}</div>
                    <div>Warmth: {item.warmth || '—'}</div>
                    <div>Style: {(item.tags || []).join(', ') || '—'}</div>
                  </>
                ) : piece.id ? (
                  <div>This piece isn&apos;t in your closet anymore.</div>
                ) : null}
              </div>
            </div>
          );
        })}

        {message && <p className="lookbook-message" role="status">{message}</p>}

        <div className="lookbook-actions">
          <button className="od-primary-btn" onClick={() => setPlanning(true)}>♡ Plan This Outfit</button>
          <button className="od-secondary-btn" onClick={() => onRestyle(normalizeOutfit(openLook.itemIds))}>
            ✧ Restyle in Style Me
          </button>
          <button className="od-secondary-btn" onClick={() => handleRemove(openLook.id)} disabled={removing}>
            {removing ? 'Removing…' : 'Remove this look'}
          </button>
        </div>
        <p className="lookbook-muted">Restyling starts a new outfit; this saved look stays as it is.</p>

        {planning && (
          <PlanOutfitModal
            closet={closet}
            outfit={openLook.itemIds}
            onSubmit={(details) => handlePlan(openLook, details)}
            onClose={() => setPlanning(false)}
          />
        )}
      </div>
    );
  }

  // ---------- Grid view: all saved looks ----------
  if (looks.length === 0) {
    return (
      <div className="placeholder-card">
        <span className="placeholder-icon">♡</span>
        <h3>No saved looks yet</h3>
        <p>Save an outfit you love from Style Me and it will appear here.</p>
        <button type="button" onClick={() => onGoTo('style')}>✧ Go to Style Me</button>
      </div>
    );
  }

  return (
    <div className="lookbook-grid">
      {looks.map((look) => (
        <button
          type="button"
          key={look.id}
          className="lookbook-card"
          onClick={() => setOpenLookId(look.id)}
        >
          {outfitPieces(look.itemIds, closet).map((piece) =>
            piece.item ? (
              <img
                key={`${piece.slot}-${piece.id}`}
                src={piece.item.image}
                alt={piece.slot}
                className={piece.slot === 'accessory' ? 'lookbook-card-accessory' : ''}
              />
            ) : null
          )}
          <span>{look.aesthetic} · {look.weather}</span>
          <small>Tap to see the outfit</small>
        </button>
      ))}
    </div>
  );
}

import { useState } from 'react';
import PlanOutfitModal from '../components/PlanOutfitModal';
import { SLOT_LABELS, normalizeOutfit, outfitPieces } from '../outfit';
import './MyLooks.css';

// ---------- Journal book settings ----------
const LOOKS_PER_PAGE = 2;
const LOOKS_PER_SPREAD = LOOKS_PER_PAGE * 2;
// Each polaroid gets its own tilt and tape, so the page feels hand-made.
const TILTS = ['-3deg', '2deg', '-1.5deg', '2.5deg', '-2deg'];
const TAPE_TILTS = ['-4deg', '5deg', '-2deg', '3deg'];
const TAPES = ['jb-washi-pink', 'jb-washi-green', 'jb-washi-dots', 'jb-washi-gingham'];
const WEATHER_EMOJI = { hot: '☀️', mild: '⛅', cold: '❄️' };

function formatDate(raw) {
  if (!raw) return null;
  return new Date(raw).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// closet and looks come from App.jsx, so the Lookbook always matches My Closet and Style Me.
// Looks saved before dresses existed only have { top, bottom, shoes }; normalizeOutfit() reads both shapes.
export default function MyLooks({ closet, looks, onRemoveLook, onAddPlan, onRestyle, onGoTo }) {
  // Which look is open (null = show the book).
  const [openLookId, setOpenLookId] = useState(null);
  const [planning, setPlanning] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState('');
  // Which two-page spread of the book is showing.
  const [spread, setSpread] = useState(0);

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

  // ---------- Empty state ----------
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

  // ---------- Journal book view ----------
  const spreadCount = Math.max(1, Math.ceil(looks.length / LOOKS_PER_SPREAD));
  // If a look was just removed, don't stay on a page that no longer exists.
  const currentSpread = Math.min(spread, spreadCount - 1);
  const start = currentSpread * LOOKS_PER_SPREAD;
  const spreadLooks = looks.slice(start, start + LOOKS_PER_SPREAD);
  const pages = [spreadLooks.slice(0, LOOKS_PER_PAGE), spreadLooks.slice(LOOKS_PER_PAGE)];

  function renderPolaroid(look, positionInSpread) {
    const n = start + positionInSpread; // overall position, so a look keeps its tilt and tape
    const date = formatDate(look.savedAt);
        const title = look.name || look.aesthetic;
    const pieces = outfitPieces(look.itemIds, closet).filter((piece) => piece.item);
    return (
      <button
        type="button"
        key={look.id}
        className="jb-polaroid"
        style={{
          '--tilt': TILTS[n % TILTS.length],
          '--tape-tilt': TAPE_TILTS[n % TAPE_TILTS.length],
        }}
        onClick={() => setOpenLookId(look.id)}
        aria-label={`Open ${title}${date ? ` from ${date}` : ''}`}
      >
        <span className={`jb-washi ${TAPES[n % TAPES.length]}`} aria-hidden="true" />
        <span className="jb-photo">
          {pieces.map((piece) => (
            <img
              key={`${piece.slot}-${piece.id}`}
              src={piece.item.image}
              alt=""
              className={piece.slot === 'accessory' ? 'jb-photo-accessory' : ''}
            />
          ))}
        </span>
        <span className="jb-caption" title={title}>
          {title} {WEATHER_EMOJI[look.weather] || ''}
        </span>
        {date && <span className="jb-date">{date}</span>}
      </button>
    );
  }

  return (
    <div>
      <div className="jb-book">
        {pages.map((pageLooks, p) => (
          <div key={p} className={`jb-page ${p === 0 ? 'jb-left' : 'jb-right'}`}>
            {pageLooks.map((look, i) => renderPolaroid(look, p * LOOKS_PER_PAGE + i))}
            <span className="jb-page-number">{currentSpread * 2 + p + 1}</span>
          </div>
        ))}
      </div>

      {spreadCount > 1 && (
        <div className="jb-nav">
          <button type="button" onClick={() => setSpread(currentSpread - 1)} disabled={currentSpread === 0}>
            ← prev page
          </button>
          <span>{currentSpread + 1} / {spreadCount}</span>
          <button
            type="button"
            onClick={() => setSpread(currentSpread + 1)}
            disabled={currentSpread >= spreadCount - 1}
          >
            next page →
          </button>
        </div>
      )}
    </div>
  );
}
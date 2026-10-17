import { useEffect, useRef, useState } from 'react';
import { API_URL } from '../api/config';
import { askDarling } from '../api/stylist';
import PlanOutfitModal from '../components/PlanOutfitModal';
import { OUTFIT_MODES, SLOT_LABELS, isOutfitEmpty, normalizeOutfit, outfitPieces, outfitSignature } from '../outfit';
import { addDays, daysBetween, formatDate, relativeDayLabel, toDateKey } from '../dates';
import './StyleMe.css';

// Used until /api/options answers, and when the backend is offline.
const FALLBACK_AESTHETICS = ['90s rom-com', 'Clean girl', 'Y2K', 'Dark academia', 'Streetwear'];
const WEATHER_OPTIONS = [
  { value: 'hot', label: 'Hot', icon: '☀️' },
  { value: 'mild', label: 'Mild', icon: '🌤️' },
  { value: 'cold', label: 'Cold', icon: '❄️' },
];
const EMPTY_LABELS = { top: 'No tops yet', bottom: 'No bottoms yet', dress: 'No dresses yet', shoes: 'No shoes yet' };
const EXAMPLE_REQUESTS = [
  { label: 'First date', text: "First date tomorrow at a nice restaurant. It'll be chilly. Feminine but a little edgy, without trying too hard." },
  { label: 'Presentation', text: "I have a presentation tomorrow. Professional but still cute, and it's freezing outside." },
  { label: 'Brunch', text: "Brunch with my friends and I want a 90s rom-com vibe." },
];
// Open-Meteo only forecasts about two weeks ahead.
const FORECAST_DAYS = 15;
const TOAST_MS = 4000;

// closet comes from App.jsx, so it always matches what My Closet shows.
// draft (also kept in App.jsx) is the outfit on the dressing room, so it survives switching tabs.
export default function StyleMe({ closet, looks, draft, setDraft, onSaveLook, onAddPlan, onUpdatePlan, onGoTo }) {
  const [aesthetics, setAesthetics] = useState(FALLBACK_AESTHETICS);
  const [aesthetic, setAesthetic] = useState(FALLBACK_AESTHETICS[0]);
  const [weather, setWeather] = useState('mild');
  // Only send the weather pick to Darling once the user has actually chosen one.
  const [weatherChosen, setWeatherChosen] = useState(false);

  const [styling, setStyling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [lookName, setLookName] = useState('');

  // Ask Darling
  const [request, setRequest] = useState('');
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState('');
  const [darling, setDarling] = useState(null);
  const [forecastDate, setForecastDate] = useState(() => draft.planDate || toDateKey());
  const [forecast, setForecast] = useState(null);
  const [checkingForecast, setCheckingForecast] = useState(false);

  const toastTimer = useRef(null);
  const dollRef = useRef(null);

  // Load the aesthetic menu when the page opens.
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/options`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !Array.isArray(data.aesthetics) || data.aesthetics.length === 0) return;
        setAesthetics(data.aesthetics);
        setAesthetic((current) => (data.aesthetics.includes(current) ? current : data.aesthetics[0]));
      })
      // Offline: the built-in list above keeps quick styling usable.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Clear a pending toast timer if the page closes. (We want the latest timer here, not a snapshot.)
  useEffect(() => {
    const timer = toastTimer;
    return () => clearTimeout(timer.current);
  }, []);

  function showToast(text, tone = 'success', action = null) {
    clearTimeout(toastTimer.current);
    setToast({ text, tone, action });
    toastTimer.current = setTimeout(() => setToast(null), action ? TOAST_MS + 2000 : TOAST_MS);
  }

  function itemsIn(category) {
    return closet.filter((item) => item.category === category);
  }

  // The piece a carousel row is showing: the picked one, or the first in that category.
  function shownItem(slot) {
    const items = itemsIn(slot);
    return items.find((item) => item.id === draft.picks[slot]) || items[0] || null;
  }

  const mode = draft.mode;
  const slots = OUTFIT_MODES[mode];
  const accessoryItems = itemsIn('accessory');
  const chosenAccessories = draft.accessories.filter((id) => accessoryItems.some((item) => item.id === id));

  // What's on the dressing room right now, in the shared outfit shape.
  const currentOutfit = { type: mode, top: null, bottom: null, dress: null, shoes: null, accessories: chosenAccessories };
  for (const slot of slots) currentOutfit[slot] = shownItem(slot)?.id || null;
  const signature = outfitSignature(currentOutfit);
  const outfitEmpty = isOutfitEmpty(currentOutfit);
  // Already in the Lookbook? Then block a duplicate save.
  const alreadySaved = looks.some((look) => outfitSignature(look.itemIds) === signature);

  // Arrow buttons: move one step left (-1) or right (+1), wrapping around.
  function step(slot, direction) {
    const items = itemsIn(slot);
    const count = items.length;
    if (count === 0) return;
    const index = Math.max(0, items.findIndex((item) => item.id === shownItem(slot)?.id));
    const next = items[(index + direction + count) % count];
    setDraft((previous) => ({ ...previous, picks: { ...previous.picks, [slot]: next.id } }));
  }

  function setMode(nextMode) {
    setDraft((previous) => ({ ...previous, mode: nextMode }));
  }

  function toggleAccessory(id) {
    setDraft((previous) => ({
      ...previous,
      accessories: previous.accessories.includes(id)
        ? previous.accessories.filter((accessoryId) => accessoryId !== id)
        : [...previous.accessories, id],
    }));
  }

  // Ask the backend for an outfit, then point each row at what it picked.
  async function styleMe() {
    if (styling) return;
    // The backend rejects an empty closet, so explain instead of showing a generic error.
    if (closet.length === 0) {
      showToast('Add some clothes in My Closet first.', 'error');
      return;
    }

    setStyling(true);
    try {
      // Send only the item info, not the photos, to keep it fast.
      // JSON.stringify drops undefined fields, so the image is left out of the request.
      const lightCloset = closet.map((item) => ({ ...item, image: undefined }));

      const response = await fetch(`${API_URL}/api/outfit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closet: lightCloset, aesthetic, weather, mode }),
      });
      const outfit = await response.json();
      if (!response.ok) throw new Error(outfit.error);

      const picks = {};
      for (const slot of slots) {
        if (outfit[slot]?.id) picks[slot] = outfit[slot].id;
      }
      setDraft((previous) => ({ ...previous, picks: { ...previous.picks, ...picks } }));
      setDarling(null);
      showToast('✧ A fresh fit, darling!');
    } catch (err) {
      console.error(err);
      showToast("Couldn't reach the stylist. You can still style by hand ♡", 'error');
    } finally {
      setStyling(false);
    }
  }

  // Save whatever the dressing room is showing right now.
  async function handleSaveLook() {
    if (saving || outfitEmpty || alreadySaved) return;
    setSaving(true);
    try {
      const look = { itemIds: normalizeOutfit(currentOutfit), aesthetic, weather };
            const name = lookName.trim();
      if (name) look.name = name;
      if (darling && darling.signature === signature) {
        look.darling = { request: darling.request, explanation: darling.result.explanation };
      }
      await onSaveLook(look);
            setLookName('');
      showToast('💖 Saved to your Lookbook!', 'success', { label: 'See Lookbook', onClick: () => onGoTo('saved') });
    } catch {
      showToast('Could not save this look. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  }

  // Called by the plan pop-up. Throwing keeps the pop-up open with an error.
  async function handlePlanSubmit({ date, occasion, notes }) {
    const outfit = normalizeOutfit(currentOutfit);
    if (draft.editingPlan) {
      const updated = await onUpdatePlan(draft.editingPlan.id, { date, occasion, notes, outfit });
      if (!updated) throw new Error('Plan not found');
    } else {
      await onAddPlan({ date, occasion, notes, outfit });
    }
    setDraft((previous) => ({ ...previous, editingPlan: null, planDate: null }));
    setShowPlanModal(false);
    const day = relativeDayLabel(date);
    showToast(`📅 Planned for ${day === 'Today' || day === 'Tomorrow' ? day.toLowerCase() : day}!`, 'success', {
      label: 'See My Week',
      onClick: () => onGoTo('planner'),
    });
  }

  function stopEditingPlan() {
    setDraft((previous) => ({ ...previous, editingPlan: null }));
  }

  // ---------- Ask Darling ----------
  async function handleAsk(tryAnother = false) {
    if (asking) return;
    const text = tryAnother ? darling?.request : request.trim();
    if (!text) {
      setAskError("Tell Darling where you're going or what you need ♡");
      return;
    }
    if (closet.length === 0) {
      setAskError('Your closet is empty, so Darling has nothing to style yet. Add clothes in My Closet first.');
      return;
    }

    setAsking(true);
    setAskError('');
    try {
      // Try Another: tell Darling which combinations it already suggested.
      const avoid = tryAnother && darling ? [...darling.avoid, darling.result.selectedItemIds].slice(-5) : [];
      const result = await askDarling({
        closet,
        request: text,
        weather: weatherChosen ? weather : undefined,
        forecast: forecast || undefined,
        today: toDateKey(),
        avoid,
      });

      // Darling may leave a slot empty (e.g. no suitable shoes): keep what's already showing there.
      const applied = { ...result.outfit };
      for (const slot of OUTFIT_MODES[result.outfit.type]) {
        if (!applied[slot]) applied[slot] = shownItem(slot)?.id || null;
      }
      if (!isOutfitEmpty(result.outfit)) {
        setDraft((previous) => ({
          ...previous,
          mode: applied.type,
          picks: { ...previous.picks, ...Object.fromEntries(OUTFIT_MODES[applied.type].map((slot) => [slot, applied[slot]])) },
          accessories: applied.accessories,
        }));
      }
      setDarling({ request: text, result, signature: outfitSignature(applied), avoid });

      // On phones the dressing room sits below this panel, so bring the new outfit into view.
      if (window.matchMedia('(max-width: 760px)').matches) {
        dollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (err) {
      setAskError(err.message || "Darling couldn't answer right now. Please try again.");
    } finally {
      setAsking(false);
    }
  }

  const today = toDateKey();
  const forecastOffset = daysBetween(today, forecastDate);
  const forecastInRange = forecastOffset >= 0 && forecastOffset < FORECAST_DAYS;

  async function checkForecast() {
    if (checkingForecast) return;
    if (!forecastInRange) {
      setAskError('Forecasts only go about two weeks ahead. Describe the weather in your message instead ♡');
      return;
    }
    if (!navigator.geolocation) {
      setAskError("This browser can't share your location. Describe the weather in your message instead ♡");
      return;
    }

    setCheckingForecast(true);
    setAskError('');
    try {
      const position = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, maximumAge: 600000 })
      );
      // Two decimals (about 1 km) is plenty for a forecast.
      const params = new URLSearchParams({
        lat: position.coords.latitude.toFixed(2),
        lon: position.coords.longitude.toFixed(2),
        date: forecastDate,
      });
      const response = await fetch(`${API_URL}/api/weather?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setForecast(data);
      setWeather(data.weather);
      setWeatherChosen(true);
    } catch (err) {
      if (err?.code === 1) {
        setAskError("Location is turned off, so Darling can't check the forecast. Just describe the weather instead ♡");
      } else {
        setAskError(err?.message && !err.code ? err.message : "Couldn't get the forecast. Describe the weather in your message instead ♡");
      }
    } finally {
      setCheckingForecast(false);
    }
  }

  const planButtonLabel = draft.editingPlan ? '♡ Update This Plan' : '♡ Plan This Outfit';

  if (closet.length === 0) {
    return (
      <div className="dressing-room">
        <div className="dr-window-bar">
          <span>♡ darling&apos;s dressing room ♡</span>
          <span aria-hidden="true">□ ×</span>
        </div>
        <div className="dr-empty-room">
          <span aria-hidden="true">👗</span>
          <h3>Your dressing room is empty!</h3>
          <p>Add a few pieces to My Closet and come back to play dress-up.</p>
          <button type="button" className="od-primary-btn" onClick={() => onGoTo('closet')}>
            ♡ Go to My Closet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dressing-room">
      <div className="dr-window-bar">
        <span>♡ darling&apos;s dressing room ♡</span>
        <span aria-hidden="true">□ ×</span>
      </div>

      {draft.editingPlan && (
        <div className="dr-banner">
          <p>
            Editing your plan for <strong>{formatDate(draft.editingPlan.date)}</strong>
            {draft.editingPlan.occasion && <> · {draft.editingPlan.occasion}</>}. Changes only update that plan.
          </p>
          <button type="button" className="od-secondary-btn" onClick={stopEditingPlan}>
            Stop editing
          </button>
        </div>
      )}

      <div className="dr-body">
        {/* ---------- Ask Darling ---------- */}
        <section className="dr-ask" aria-labelledby="ask-darling-title">
          <h3 id="ask-darling-title" className="dr-section-title">
            Ask Darling ♡
          </h3>
          <p className="dr-hint">Tell Darling where you&apos;re going, the weather and the vibe.</p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleAsk(false);
            }}
          >
            <label className="visually-hidden" htmlFor="darling-request">
              Describe your plans
            </label>
            <textarea
              id="darling-request"
              className="dr-textarea"
              rows={3}
              maxLength={600}
              placeholder="I'm going to brunch with friends and want a 90s rom-com vibe…"
              value={request}
              onChange={(event) => setRequest(event.target.value)}
            />

            <div className="od-chip-row dr-examples" aria-label="Example requests">
              {EXAMPLE_REQUESTS.map((example) => (
                <button key={example.label} type="button" className="od-chip" onClick={() => setRequest(example.text)}>
                  {example.label}
                </button>
              ))}
            </div>

            <div className="dr-forecast">
              {forecast ? (
                <span className="dr-forecast-chip">
                  🌡️ {relativeDayLabel(forecast.date, today)}: {Math.round(forecast.high)}° / {Math.round(forecast.low)}°F
                  {typeof forecast.rainChance === 'number' && ` · ${forecast.rainChance}% rain`}
                  <button type="button" aria-label="Stop using the forecast" onClick={() => setForecast(null)}>
                    ×
                  </button>
                </span>
              ) : (
                <>
                  <label className="visually-hidden" htmlFor="forecast-date">
                    Forecast date
                  </label>
                  <input
                    id="forecast-date"
                    type="date"
                    className="dr-date-input"
                    min={today}
                    max={addDays(today, FORECAST_DAYS - 1)}
                    value={forecastDate}
                    onChange={(event) => setForecastDate(event.target.value)}
                  />
                  <button type="button" className="od-chip" onClick={checkForecast} disabled={checkingForecast || !forecastInRange}>
                    {checkingForecast ? 'Checking…' : '📍 Use forecast'}
                  </button>
                </>
              )}
            </div>
            {!forecast && !forecastInRange && (
              <p className="dr-hint">Forecasts only go about two weeks ahead. Describe the weather instead.</p>
            )}

            {askError && (
              <p className="od-error" role="alert">
                {askError}
              </p>
            )}

            <button type="submit" className="dr-ask-btn" disabled={asking}>
              {asking ? 'Darling is thinking…' : '♡ Ask Darling'}
            </button>
          </form>
        </section>

        {/* ---------- The paper-doll outfit ---------- */}
        <section className="dr-doll-area" ref={dollRef} aria-label="Your outfit">
          <div className="dr-vibe">
            <h3 className="dr-section-title">Choose your vibe</h3>
            <div className="od-chip-row" role="group" aria-label="Aesthetic">
              {aesthetics.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="od-chip"
                  aria-pressed={aesthetic === option}
                  onClick={() => setAesthetic(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="od-chip-row" role="group" aria-label="Weather">
              {WEATHER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="od-chip"
                  aria-pressed={weather === option.value}
                  onClick={() => {
                    setWeather(option.value);
                    setWeatherChosen(true);
                  }}
                >
                  <span aria-hidden="true">{option.icon}</span> {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="dr-mode-toggle" role="group" aria-label="Outfit type">
            <button type="button" aria-pressed={mode === 'separates'} onClick={() => setMode('separates')}>
              Top + Bottom
            </button>
            <button type="button" aria-pressed={mode === 'dress'} onClick={() => setMode('dress')}>
              Dress
            </button>
          </div>

          <div className="dr-doll">
            {slots.map((slot) => {
              const items = itemsIn(slot);
              const item = shownItem(slot);
              const position = item ? items.indexOf(item) + 1 : 0;
              const label = SLOT_LABELS[slot];

              return (
                <div className={`dr-slot dr-slot-${slot}`} key={slot}>
                  <button
                    type="button"
                    className="dr-arrow"
                    onClick={() => step(slot, -1)}
                    disabled={items.length < 2}
                    aria-label={`Previous ${label.toLowerCase()}`}
                  >
                    ◀
                  </button>
                  <figure className="dr-piece">
                    <figcaption className="dr-slot-label">
                      {label}
                      {items.length > 1 && (
                        <span className="dr-count">
                          {position}/{items.length}
                        </span>
                      )}
                    </figcaption>
                    <div className="dr-piece-frame">
                      {item ? (
                        <img src={item.image} alt={item.name || label} />
                      ) : (
                        <span className="dr-piece-empty">{EMPTY_LABELS[slot]}</span>
                      )}
                    </div>
                    {item?.name && <span className="dr-piece-name">{item.name}</span>}
                  </figure>
                  <button
                    type="button"
                    className="dr-arrow"
                    onClick={() => step(slot, 1)}
                    disabled={items.length < 2}
                    aria-label={`Next ${label.toLowerCase()}`}
                  >
                    ▶
                  </button>
                </div>
              );
            })}
          </div>

          {accessoryItems.length > 0 && (
            <div className="dr-accessories">
              <span className="dr-slot-label">Accessories · optional</span>
              <div className="dr-accessory-row">
                {accessoryItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="dr-accessory"
                    aria-pressed={chosenAccessories.includes(item.id)}
                    aria-label={`${chosenAccessories.includes(item.id) ? 'Remove' : 'Add'} ${item.name || 'accessory'}`}
                    title={item.name}
                    onClick={() => toggleAccessory(item.id)}
                  >
                    <img src={item.image} alt="" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {darling && <DarlingCard darling={darling} closet={closet} changed={darling.signature !== signature} asking={asking} onTryAnother={() => handleAsk(true)} />}

          <button type="button" className="dr-style-btn" onClick={styleMe} disabled={styling}>
            {styling ? 'Styling…' : '✧ Style Me! ✧'}
          </button>
          <label className="visually-hidden" htmlFor="look-name">Name this look</label>
          <input
            id="look-name"
            type="text"
            className="dr-textarea dr-look-name"
            placeholder="Name this look (optional), e.g. Sunday brunch"
            maxLength={40}
            value={lookName}
            onChange={(e) => setLookName(e.target.value)}
            disabled={outfitEmpty || alreadySaved}
          />
          <div className="dr-actions">
            <button
              type="button"
              className="od-secondary-btn"
              onClick={handleSaveLook}
              disabled={saving || outfitEmpty || alreadySaved}
            >
              {saving ? 'Saving…' : alreadySaved ? '💖 Saved!' : '♡ Save This Look'}
            </button>
            <button
              type="button"
              className="od-secondary-btn"
              onClick={() => setShowPlanModal(true)}
              disabled={outfitEmpty}
            >
              {planButtonLabel}
            </button>
          </div>
          {outfitEmpty && <p className="dr-hint dr-center">Add a piece to save or plan this outfit.</p>}
        </section>
      </div>

      <div className="dr-toast-region" role="status" aria-live="polite">
        {toast && (
          <div className={`dr-toast dr-toast-${toast.tone}`}>
            <span>{toast.text}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  setToast(null);
                  toast.action.onClick();
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>

      {showPlanModal && (
        <PlanOutfitModal
          closet={closet}
          outfit={currentOutfit}
          plan={draft.editingPlan}
          defaultDate={draft.planDate}
          title={draft.editingPlan ? '♡ Update Planned Outfit' : '♡ Plan This Outfit'}
          submitLabel={draft.editingPlan ? '♡ Save Changes' : '♡ Add to My Week'}
          onSubmit={handlePlanSubmit}
          onClose={() => setShowPlanModal(false)}
        />
      )}
    </div>
  );
}

// Darling's explanation, styling tips and any honest warnings.
function DarlingCard({ darling, closet, changed, asking, onTryAnother }) {
  const { result } = darling;
  const heard = Object.values(result.understood || {}).filter(Boolean);
  const pieces = outfitPieces(result.outfit, closet).filter((piece) => piece.item);

  return (
    <div className={`dr-darling-card ${result.meetsRequest ? '' : 'is-warning'}`}>
      <strong className="dr-darling-title">
        {result.meetsRequest ? 'Darling picked this for you! ♡' : "Darling's closest match ♡"}
      </strong>

      {heard.length > 0 && (
        <div className="dr-heard">
          <span className="visually-hidden">Darling understood: </span>
          {heard.map((value) => (
            <span key={value}>{value}</span>
          ))}
        </div>
      )}

      {pieces.length > 0 && (
        <ul className="dr-picked">
          {pieces.map((piece) => (
            <li key={`${piece.slot}-${piece.id}`}>
              <span>{SLOT_LABELS[piece.slot]}:</span> {piece.item.name || piece.item.category}
            </li>
          ))}
        </ul>
      )}

      {result.explanation && <p>{result.explanation}</p>}

      {result.limitations.length > 0 && (
        <div className="dr-limitations" role="note">
          <strong>Heads up</strong>
          <ul>
            {result.limitations.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
          {result.missingPieces.length > 0 && <p>Pieces that would help: {result.missingPieces.join(', ')}.</p>}
        </div>
      )}

      {result.stylingTips.length > 0 && (
        <ul className="dr-tips">
          {result.stylingTips.map((tip) => (
            <li key={tip}>✧ {tip}</li>
          ))}
        </ul>
      )}

      {changed && <p className="dr-hint">You&apos;ve swapped some of Darling&apos;s picks. Save or plan whenever you&apos;re happy.</p>}

      <button type="button" className="od-chip" onClick={onTryAnother} disabled={asking}>
        {asking ? 'Thinking…' : '↻ Try Another'}
      </button>
    </div>
  );
}

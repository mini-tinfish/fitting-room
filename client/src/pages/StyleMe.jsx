import { useEffect, useState } from 'react';
   import { getCloset } from '../closetStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const SLOTS = ['top', 'bottom', 'shoes'];

export default function StyleMe() {
  const [closet, setCloset] = useState([]);
  const [aesthetics, setAesthetics] = useState([]);
  const [aesthetic, setAesthetic] = useState('');
  const [weather, setWeather] = useState('mild');
  // Which item each carousel row is showing (its position in that category).
  const [picks, setPicks] = useState({ top: 0, bottom: 0, shoes: 0 });
  const [status, setStatus] = useState('');

  // Load the closet and the aesthetic menu when the page opens.
  useEffect(() => {
    getCloset().then(setCloset);
    fetch(`${API_URL}/api/options`)
      .then((res) => res.json())
      .then((data) => {
        setAesthetics(data.aesthetics);
        setAesthetic(data.aesthetics[0]);
      })
      .catch(() => setStatus('Could not load options.'));
  }, []);

  function itemsIn(category) {
    return closet.filter((item) => item.category === category);
  }

  // Arrow buttons: move one step left (-1) or right (+1), wrapping around.
  function step(category, direction) {
    const count = itemsIn(category).length;
    if (count === 0) return;
    setPicks({ ...picks, [category]: (picks[category] + direction + count) % count });
  }

  // Ask the backend for an outfit, then point each row at what it picked.
  async function styleMe() {
    setStatus('Styling...');
    try {
      // Send only the item info, not the photos, to keep it fast.
      const lightCloset = closet.map(({ image, ...info }) => info);

      const response = await fetch(`${API_URL}/api/outfit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closet: lightCloset, aesthetic, weather }),
      });
      const outfit = await response.json();
      if (!response.ok) throw new Error(outfit.error);

      const newPicks = {};
      for (const category of SLOTS) {
        const index = itemsIn(category).findIndex((item) => item.id === outfit[category]?.id);
        newPicks[category] = index >= 0 ? index : 0;
      }
      setPicks(newPicks);
      setStatus('');
    } catch (err) {
      console.error(err);
      setStatus('Could not get an outfit.');
    }
  }

  return (
    <div>
      <h2>Style Me</h2>

      <label>
        Aesthetic{' '}
        <select value={aesthetic} onChange={(e) => setAesthetic(e.target.value)}>
          {aesthetics.map((a) => <option key={a}>{a}</option>)}
        </select>
      </label>{' '}

      <label>
        Weather{' '}
        <select value={weather} onChange={(e) => setWeather(e.target.value)}>
          <option>hot</option>
          <option>mild</option>
          <option>cold</option>
        </select>
      </label>{' '}

      <button onClick={styleMe}>✨ Style me</button>
      <p>{status}</p>

      {SLOTS.map((category) => {
        const items = itemsIn(category);
        const item = items[picks[category]];
        return (
          <div key={category} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, margin: '8px 0' }}>
            <button onClick={() => step(category, -1)} disabled={items.length < 2}>◀</button>
            <div style={{ width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #ccc' }}>
              {item
                ? <img src={item.image} alt={category} style={{ maxWidth: '100%', maxHeight: '100%' }} />
                : <span>No {category} yet</span>}
            </div>
            <button onClick={() => step(category, 1)} disabled={items.length < 2}>▶</button>
          </div>
        );
      })}
    </div>
  );
}
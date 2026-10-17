import { useEffect, useState } from 'react';
import CameraUpload from './CameraUpload';
import { getCloset, addItem, removeItem } from './closetStore';

// Options for the "What is this?" form.
// Tags are lowercase so they match the backend outfit picker.
const CATEGORIES = ['top', 'bottom', 'shoes', 'accessory'];
const WARMTH = ['light', 'medium', 'warm'];
const TAGS = ['casual', 'cute', 'y2k', 'clean girl', 'dark academia', '90s rom-com', 'streetwear'];

export default function MyCloset() {
  const [closet, setCloset] = useState([]);
  const [newImage, setNewImage] = useState(null);
  const [category, setCategory] = useState('top');
  const [color, setColor] = useState('');
  const [warmth, setWarmth] = useState('medium');
  const [tags, setTags] = useState([]);
  const [uploadKey, setUploadKey] = useState(0);

  // Load saved clothes when the page opens.
  useEffect(() => {
    getCloset().then(setCloset);
  }, []);

  function toggleTag(tag) {
    setTags(tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]);
  }

  async function handleSave() {
    await addItem({ image: newImage, category, color, warmth, tags });
    setCloset(await getCloset());

    // Reset the form for the next item.
    setNewImage(null);
    setColor('');
    setTags([]);
    setUploadKey(uploadKey + 1);
  }

  async function handleRemove(id) {
    await removeItem(id);
    setCloset(await getCloset());
  }

  return (
    <div>
      <h2>My Closet</h2>

      <CameraUpload key={uploadKey} onDone={setNewImage} />

      {newImage && (
        <div>
          <h3>What is this?</h3>

          <label>
            Category{' '}
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <br />

          <label>
            Color{' '}
            <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="pink" />
          </label>
          <br />

          <label>
            Warmth{' '}
            <select value={warmth} onChange={(e) => setWarmth(e.target.value)}>
              {WARMTH.map((w) => <option key={w}>{w}</option>)}
            </select>
          </label>

          <div>
            Style:{' '}
            {TAGS.map((tag) => (
              <label key={tag} style={{ marginRight: 8 }}>
                <input type="checkbox" checked={tags.includes(tag)} onChange={() => toggleTag(tag)} /> {tag}
              </label>
            ))}
          </div>

          <button onClick={handleSave}>Add to closet</button>
        </div>
      )}

      <h3>Your clothes ({closet.length})</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
        {closet.map((item) => (
          <div key={item.id} style={{ textAlign: 'center' }}>
            <img src={item.image} alt={item.category} style={{ width: '100%', height: 120, objectFit: 'contain' }} />
            <div>{item.category}</div>
            <button onClick={() => handleRemove(item.id)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}
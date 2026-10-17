import { useState } from 'react';

// Where the backend lives. Can be changed later with an env variable.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Shrink a photo so it's small enough to send quickly.
function resizeImage(file, maxSize = 1000) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function CameraUpload({ onDone }) {
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState('');

  async function handleFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setStatus('Shrinking photo...');
      const dataUrl = await resizeImage(file);
      setPreview(dataUrl);

      setStatus('Removing background...');
      const response = await fetch(`${API_URL}/api/remove-background`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setPreview(result.image);
      setStatus('Done!');
      if (onDone) onDone(result.image); // hands the clean image to whoever uses this
    } catch (err) {
      console.error(err);
      setStatus('Something went wrong. Try again.');
    }
  }

  return (
    <div>
      <label>
        📷 Take a photo of a clothing item
        <input type="file" accept="image/*" capture="environment" onChange={handleFile} />
      </label>
      <p>{status}</p>
      {preview && <img src={preview} alt="Clothing item" style={{ maxWidth: 300 }} />}
    </div>
  );
}
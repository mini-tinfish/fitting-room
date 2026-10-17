import { API_URL } from './config';

// Shrink a photo before sending it, so the upload stays quick.
// This copy only goes to the server; the transparent PNG that comes back is what gets saved.
function resizeImage(file, maxSize = 1000) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const context = canvas.getContext('2d');
      // JPEG has no transparency, so give see-through photos a white backdrop instead of black.
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Could not read this image.'));
    };
    img.src = URL.createObjectURL(file);
  });
}

// Send a clothing photo to /api/remove-background and get back a transparent PNG data URL.
// Errors carry `retryable` so the closet popup knows whether to offer "Try Again".
export async function removeBackground(file) {
  let dataUrl;
  try {
    dataUrl = await resizeImage(file);
  } catch (error) {
    throw Object.assign(new Error('Could not read this image. Try a different photo.', { cause: error }), { retryable: false });
  }

  let response;
  try {
    response = await fetch(`${API_URL}/api/remove-background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl }),
    });
  } catch (error) {
    throw Object.assign(new Error("Can't reach the server to remove the background.", { cause: error }), { retryable: true });
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.image !== 'string' || !data.image.startsWith('data:image/png')) {
    throw Object.assign(new Error(data.error || 'Background removal failed.'), { retryable: data.retryable !== false });
  }
  return data.image;
}

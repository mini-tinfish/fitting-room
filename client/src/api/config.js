// Where the backend lives. Set VITE_API_URL in client/.env (local) or as a Railway variable (production).
// Vite bakes this in at build time, so the variable must exist when `npm run build` runs.
// The localhost fallback is only for `npm run dev`; production builds never use it.
const configuredUrl = import.meta.env.VITE_API_URL;

if (!configuredUrl && import.meta.env.PROD) {
  console.error('VITE_API_URL was not set when this build was made, so API requests will fail.');
}

// Drop a trailing slash so `${API_URL}/api/...` never becomes "//api/...".
export const API_URL = (configuredUrl || (import.meta.env.DEV ? 'http://localhost:5000' : '')).replace(/\/+$/, '');

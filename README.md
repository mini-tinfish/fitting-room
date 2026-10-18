<div align="center">

# ♡ Outfit Darling ♡

*Your closet, your rules, darling.*

**[outfit-darling.us](https://outfit-darling.us)**

<sub>✧ a digital wardrobe ✧ a paper-doll dressing room ✧ a stylist on call ✧</sub>

</div>

---

Remember Cher's computer closet in *Clueless*? You'd click through tops and skirts until the outfit matched, and the screen would say so. **Outfit Darling** is our version of that: a digital wardrobe and outfit planner with a 90s fashion-magazine look, Windows 95-style windows, and a scrapbook feel.

Photograph the clothes you already own and they become cut-out paper dolls in your closet. Flip through them to build outfits, save the ones you love, pin them to the days you'll wear them, and ask Darling, your AI stylist, what to wear when you're stuck.

---

## ✦ Features

### 👚 My Closet
- Add clothing with a photo, a name, a color, a category and a fabric weight (lightweight, medium or heavyweight).
- Browse by **Tops, Bottoms, Dresses or Shoes**, or search by name, color or category.
- **Background removal** (via remove.bg) turns each photo into a clean cut-out. If removal fails or isn't set up, you can try again or keep the original photo.
- Remove pieces you no longer wear.

### ✨ Style Me
- A dressing-room board where you build an outfit piece by piece, with arrow buttons to flip through each slot.
- Switch between **top + bottom** and **dress** outfits, finished with shoes.
- **Style Me!** puts together a random outfit from your closet using the app's rule-based outfit picker. If you've loaded a forecast, it prefers pieces whose fabric weight suits the weather.

### ♡ Ask Darling
- Tell Darling where you're going and the vibe you want, in your own words, or start from an example prompt.
- Darling (Google Gemini) picks an outfit **only from pieces in your closet**, says why it works, and adds a few styling tips.
- Not feeling it? Ask for another look.

### ☁️ Weather-aware styling
- In Ask Darling, pick a date up to about two weeks ahead and tap **Use forecast**. The app uses your browser location to get that day's high, low and chance of rain from Open-Meteo.
- That forecast then shapes Darling's advice and the Style Me! picker. You can always just describe the weather yourself instead.

### 📅 My Week
- A weekly planner for pinning outfits to specific dates, with an occasion and notes.
- Plan from a saved look, or start a new outfit for a chosen day.
- View, edit, reschedule or remove planned outfits. Plans further out stay saved until you remove them.

### 📖 Lookbook
- Save your favorite outfits as polaroids in a flip-through lookbook.
- Open a look to see it up close, plan it for a date, take it back into Style Me to restyle, or remove it.

### 📲 Installable web app (PWA)
- Outfit Darling can be installed to a phone's home screen or a desktop like a native app, and updates itself when a new version ships.
- The core app files are cached for offline loading. Your closet, looks and plans are stored on your device in IndexedDB, so they're there without a connection.
- Style Me!, Ask Darling, forecasts and background removal all call the server, so they need an internet connection.

> **Note:** There are no accounts. Everything you save lives in the browser on the device you're using, so it doesn't sync between devices.

---

## ✦ How it works

```
  👚 Add clothing  →  ✨ Build outfits  →  ♡ Save favorites  →  📅 Plan your week  →  💬 Ask Darling
```

1. **Add clothing.** Snap or upload a photo, remove the background, and add its details.
2. **Build outfits.** Flip through your pieces on the Style Me board, or let Style Me! shuffle up a look.
3. **Save favorites.** Keep the outfits you love in your Lookbook.
4. **Plan your week.** Pin looks to the days you'll wear them, with notes for the occasion.
5. **Ask Darling.** When you're stuck, describe your plans and let Darling style you from your own closet.

---

## ✦ Tech stack

| | |
|---|---|
| **Frontend** | React 19, Vite, JavaScript, CSS |
| **On-device storage** | IndexedDB (via `idb-keyval`) |
| **PWA** | `vite-plugin-pwa` (web app manifest + auto-updating service worker) |
| **Backend** | Node.js, Express 5 |
| **AI stylist** | Google Gemini (`@google/genai`) |
| **Background removal** | remove.bg API |
| **Weather** | Open-Meteo forecast API + browser Geolocation |
| **Hosting** | Railway (separate web and API services) |

### Deployment

Both halves run on Railway as separate services:

| Service | URL |
|---|---|
| Web (client) | [outfit-darling.us](https://outfit-darling.us) · [outfit-darling-web-production.up.railway.app](https://outfit-darling-web-production.up.railway.app/) |
| API (server) | `https://outfit-darling-api-production.up.railway.app` |

---

## ✦ Getting started

### What you'll need
- **Node.js** 20.19+ or 22.12+ (required by Vite)
- **npm**
- Optional API keys:
  - a **Google Gemini API key** for Ask Darling
  - a **[remove.bg](https://www.remove.bg/api) API key** for background removal

Weather forecasts use Open-Meteo, which needs no key. Without the optional keys, the rest of the app still works: Ask Darling shows a setup message, and uploads let you keep the original photo.

### 1. Clone the repo

```bash
git clone https://github.com/mini-tinfish/fitting-room.git
cd fitting-room
```

### 2. Start the server

```bash
cd server
npm install
cp .env.example .env   # then fill in your own values
npm run dev            # http://localhost:5000
```

### 3. Start the client

In a second terminal:

```bash
cd client
npm install
npm run dev            # http://localhost:5173
```

The client calls the server at `http://localhost:5000` by default. To point it somewhere else, copy `client/.env.example` to `client/.env` and change `VITE_API_URL`.

### Environment variables

**`server/.env`**

| Variable | Required? | What it does |
|---|---|---|
| `PORT` | Optional | Server port. Defaults to `5000`. |
| `GEMINI_API_KEY` | For Ask Darling | Your Google Gemini API key. |
| `GEMINI_MODEL` | Optional | Use a different Gemini model without changing code. |
| `REMOVE_BG_API_KEY` | For background removal | Your remove.bg API key. |
| `CORS_ORIGINS` | Optional | Extra browser origins allowed to call the API, comma-separated (for example, a phone testing over your local network). |

**`client/.env`**

| Variable | Required? | What it does |
|---|---|---|
| `VITE_API_URL` | Optional | Where the client sends API requests. Defaults to `http://localhost:5000`. |

> 🔒 API keys belong only in `server/.env`, which Git ignores. Never put secrets in `client/.env`: anything starting with `VITE_` is visible in the browser.

### Other scripts

| Where | Command | What it does |
|---|---|---|
| `client/` | `npm run build` | Production build into `client/dist` |
| `client/` | `npm run preview` | Serve the production build locally |
| `client/` | `npm run lint` | Run ESLint |
| `server/` | `npm start` | Start the server without file watching |

---

## ✦ Contributors

<div align="center">

**Jade Huynh** ♡ **Elisa Owens** ♡ **Ericka Tyndall**

</div>

---

## ✦ Acknowledgments

With love to the 90s rom-com wardrobes, glossy fashion magazines, old desktop computers and paper-doll dress-up games that inspired Outfit Darling's look and feel. ✧

<div align="center">
<sub>made with ♡ and a lot of outfit changes</sub>
</div>

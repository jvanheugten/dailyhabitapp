# Daily Habit App

A PWA for daily habit tracking, journaling, and health monitoring. Runs entirely in the browser — all data stored locally in IndexedDB.

**Live:** https://jazman.github.io/dailyhabitapp/

## Features

- **Habits** — track daily habits with completion streaks
- **Journal** — daily journal entries
- **Health** — symptom logging with an interactive body map, vital sign tracking, and Google Fit import

## Tech stack

React 18 · Vite · Dexie.js (IndexedDB) · CSS Modules · Vitest · GitHub Pages

## Development

```bash
npm install
npm run dev        # dev server at http://localhost:5173
npm test           # run test suite
npm run build      # production build
```

## Google Fit integration

Google Fit sync imports steps, calories, active minutes, heart rate, sleep, weight, blood pressure, blood glucose, and oxygen saturation into the Health tab.

### Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a project
2. Enable the **Fitness API** (APIs & Services → Enable APIs)
3. Create an **OAuth 2.0 Client ID** (Credentials → Create → Web application)
4. Add authorised JavaScript origins:
   - `http://localhost:5173` (local dev)
   - `https://<your-username>.github.io` (production)
5. Create `.env.local` in the project root:
   ```
   VITE_GOOGLE_CLIENT_ID=your_client_id_here
   ```
6. Restart the dev server — the **Connect Google Fit** button will appear in the Health tab

Without `VITE_GOOGLE_CLIENT_ID` set, the Health tab shows a configuration hint and the sync button is hidden.

### Scopes requested

`fitness.activity.read` · `fitness.body.read` · `fitness.heart_rate.read` · `fitness.blood_pressure.read` · `fitness.blood_glucose.read` · `fitness.oxygen_saturation.read` · `fitness.sleep.read`

## Deployment

Pushes to `master` deploy automatically to GitHub Pages via the existing workflow. The `base` path in `vite.config.js` is set to `/dailyhabitapp/`.

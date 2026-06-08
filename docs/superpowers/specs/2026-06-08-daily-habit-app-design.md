# Daily Habit App — Design Spec

## Overview

A mobile-first PWA for daily habit tracking and journaling. The app opens to a daily check-in where you mark habits complete and add a journal note. Streaks and a scrollable day history keep motivation visible at a glance.

This spec covers **MVP scope only**: Habits + Journal. Health tracking, statistics, cloud sync, and LLM integration are explicitly deferred to later phases.

---

## Full System (for context)

Five subsystems planned, built independently in order:

1. **Habits & Journal** — this spec (MVP)
2. **Health Tracking** — custom symptoms, vitals, 3D body map
3. **Statistics & Insights** — streak charts, correlation analysis
4. **Cloud Sync & Export** — Google Drive backup, CSV/JSON export
5. **LLM Integration** — local LLM for health queries and journal summaries

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | React + Vite |
| Deployment | PWA (installable, works offline) |
| Storage | Dexie.js (IndexedDB wrapper) |
| State | React Context + hooks (one context per domain) |
| Notifications | Web Push API + service worker |
| Speech input | Web Speech API (transcription only — no audio stored) |
| Styling | CSS modules or plain CSS (no UI framework) |
| Target platform | Mobile browser, Android-first |

---

## Architecture

Single-page React app with a service worker for offline support and push notifications. All data is local — no backend in MVP.

```
src/
  contexts/
    HabitsContext.jsx      # habit CRUD + completion state
    JournalContext.jsx     # journal entry CRUD
  db/
    db.js                  # Dexie schema + instance
  screens/
    Today.jsx              # daily check-in screen
    Habits.jsx             # habit management screen
    Journal.jsx            # journal log screen
  components/
    DayStrip.jsx           # scrollable day picker
    HabitRow.jsx           # single habit row (checkbox + streak)
    HabitForm.jsx          # add/edit habit modal
    JournalEditor.jsx      # text field + mic button
    BottomNav.jsx          # tab bar
  sw.js                    # service worker (offline + push)
  main.jsx
  App.jsx
```

State flows down from contexts. Screens read from context, dispatch actions. Dexie calls happen inside context methods only — screens never touch the DB directly.

---

## Data Model

Four Dexie tables:

### `habits`
| Field | Type | Notes |
|---|---|---|
| `id` | auto-increment | primary key |
| `name` | string | display name |
| `days` | number[] | days of week (0=Sun … 6=Sat) |
| `time` | string \| null | HH:MM, optional |
| `createdAt` | ISO string | |

### `completions`
| Field | Type | Notes |
|---|---|---|
| `id` | auto-increment | primary key |
| `habitId` | number | FK → habits.id |
| `date` | string | YYYY-MM-DD |
| `completedAt` | ISO string | |

Compound index on `[habitId+date]` for fast lookups. Presence of a row = completed; absence = not done.

### `journal_entries`
| Field | Type | Notes |
|---|---|---|
| `id` | auto-increment | primary key |
| `date` | string | YYYY-MM-DD, unique |
| `text` | string | |
| `createdAt` | ISO string | |
| `updatedAt` | ISO string | |

One entry per day. Saving always upserts on `date`.

### `notification_prefs`
| Field | Type | Notes |
|---|---|---|
| `habitId` | number | primary key (FK → habits.id) |
| `enabled` | boolean | |
| `time` | string | HH:MM — overrides habit.time if set |

---

## Screens

### Today

The home screen. Opens to the current day.

**Day strip** (sticky at top): horizontally scrollable strip of day tiles. Each tile shows day letter, date number, and a dot indicating completion status (green = all done, dim = partial/none). Today is highlighted. Future days are dimmed and non-interactive. Tapping a past day loads that day's completions and journal entry.

**Habit rows**: one compact row per habit scheduled for the selected day. Columns: checkbox, habit name, streak count (🔥N). Tapping the checkbox toggles completion (inserts or deletes a `completions` row). Completed habits show green checkbox; uncompleted are dimmed. Rows are not reordered on completion.

**Progress indicator**: "X/Y done" shown in the header alongside the date.

**Journal section** (below habits, separated by a divider): single text field pre-populated with today's existing entry if one exists. Mic button triggers Web Speech API — transcript is appended to the field. The entry auto-saves (upserts `journal_entries`) when the field loses focus or the user navigates to a different day.

### Habits

List of all habits (name + scheduled days summary). Swipe-to-delete with confirmation. Tap to edit. FAB opens the habit form to add a new habit.

**Habit form** (modal/sheet):
- Name (text input, required)
- Days of week (7-button toggle, at least one required)
- Time (optional time picker)
- Reminder toggle (if time is set, enables push notification for that time)

### Journal

Reverse-chronological list of past journal entries. Each item shows date and a text preview. Tapping opens the entry in a read/edit view. No standalone "new entry" action — entries are created from the Today screen.

---

## Notifications

Web Push via service worker. When a habit has a reminder time set and the user grants notification permission, the service worker schedules a push for that time each day the habit is due. Notification tap opens the app to the Today screen.

Permission is requested lazily — only when the user first enables a reminder on a habit.

---

## Speech-to-Text

Uses `window.SpeechRecognition` (Web Speech API). Mic button on the Today screen starts recognition; result is appended to the journal text field. No audio is recorded or stored. Falls back gracefully (mic button hidden) on browsers that don't support the API.

---

## PWA Requirements

- `manifest.json` with app name, icons, `display: standalone`
- Service worker caches app shell for offline use
- Installable on Android via "Add to Home Screen"

---

## Out of Scope (MVP)

- Health tracking (symptoms, vitals, body map)
- Statistics and charts
- Google Drive sync
- Data export
- LLM integration
- Multi-device sync
- User accounts / authentication
- Native APK packaging (Capacitor) for sideload/Play Store distribution without a hosted URL

# Daily Habit App — MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an installable PWA for daily habit tracking and journaling with streak visualization, scrollable day history, and local push notifications.

**Architecture:** React 18 + Vite SPA with three screens behind a bottom tab bar (Today, Habits, Journal). All data lives in IndexedDB via Dexie.js. Two React Contexts (HabitsContext, JournalContext) own all data access — screens never call Dexie directly. Streaks are computed on read. Notifications use the browser Notifications API scheduled via `setTimeout` on app load (no backend needed).

**Tech Stack:** React 18, Vite 5, Dexie.js 4, vite-plugin-pwa, Vitest + jsdom, @testing-library/react, @testing-library/user-event, @testing-library/jest-dom, fake-indexeddb

---

## File Map

```
src/
  db/
    db.js                      # Dexie schema + singleton
  utils/
    dates.js                   # formatDate, today, parseDate, DAY_LETTERS
    streaks.js                 # computeStreak(habit, completedDatesSet)
  contexts/
    HabitsContext.jsx          # habits[] + completions + selectedDate CRUD
    JournalContext.jsx         # journal entry upsert/read
  hooks/
    useStreak.js               # per-habit streak (reads from HabitsContext)
    useSpeech.js               # Web Speech API wrapper
  components/
    BottomNav.jsx + .module.css
    DayStrip.jsx + .module.css
    HabitRow.jsx + .module.css
    HabitForm.jsx + .module.css
    JournalEditor.jsx + .module.css
  screens/
    Today.jsx + .module.css
    Habits.jsx + .module.css
    Journal.jsx + .module.css
  notifications.js             # requestPermission + scheduleHabitReminders
  App.jsx + .module.css
  main.jsx
  index.css                    # global reset + base dark theme
  test-setup.js
vite.config.js
public/
  icon-192.png                 # PWA icon (placeholder OK during dev)
  icon-512.png
```

Tests mirror `src/` structure (`src/utils/dates.test.js`, etc.).

---

## Task 1: Project Scaffold + Test Setup

**Files:**
- Create: `vite.config.js`
- Create: `src/test-setup.js`
- Create: `src/index.css`
- Modify: `package.json` (add test script)

- [ ] **Step 1: Scaffold the Vite React project**

From `/home/jazman/projects/dailyhabitapp`, run:

```bash
npm create vite@latest . -- --template react
```

If prompted about existing files, confirm overwrite. Then:

```bash
npm install
```

- [ ] **Step 2: Install all project dependencies**

```bash
npm install dexie
npm install vite-plugin-pwa
npm install --save-dev vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom fake-indexeddb
```

- [ ] **Step 3: Replace `vite.config.js` with PWA + test config**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Daily Habit',
        short_name: 'Habit',
        description: 'Daily habit tracking and journaling',
        theme_color: '#111111',
        background_color: '#111111',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.js',
  },
})
```

- [ ] **Step 4: Create `src/test-setup.js`**

```js
import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
```

- [ ] **Step 5: Add base styles to `src/index.css`** (replace entire file)

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { height: 100%; }
body {
  background: #111;
  color: #e0e0e0;
  font-family: system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  overscroll-behavior: none;
}
button { cursor: pointer; border: none; background: none; color: inherit; font: inherit; }
input, textarea { font: inherit; color: inherit; }
```

- [ ] **Step 6: Add placeholder PWA icons**

```bash
mkdir -p public
# Create 192x192 placeholder PNG (solid dark square)
node -e "
const { createCanvas } = require('canvas');
" 2>/dev/null || true
# Simple approach: copy any PNG as placeholder
cp public/vite.svg public/icon-192.png 2>/dev/null || touch public/icon-192.png
cp public/vite.svg public/icon-512.png 2>/dev/null || touch public/icon-512.png
```

Note: Replace these with real icons before publishing. Any 192×192 and 512×512 PNG files work.

- [ ] **Step 7: Add test script to `package.json`**

In `package.json`, ensure `"scripts"` includes:
```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 8: Write and run a smoke test**

Create `src/App.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import App from './App'

test('renders without crashing', () => {
  render(<App />)
  expect(document.body).toBeTruthy()
})
```

Run:
```bash
npx vitest run
```
Expected: PASS (or fail because App imports don't exist yet — that's fine, just verify Vitest runs at all).

- [ ] **Step 9: Commit**

```bash
git init
git add vite.config.js package.json package-lock.json src/test-setup.js src/index.css
git commit -m "feat: scaffold React + Vite project with Vitest and PWA config"
```

---

## Task 2: Date Utilities

**Files:**
- Create: `src/utils/dates.js`
- Create: `src/utils/dates.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/dates.test.js`:

```js
import { formatDate, today, parseDate, DAY_LETTERS } from './dates'

test('formatDate formats a Date to YYYY-MM-DD', () => {
  expect(formatDate(new Date(2026, 5, 8))).toBe('2026-06-08')
})

test('formatDate pads month and day with zeros', () => {
  expect(formatDate(new Date(2026, 0, 5))).toBe('2026-01-05')
})

test('today returns current date as YYYY-MM-DD', () => {
  const result = today()
  expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})

test('parseDate parses YYYY-MM-DD without timezone shift', () => {
  const d = parseDate('2026-06-08')
  expect(d.getFullYear()).toBe(2026)
  expect(d.getMonth()).toBe(5)
  expect(d.getDate()).toBe(8)
})

test('DAY_LETTERS has 7 entries starting with Sunday', () => {
  expect(DAY_LETTERS).toHaveLength(7)
  expect(DAY_LETTERS[0]).toBe('S') // Sunday
  expect(DAY_LETTERS[1]).toBe('M') // Monday
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/utils/dates.test.js
```
Expected: FAIL — `dates.js` doesn't exist yet.

- [ ] **Step 3: Implement `src/utils/dates.js`**

```js
export function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function today() {
  return formatDate(new Date())
}

export function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Index matches Date.getDay() — 0 = Sunday
export const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
export const SHORT_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/utils/dates.test.js
```
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/dates.js src/utils/dates.test.js
git commit -m "feat: add date utilities (formatDate, today, parseDate)"
```

---

## Task 3: Dexie Database Schema

**Files:**
- Create: `src/db/db.js`
- Create: `src/db/db.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/db/db.test.js`:

```js
import { db } from './db'

beforeEach(async () => {
  await db.habits.clear()
  await db.completions.clear()
  await db.journal_entries.clear()
  await db.notification_prefs.clear()
})

test('database exposes all required tables', () => {
  expect(db.habits).toBeDefined()
  expect(db.completions).toBeDefined()
  expect(db.journal_entries).toBeDefined()
  expect(db.notification_prefs).toBeDefined()
})

test('can add and retrieve a habit', async () => {
  const id = await db.habits.add({
    name: 'Morning run',
    days: [1, 2, 3, 4, 5],
    time: '07:00',
    createdAt: new Date().toISOString(),
  })
  const habit = await db.habits.get(id)
  expect(habit.name).toBe('Morning run')
  expect(habit.days).toEqual([1, 2, 3, 4, 5])
})

test('can add a completion and look it up by [habitId+date]', async () => {
  await db.completions.add({ habitId: 1, date: '2026-06-08', completedAt: new Date().toISOString() })
  const rows = await db.completions.where('[habitId+date]').equals([1, '2026-06-08']).toArray()
  expect(rows).toHaveLength(1)
})

test('journal_entries date is unique — duplicate date throws', async () => {
  await db.journal_entries.add({ date: '2026-06-08', text: 'first', createdAt: '', updatedAt: '' })
  await expect(
    db.journal_entries.add({ date: '2026-06-08', text: 'second', createdAt: '', updatedAt: '' })
  ).rejects.toThrow()
})

test('notification_prefs uses habitId as primary key', async () => {
  await db.notification_prefs.put({ habitId: 42, enabled: true, time: '08:00' })
  await db.notification_prefs.put({ habitId: 42, enabled: false, time: '08:00' })
  const all = await db.notification_prefs.toArray()
  expect(all).toHaveLength(1)
  expect(all[0].enabled).toBe(false)
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/db/db.test.js
```
Expected: FAIL — `db.js` doesn't exist.

- [ ] **Step 3: Implement `src/db/db.js`**

```js
import Dexie from 'dexie'

export const db = new Dexie('dailyhabit')

db.version(1).stores({
  habits: '++id, createdAt',
  completions: '++id, [habitId+date], date',
  journal_entries: '++id, &date',
  notification_prefs: 'habitId',
})
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/db/db.test.js
```
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/db/db.js src/db/db.test.js
git commit -m "feat: add Dexie database schema (habits, completions, journal_entries, notification_prefs)"
```

---

## Task 4: Streak Computation Utility

**Files:**
- Create: `src/utils/streaks.js`
- Create: `src/utils/streaks.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/streaks.test.js`:

```js
import { computeStreak } from './streaks'
import { formatDate } from './dates'

// Helper: date string N days ago
function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return formatDate(d)
}

const habit = { days: [0, 1, 2, 3, 4, 5, 6] } // scheduled every day

test('streak is 0 when no completions', () => {
  expect(computeStreak(habit, new Set())).toBe(0)
})

test('streak is 1 when only yesterday completed', () => {
  const dates = new Set([daysAgo(1)])
  expect(computeStreak(habit, dates)).toBe(1)
})

test('streak is 3 when last 3 days completed (not today)', () => {
  const dates = new Set([daysAgo(1), daysAgo(2), daysAgo(3)])
  expect(computeStreak(habit, dates)).toBe(3)
})

test('streak includes today if today is completed', () => {
  const dates = new Set([daysAgo(0), daysAgo(1), daysAgo(2)])
  expect(computeStreak(habit, dates)).toBe(3)
})

test('streak resets when a day is missed', () => {
  // completed today and 3 days ago, but not 1 or 2 days ago
  const dates = new Set([daysAgo(0), daysAgo(3)])
  expect(computeStreak(habit, dates)).toBe(1)
})

test('skips days not in habit schedule', () => {
  // Habit only on weekdays (Mon-Fri = 1-5)
  const weekdayHabit = { days: [1, 2, 3, 4, 5] }
  // Build completions for each weekday in past 2 weeks
  const dates = new Set()
  for (let i = 1; i <= 14; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    if (d.getDay() >= 1 && d.getDay() <= 5) dates.add(formatDate(d))
  }
  const streak = computeStreak(weekdayHabit, dates)
  expect(streak).toBeGreaterThanOrEqual(5) // at least a week's worth
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/utils/streaks.test.js
```
Expected: FAIL — `streaks.js` doesn't exist.

- [ ] **Step 3: Implement `src/utils/streaks.js`**

```js
import { formatDate } from './dates'

// Returns the current streak for a habit.
// habit: { days: number[] } — scheduled days of week (0=Sun … 6=Sat)
// completedDates: Set<string> — set of 'YYYY-MM-DD' strings
export function computeStreak(habit, completedDates) {
  let streak = 0
  const todayStr = formatDate(new Date())
  const cursor = new Date()

  for (let i = 0; i < 365; i++) {
    const dateStr = formatDate(cursor)
    const dayOfWeek = cursor.getDay()

    if (!habit.days.includes(dayOfWeek)) {
      cursor.setDate(cursor.getDate() - 1)
      continue
    }

    if (completedDates.has(dateStr)) {
      streak++
    } else if (dateStr === todayStr) {
      // today not yet done — don't break the streak
    } else {
      break
    }

    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/utils/streaks.test.js
```
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/streaks.js src/utils/streaks.test.js
git commit -m "feat: add streak computation utility"
```

---

## Task 5: HabitsContext

**Files:**
- Create: `src/contexts/HabitsContext.jsx`
- Create: `src/contexts/HabitsContext.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `src/contexts/HabitsContext.test.jsx`:

```jsx
import { renderHook, act } from '@testing-library/react'
import { HabitsProvider, useHabits } from './HabitsContext'
import { db } from '../db/db'

beforeEach(async () => {
  await db.habits.clear()
  await db.completions.clear()
  await db.notification_prefs.clear()
})

const wrapper = ({ children }) => <HabitsProvider>{children}</HabitsProvider>

test('habits starts empty', async () => {
  const { result } = renderHook(() => useHabits(), { wrapper })
  // Wait for initial load
  await act(async () => {})
  expect(result.current.habits).toEqual([])
})

test('addHabit adds to db and updates state', async () => {
  const { result } = renderHook(() => useHabits(), { wrapper })
  await act(async () => {
    await result.current.addHabit({ name: 'Meditate', days: [1, 2, 3], time: null, notifyEnabled: false })
  })
  expect(result.current.habits).toHaveLength(1)
  expect(result.current.habits[0].name).toBe('Meditate')
})

test('updateHabit updates name in state and db', async () => {
  const { result } = renderHook(() => useHabits(), { wrapper })
  let habit
  await act(async () => {
    habit = await result.current.addHabit({ name: 'Run', days: [1], time: null, notifyEnabled: false })
  })
  await act(async () => {
    await result.current.updateHabit(habit.id, { name: 'Morning Run' })
  })
  expect(result.current.habits[0].name).toBe('Morning Run')
})

test('deleteHabit removes from state and db', async () => {
  const { result } = renderHook(() => useHabits(), { wrapper })
  let habit
  await act(async () => {
    habit = await result.current.addHabit({ name: 'Vitamins', days: [0, 1, 2, 3, 4, 5, 6], time: null, notifyEnabled: false })
  })
  await act(async () => {
    await result.current.deleteHabit(habit.id)
  })
  expect(result.current.habits).toHaveLength(0)
})

test('toggleCompletion adds then removes a completion', async () => {
  const { result } = renderHook(() => useHabits(), { wrapper })
  let habit
  await act(async () => {
    habit = await result.current.addHabit({ name: 'Run', days: [0, 1, 2, 3, 4, 5, 6], time: null, notifyEnabled: false })
  })
  await act(async () => { await result.current.toggleCompletion(habit.id) })
  expect(result.current.completions[habit.id]).toBe(true)

  await act(async () => { await result.current.toggleCompletion(habit.id) })
  expect(result.current.completions[habit.id]).toBeUndefined()
})

test('getCompletedDates returns Set of dates for a habit', async () => {
  const { result } = renderHook(() => useHabits(), { wrapper })
  let habit
  await act(async () => {
    habit = await result.current.addHabit({ name: 'Run', days: [0, 1, 2, 3, 4, 5, 6], time: null, notifyEnabled: false })
    await result.current.toggleCompletion(habit.id)
  })
  const dates = await result.current.getCompletedDates(habit.id)
  expect(dates.size).toBe(1)
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/contexts/HabitsContext.test.jsx
```
Expected: FAIL — file doesn't exist.

- [ ] **Step 3: Implement `src/contexts/HabitsContext.jsx`**

```jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { db } from '../db/db'
import { today } from '../utils/dates'

const HabitsContext = createContext(null)

export function HabitsProvider({ children }) {
  const [habits, setHabits] = useState([])
  const [selectedDate, setSelectedDate] = useState(today())
  const [completions, setCompletions] = useState({}) // { [habitId]: true }

  useEffect(() => {
    db.habits.orderBy('createdAt').toArray().then(setHabits)
  }, [])

  useEffect(() => {
    db.completions
      .where('date').equals(selectedDate)
      .toArray()
      .then(rows => {
        const map = {}
        rows.forEach(r => { map[r.habitId] = true })
        setCompletions(map)
      })
  }, [selectedDate])

  const addHabit = useCallback(async (data) => {
    const id = await db.habits.add({ ...data, createdAt: new Date().toISOString() })
    const habit = await db.habits.get(id)
    setHabits(prev => [...prev, habit])
    return habit
  }, [])

  const updateHabit = useCallback(async (id, data) => {
    await db.habits.update(id, data)
    setHabits(prev => prev.map(h => h.id === id ? { ...h, ...data } : h))
  }, [])

  const deleteHabit = useCallback(async (id) => {
    await db.transaction('rw', db.habits, db.completions, db.notification_prefs, async () => {
      await db.habits.delete(id)
      await db.completions.where('habitId').equals(id).delete()
      await db.notification_prefs.delete(id)
    })
    setHabits(prev => prev.filter(h => h.id !== id))
    setCompletions(prev => { const next = { ...prev }; delete next[id]; return next })
  }, [])

  const toggleCompletion = useCallback(async (habitId) => {
    if (completions[habitId]) {
      await db.completions.where('[habitId+date]').equals([habitId, selectedDate]).delete()
      setCompletions(prev => { const next = { ...prev }; delete next[habitId]; return next })
    } else {
      await db.completions.add({ habitId, date: selectedDate, completedAt: new Date().toISOString() })
      setCompletions(prev => ({ ...prev, [habitId]: true }))
    }
  }, [completions, selectedDate])

  const getCompletedDates = useCallback(async (habitId) => {
    const rows = await db.completions.where('habitId').equals(habitId).toArray()
    return new Set(rows.map(r => r.date))
  }, [])

  return (
    <HabitsContext.Provider value={{
      habits, selectedDate, completions,
      setSelectedDate, addHabit, updateHabit, deleteHabit, toggleCompletion, getCompletedDates,
    }}>
      {children}
    </HabitsContext.Provider>
  )
}

export function useHabits() {
  const ctx = useContext(HabitsContext)
  if (!ctx) throw new Error('useHabits must be used within HabitsProvider')
  return ctx
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/contexts/HabitsContext.test.jsx
```
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/contexts/HabitsContext.jsx src/contexts/HabitsContext.test.jsx
git commit -m "feat: add HabitsContext with habit and completion CRUD"
```

---

## Task 6: JournalContext

**Files:**
- Create: `src/contexts/JournalContext.jsx`
- Create: `src/contexts/JournalContext.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `src/contexts/JournalContext.test.jsx`:

```jsx
import { renderHook, act } from '@testing-library/react'
import { JournalProvider, useJournal } from './JournalContext'
import { db } from '../db/db'

beforeEach(async () => { await db.journal_entries.clear() })

const wrapper = ({ children }) => <JournalProvider>{children}</JournalProvider>

test('loadEntry returns null for a date with no entry', async () => {
  const { result } = renderHook(() => useJournal(), { wrapper })
  let entry
  await act(async () => { entry = await result.current.loadEntry('2026-06-08') })
  expect(entry).toBeNull()
})

test('saveEntry creates a new entry', async () => {
  const { result } = renderHook(() => useJournal(), { wrapper })
  await act(async () => { await result.current.saveEntry('2026-06-08', 'Good day') })
  let entry
  await act(async () => { entry = await result.current.loadEntry('2026-06-08') })
  expect(entry.text).toBe('Good day')
})

test('saveEntry updates existing entry (upsert)', async () => {
  const { result } = renderHook(() => useJournal(), { wrapper })
  await act(async () => { await result.current.saveEntry('2026-06-08', 'First') })
  await act(async () => { await result.current.saveEntry('2026-06-08', 'Updated') })
  const rows = await db.journal_entries.toArray()
  expect(rows).toHaveLength(1)
  expect(rows[0].text).toBe('Updated')
})

test('getAllEntries returns entries newest first', async () => {
  const { result } = renderHook(() => useJournal(), { wrapper })
  await act(async () => {
    await result.current.saveEntry('2026-06-06', 'Day 1')
    await result.current.saveEntry('2026-06-08', 'Day 3')
    await result.current.saveEntry('2026-06-07', 'Day 2')
  })
  let entries
  await act(async () => { entries = await result.current.getAllEntries() })
  expect(entries[0].date).toBe('2026-06-08')
  expect(entries[2].date).toBe('2026-06-06')
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/contexts/JournalContext.test.jsx
```
Expected: FAIL.

- [ ] **Step 3: Implement `src/contexts/JournalContext.jsx`**

```jsx
import { createContext, useContext, useState, useCallback } from 'react'
import { db } from '../db/db'

const JournalContext = createContext(null)

export function JournalProvider({ children }) {
  const [entries, setEntries] = useState({}) // { [date]: entry | null }

  const loadEntry = useCallback(async (date) => {
    if (entries[date] !== undefined) return entries[date]
    const entry = (await db.journal_entries.where('date').equals(date).first()) ?? null
    setEntries(prev => ({ ...prev, [date]: entry }))
    return entry
  }, [entries])

  const saveEntry = useCallback(async (date, text) => {
    const existing = await db.journal_entries.where('date').equals(date).first()
    const now = new Date().toISOString()
    if (existing) {
      await db.journal_entries.update(existing.id, { text, updatedAt: now })
      setEntries(prev => ({ ...prev, [date]: { ...existing, text, updatedAt: now } }))
    } else {
      const id = await db.journal_entries.add({ date, text, createdAt: now, updatedAt: now })
      setEntries(prev => ({ ...prev, [date]: { id, date, text, createdAt: now, updatedAt: now } }))
    }
  }, [])

  const getAllEntries = useCallback(async () => {
    return db.journal_entries.orderBy('date').reverse().toArray()
  }, [])

  return (
    <JournalContext.Provider value={{ entries, loadEntry, saveEntry, getAllEntries }}>
      {children}
    </JournalContext.Provider>
  )
}

export function useJournal() {
  const ctx = useContext(JournalContext)
  if (!ctx) throw new Error('useJournal must be used within JournalProvider')
  return ctx
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/contexts/JournalContext.test.jsx
```
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/contexts/JournalContext.jsx src/contexts/JournalContext.test.jsx
git commit -m "feat: add JournalContext with upsert and list"
```

---

## Task 7: App Layout + BottomNav

**Files:**
- Create: `src/components/BottomNav.jsx`
- Create: `src/components/BottomNav.module.css`
- Create: `src/components/BottomNav.test.jsx`
- Create: `src/App.jsx` (replace scaffold)
- Create: `src/App.module.css`
- Create: `src/screens/Today.jsx` (stub)
- Create: `src/screens/Habits.jsx` (stub)
- Create: `src/screens/Journal.jsx` (stub)

- [ ] **Step 1: Write the failing tests**

Create `src/components/BottomNav.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BottomNav } from './BottomNav'

test('renders three tabs', () => {
  render(<BottomNav activeTab="today" onTabChange={() => {}} />)
  expect(screen.getByText('Today')).toBeInTheDocument()
  expect(screen.getByText('Habits')).toBeInTheDocument()
  expect(screen.getByText('Journal')).toBeInTheDocument()
})

test('active tab has aria-current="page"', () => {
  render(<BottomNav activeTab="habits" onTabChange={() => {}} />)
  const habitsBtn = screen.getByText('Habits').closest('button')
  expect(habitsBtn).toHaveAttribute('aria-current', 'page')
})

test('clicking a tab calls onTabChange with tab id', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<BottomNav activeTab="today" onTabChange={onChange} />)
  await user.click(screen.getByText('Journal'))
  expect(onChange).toHaveBeenCalledWith('journal')
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/components/BottomNav.test.jsx
```
Expected: FAIL.

- [ ] **Step 3: Implement `src/components/BottomNav.jsx`**

```jsx
import styles from './BottomNav.module.css'

const TABS = [
  { id: 'today', label: 'Today', icon: '✅' },
  { id: 'habits', label: 'Habits', icon: '⚙️' },
  { id: 'journal', label: 'Journal', icon: '📓' },
]

export function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav className={styles.nav}>
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
          onClick={() => onTabChange(tab.id)}
          aria-current={activeTab === tab.id ? 'page' : undefined}
        >
          <span className={styles.icon}>{tab.icon}</span>
          <span className={styles.label}>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
```

- [ ] **Step 4: Create `src/components/BottomNav.module.css`**

```css
.nav {
  display: flex;
  background: #1a1a1a;
  border-top: 1px solid #2a2a2a;
  padding-bottom: env(safe-area-inset-bottom, 0);
  flex-shrink: 0;
}
.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 0 6px;
  gap: 3px;
  opacity: 0.5;
  transition: opacity 0.15s;
}
.tab.active { opacity: 1; }
.icon { font-size: 20px; }
.label { font-size: 11px; }
```

- [ ] **Step 5: Create stub screens and wire up App.jsx**

Create `src/screens/Today.jsx`:
```jsx
export function Today() { return <div>Today</div> }
```

Create `src/screens/Habits.jsx`:
```jsx
export function Habits() { return <div>Habits</div> }
```

Create `src/screens/Journal.jsx`:
```jsx
export function Journal() { return <div>Journal</div> }
```

Create `src/App.module.css`:
```css
.app { display: flex; flex-direction: column; height: 100%; }
.main { flex: 1; overflow-y: auto; }
```

Replace `src/App.jsx`:
```jsx
import { useState } from 'react'
import { HabitsProvider } from './contexts/HabitsContext'
import { JournalProvider } from './contexts/JournalContext'
import { Today } from './screens/Today'
import { Habits } from './screens/Habits'
import { Journal } from './screens/Journal'
import { BottomNav } from './components/BottomNav'
import styles from './App.module.css'

export default function App() {
  const [activeTab, setActiveTab] = useState('today')
  return (
    <HabitsProvider>
      <JournalProvider>
        <div className={styles.app}>
          <main className={styles.main}>
            {activeTab === 'today' && <Today />}
            {activeTab === 'habits' && <Habits />}
            {activeTab === 'journal' && <Journal />}
          </main>
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </JournalProvider>
    </HabitsProvider>
  )
}
```

- [ ] **Step 6: Run tests**

```bash
npx vitest run src/components/BottomNav.test.jsx
```
Expected: PASS (3 tests).

- [ ] **Step 7: Start dev server to verify visually**

```bash
npm run dev
```

Open `http://localhost:5173`. You should see the three-tab bottom nav. Check that clicking each tab changes the content area.

- [ ] **Step 8: Commit**

```bash
git add src/components/BottomNav.jsx src/components/BottomNav.module.css src/components/BottomNav.test.jsx src/App.jsx src/App.module.css src/screens/
git commit -m "feat: add App layout with BottomNav and stub screens"
```

---

## Task 8: DayStrip Component

**Files:**
- Create: `src/components/DayStrip.jsx`
- Create: `src/components/DayStrip.module.css`
- Create: `src/components/DayStrip.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/DayStrip.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DayStrip } from './DayStrip'
import { today } from '../utils/dates'

test('renders today as selected by default', () => {
  render(<DayStrip selectedDate={today()} onSelectDate={() => {}} />)
  const todayTile = document.querySelector('[data-today="true"]')
  expect(todayTile).toBeInTheDocument()
  expect(todayTile).toHaveClass('selected')
})

test('future day buttons are disabled', () => {
  render(<DayStrip selectedDate={today()} onSelectDate={() => {}} />)
  const buttons = screen.getAllByRole('button')
  const futureBtns = buttons.filter(b => b.disabled)
  expect(futureBtns.length).toBeGreaterThan(0)
})

test('clicking a past day calls onSelectDate', async () => {
  const user = userEvent.setup()
  const onSelect = vi.fn()
  render(<DayStrip selectedDate={today()} onSelectDate={onSelect} />)
  const buttons = screen.getAllByRole('button')
  // First button is the oldest past day — not disabled, not future
  const pastDays = buttons.filter(b => !b.disabled)
  if (pastDays.length > 1) {
    await user.click(pastDays[0])
    expect(onSelect).toHaveBeenCalled()
  }
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/components/DayStrip.test.jsx
```
Expected: FAIL.

- [ ] **Step 3: Implement `src/components/DayStrip.jsx`**

```jsx
import { useRef, useEffect } from 'react'
import { formatDate, DAY_LETTERS } from '../utils/dates'
import styles from './DayStrip.module.css'

// completionsByDate: { [YYYY-MM-DD]: { total: number, done: number } }
export function DayStrip({ selectedDate, onSelectDate, completionsByDate = {} }) {
  const todayStr = formatDate(new Date())
  const scrollRef = useRef(null)

  // 30 past days + today + 1 future day
  const days = []
  const base = new Date()
  for (let i = 30; i >= -1; i--) {
    const d = new Date(base)
    d.setDate(base.getDate() - i)
    days.push(d)
  }

  useEffect(() => {
    const el = scrollRef.current?.querySelector('[data-today="true"]')
    el?.scrollIntoView({ inline: 'center', behavior: 'instant', block: 'nearest' })
  }, [])

  return (
    <div className={styles.strip} ref={scrollRef}>
      {days.map(d => {
        const dateStr = formatDate(d)
        const isFuture = dateStr > todayStr
        const isToday = dateStr === todayStr
        const isSelected = dateStr === selectedDate
        const comp = completionsByDate[dateStr]
        const dotStatus = !comp || comp.total === 0 ? 'none'
          : comp.done === comp.total ? 'full' : 'partial'

        return (
          <button
            key={dateStr}
            data-today={isToday || undefined}
            disabled={isFuture}
            className={[
              styles.tile,
              isSelected && styles.selected,
              isFuture && styles.future,
              isToday && styles.today,
            ].filter(Boolean).join(' ')}
            onClick={() => onSelectDate(dateStr)}
          >
            <span className={styles.dayLetter}>{DAY_LETTERS[d.getDay()]}</span>
            <span className={styles.dayNum}>{d.getDate()}</span>
            <span className={`${styles.dot} ${styles[dotStatus]}`} />
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Create `src/components/DayStrip.module.css`**

```css
.strip {
  display: flex;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 12px 12px 0;
  gap: 6px;
  background: #111;
  position: sticky;
  top: 0;
  z-index: 10;
}
.strip::-webkit-scrollbar { display: none; }
.tile {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 38px;
  padding: 6px 0 8px;
  border-radius: 10px;
  background: #1a1a1a;
  transition: background 0.15s;
}
.tile.selected { background: #14532d; outline: 1.5px solid #4ade80; }
.tile.future { opacity: 0.25; }
.tile.today .dayLetter { color: #4ade80; font-weight: 700; }
.dayLetter { font-size: 10px; color: #666; }
.dayNum { font-size: 13px; font-weight: 600; color: #e0e0e0; }
.dot { width: 5px; height: 5px; border-radius: 50%; background: #333; }
.dot.full { background: #4ade80; }
.dot.partial { background: #f59e0b; }
.dot.none { background: #2a2a2a; }
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run src/components/DayStrip.test.jsx
```
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/DayStrip.jsx src/components/DayStrip.module.css src/components/DayStrip.test.jsx
git commit -m "feat: add DayStrip scrollable day picker"
```

---

## Task 9: HabitRow + useStreak Hook

**Files:**
- Create: `src/hooks/useStreak.js`
- Create: `src/hooks/useStreak.test.jsx`
- Create: `src/components/HabitRow.jsx`
- Create: `src/components/HabitRow.module.css`
- Create: `src/components/HabitRow.test.jsx`

- [ ] **Step 1: Write the failing tests for useStreak**

Create `src/hooks/useStreak.test.jsx`:

```jsx
import { renderHook, act } from '@testing-library/react'
import { HabitsProvider, useHabits } from '../contexts/HabitsContext'
import { useStreak } from './useStreak'
import { db } from '../db/db'
import { formatDate } from '../utils/dates'

beforeEach(async () => {
  await db.habits.clear()
  await db.completions.clear()
})

const wrapper = ({ children }) => <HabitsProvider>{children}</HabitsProvider>

test('streak is 0 for a habit with no completions', async () => {
  const { result } = renderHook(() => {
    const { addHabit } = useHabits()
    return { addHabit }
  }, { wrapper })

  let habit
  await act(async () => {
    habit = await result.current.addHabit({ name: 'Run', days: [0,1,2,3,4,5,6], time: null, notifyEnabled: false })
  })

  const { result: streakResult } = renderHook(() => useStreak(habit), { wrapper })
  await act(async () => {})
  expect(streakResult.current).toBe(0)
})
```

- [ ] **Step 2: Write the failing tests for HabitRow**

Create `src/components/HabitRow.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HabitRow } from './HabitRow'
import { HabitsProvider } from '../contexts/HabitsContext'
import { db } from '../db/db'

beforeEach(async () => { await db.habits.clear(); await db.completions.clear() })

const habit = { id: 1, name: 'Morning run', days: [1,2,3,4,5], time: null }

const wrapper = ({ children }) => <HabitsProvider>{children}</HabitsProvider>

test('renders habit name', () => {
  render(<HabitRow habit={habit} completed={false} onToggle={() => {}} />, { wrapper })
  expect(screen.getByText('Morning run')).toBeInTheDocument()
})

test('shows checkmark when completed', () => {
  render(<HabitRow habit={habit} completed={true} onToggle={() => {}} />, { wrapper })
  expect(screen.getByRole('button', { name: /unmark/i })).toBeInTheDocument()
})

test('calls onToggle when checkbox clicked', async () => {
  const user = userEvent.setup()
  const onToggle = vi.fn()
  render(<HabitRow habit={habit} completed={false} onToggle={onToggle} />, { wrapper })
  await user.click(screen.getByRole('button', { name: /mark/i }))
  expect(onToggle).toHaveBeenCalledOnce()
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run src/hooks/useStreak.test.jsx src/components/HabitRow.test.jsx
```
Expected: FAIL.

- [ ] **Step 4: Implement `src/hooks/useStreak.js`**

```js
import { useState, useEffect } from 'react'
import { useHabits } from '../contexts/HabitsContext'
import { computeStreak } from '../utils/streaks'

export function useStreak(habit) {
  const { getCompletedDates, completions } = useHabits()
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    if (!habit?.id) return
    getCompletedDates(habit.id).then(dates => {
      setStreak(computeStreak(habit, dates))
    })
  }, [habit, getCompletedDates, completions])

  return streak
}
```

- [ ] **Step 5: Implement `src/components/HabitRow.jsx`**

```jsx
import { useStreak } from '../hooks/useStreak'
import styles from './HabitRow.module.css'

export function HabitRow({ habit, completed, onToggle }) {
  const streak = useStreak(habit)
  return (
    <div className={`${styles.row} ${completed ? styles.completed : styles.pending}`}>
      <button
        className={`${styles.checkbox} ${completed ? styles.checked : ''}`}
        onClick={onToggle}
        aria-label={completed ? `Unmark ${habit.name}` : `Mark ${habit.name} as done`}
      >
        {completed && <span>✓</span>}
      </button>
      <span className={styles.name}>{habit.name}</span>
      {streak > 0 && <span className={styles.streak}>🔥{streak}</span>}
    </div>
  )
}
```

- [ ] **Step 6: Create `src/components/HabitRow.module.css`**

```css
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  background: #1a1a1a;
  border-radius: 8px;
  transition: opacity 0.15s;
}
.pending { opacity: 0.55; }
.completed { opacity: 1; }
.checkbox {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 2px solid #444;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
  transition: background 0.15s, border-color 0.15s;
}
.checked { background: #4ade80; border-color: #4ade80; color: #000; }
.name { flex: 1; font-size: 14px; }
.streak { font-size: 12px; color: #f59e0b; }
```

- [ ] **Step 7: Run tests**

```bash
npx vitest run src/hooks/useStreak.test.jsx src/components/HabitRow.test.jsx
```
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useStreak.js src/hooks/useStreak.test.jsx src/components/HabitRow.jsx src/components/HabitRow.module.css src/components/HabitRow.test.jsx
git commit -m "feat: add HabitRow component and useStreak hook"
```

---

## Task 10: HabitForm Component

**Files:**
- Create: `src/components/HabitForm.jsx`
- Create: `src/components/HabitForm.module.css`
- Create: `src/components/HabitForm.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/HabitForm.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HabitForm } from './HabitForm'

const noop = () => {}

test('renders name input and day picker', () => {
  render(<HabitForm habit={null} onSave={noop} onClose={noop} />)
  expect(screen.getByPlaceholderText(/morning run/i)).toBeInTheDocument()
  expect(screen.getByText('Mo')).toBeInTheDocument()
})

test('shows error if name is empty on submit', async () => {
  const user = userEvent.setup()
  render(<HabitForm habit={null} onSave={noop} onClose={noop} />)
  await user.click(screen.getByText('Save'))
  expect(screen.getByText(/name is required/i)).toBeInTheDocument()
})

test('shows error if no days selected', async () => {
  const user = userEvent.setup()
  render(<HabitForm habit={null} onSave={noop} onClose={noop} />)
  // Deselect all default days (Mo-Fr)
  for (const label of ['Mo', 'Tu', 'We', 'Th', 'Fr']) {
    await user.click(screen.getByText(label))
  }
  await user.type(screen.getByPlaceholderText(/morning run/i), 'Run')
  await user.click(screen.getByText('Save'))
  expect(screen.getByText(/select at least one day/i)).toBeInTheDocument()
})

test('calls onSave with form data when valid', async () => {
  const user = userEvent.setup()
  const onSave = vi.fn().mockResolvedValue()
  const onClose = vi.fn()
  render(<HabitForm habit={null} onSave={onSave} onClose={onClose} />)
  await user.type(screen.getByPlaceholderText(/morning run/i), 'Meditate')
  await user.click(screen.getByText('Save'))
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'Meditate' }))
})

test('pre-fills fields when editing an existing habit', () => {
  const habit = { id: 1, name: 'Yoga', days: [0, 6], time: '07:30', notifyEnabled: false }
  render(<HabitForm habit={habit} onSave={noop} onClose={noop} />)
  expect(screen.getByDisplayValue('Yoga')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/components/HabitForm.test.jsx
```
Expected: FAIL.

- [ ] **Step 3: Implement `src/components/HabitForm.jsx`**

```jsx
import { useState } from 'react'
import { SHORT_DAYS } from '../utils/dates'
import styles from './HabitForm.module.css'

export function HabitForm({ habit, onSave, onClose }) {
  const [name, setName] = useState(habit?.name ?? '')
  const [days, setDays] = useState(habit?.days ?? [1, 2, 3, 4, 5])
  const [time, setTime] = useState(habit?.time ?? '')
  const [notifyEnabled, setNotifyEnabled] = useState(habit?.notifyEnabled ?? false)
  const [error, setError] = useState('')

  function toggleDay(d) {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort((a, b) => a - b))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    if (days.length === 0) { setError('Select at least one day'); return }
    await onSave({ name: name.trim(), days, time: time || null, notifyEnabled })
    onClose()
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={habit ? 'Edit Habit' : 'New Habit'}>
      <div className={styles.sheet}>
        <div className={styles.header}>
          <h2>{habit ? 'Edit Habit' : 'New Habit'}</h2>
          <button onClick={onClose} aria-label="Close form">✕</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            Name
            <input
              className={styles.input}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Morning run"
              autoFocus
            />
          </label>
          <div className={styles.label}>
            Days
            <div className={styles.dayPicker}>
              {SHORT_DAYS.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  className={`${styles.dayBtn} ${days.includes(i) ? styles.dayBtnActive : ''}`}
                  onClick={() => toggleDay(i)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <label className={styles.label}>
            Reminder time (optional)
            <input type="time" className={styles.input} value={time} onChange={e => setTime(e.target.value)} />
          </label>
          {time && (
            <label className={styles.toggleRow}>
              <span>Enable reminder notification</span>
              <input type="checkbox" checked={notifyEnabled} onChange={e => setNotifyEnabled(e.target.checked)} />
            </label>
          )}
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button type="submit" className={styles.saveBtn}>Save</button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `src/components/HabitForm.module.css`**

```css
.overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex; align-items: flex-end;
  z-index: 100;
}
.sheet {
  background: #1a1a1a;
  width: 100%;
  border-radius: 16px 16px 0 0;
  padding: 20px 16px calc(20px + env(safe-area-inset-bottom, 0));
  max-height: 90vh;
  overflow-y: auto;
}
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.header h2 { font-size: 18px; font-weight: 700; }
.form { display: flex; flex-direction: column; gap: 16px; }
.label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.06em; }
.input { background: #111; border: 1px solid #333; border-radius: 8px; padding: 10px 12px; font-size: 15px; color: #e0e0e0; }
.dayPicker { display: flex; gap: 6px; }
.dayBtn { flex: 1; padding: 8px 0; border-radius: 8px; background: #111; border: 1px solid #333; font-size: 12px; }
.dayBtnActive { background: #14532d; border-color: #4ade80; color: #4ade80; }
.toggleRow { display: flex; justify-content: space-between; align-items: center; font-size: 14px; }
.error { color: #f87171; font-size: 13px; }
.saveBtn { background: #4ade80; color: #000; font-weight: 700; padding: 14px; border-radius: 10px; font-size: 16px; margin-top: 4px; }
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run src/components/HabitForm.test.jsx
```
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/HabitForm.jsx src/components/HabitForm.module.css src/components/HabitForm.test.jsx
git commit -m "feat: add HabitForm component with validation"
```

---

## Task 11: useSpeech Hook + JournalEditor

**Files:**
- Create: `src/hooks/useSpeech.js`
- Create: `src/hooks/useSpeech.test.js`
- Create: `src/components/JournalEditor.jsx`
- Create: `src/components/JournalEditor.module.css`
- Create: `src/components/JournalEditor.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/useSpeech.test.js`:

```js
import { renderHook } from '@testing-library/react'
import { useSpeech } from './useSpeech'

test('isSupported is false when SpeechRecognition is unavailable', () => {
  // jsdom does not implement SpeechRecognition
  const { result } = renderHook(() => useSpeech())
  expect(result.current.isSupported).toBe(false)
})

test('isListening starts as false', () => {
  const { result } = renderHook(() => useSpeech())
  expect(result.current.isListening).toBe(false)
})

test('startListening is a function', () => {
  const { result } = renderHook(() => useSpeech())
  expect(typeof result.current.startListening).toBe('function')
})
```

Create `src/components/JournalEditor.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JournalEditor } from './JournalEditor'

test('renders textarea with provided value', () => {
  render(<JournalEditor value="Hello" onChange={() => {}} onBlur={() => {}} />)
  expect(screen.getByDisplayValue('Hello')).toBeInTheDocument()
})

test('calls onChange when typing', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<JournalEditor value="" onChange={onChange} onBlur={() => {}} />)
  await user.type(screen.getByRole('textbox'), 'Hi')
  expect(onChange).toHaveBeenCalled()
})

test('calls onBlur when textarea loses focus', async () => {
  const user = userEvent.setup()
  const onBlur = vi.fn()
  render(<JournalEditor value="test" onChange={() => {}} onBlur={onBlur} />)
  await user.click(screen.getByRole('textbox'))
  await user.tab()
  expect(onBlur).toHaveBeenCalled()
})

test('mic button is hidden when speech not supported', () => {
  // jsdom has no SpeechRecognition, so mic button should not render
  render(<JournalEditor value="" onChange={() => {}} onBlur={() => {}} />)
  expect(screen.queryByLabelText(/dictate/i)).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/hooks/useSpeech.test.js src/components/JournalEditor.test.jsx
```
Expected: FAIL.

- [ ] **Step 3: Implement `src/hooks/useSpeech.js`**

```js
import { useState, useCallback } from 'react'

const SpeechRecognition =
  typeof window !== 'undefined'
    ? (window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null)
    : null

export function useSpeech() {
  const isSupported = Boolean(SpeechRecognition)
  const [isListening, setIsListening] = useState(false)

  const startListening = useCallback((onResult) => {
    if (!isSupported) return
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    setIsListening(true)
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      onResult(transcript)
    }
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    recognition.start()
  }, [isSupported])

  return { isSupported, isListening, startListening }
}
```

- [ ] **Step 4: Implement `src/components/JournalEditor.jsx`**

```jsx
import { useSpeech } from '../hooks/useSpeech'
import styles from './JournalEditor.module.css'

export function JournalEditor({ value, onChange, onBlur }) {
  const { isSupported, isListening, startListening } = useSpeech()

  function handleMic() {
    startListening(transcript => {
      onChange(value ? `${value} ${transcript}` : transcript)
    })
  }

  return (
    <div className={styles.editor}>
      <textarea
        className={styles.textarea}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder="Add a note for today..."
        rows={3}
      />
      {isSupported && (
        <button
          className={`${styles.micBtn} ${isListening ? styles.listening : ''}`}
          onClick={handleMic}
          type="button"
          aria-label="Dictate note"
        >
          🎤
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Create `src/components/JournalEditor.module.css`**

```css
.editor { display: flex; gap: 8px; align-items: flex-start; }
.textarea {
  flex: 1;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  color: #e0e0e0;
  resize: none;
  line-height: 1.5;
}
.textarea::placeholder { color: #555; }
.micBtn {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #1e0f0f;
  border: 1px solid #3b1a1a;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.listening { background: #3b1a1a; border-color: #f87171; animation: pulse 1s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
```

- [ ] **Step 6: Run tests**

```bash
npx vitest run src/hooks/useSpeech.test.js src/components/JournalEditor.test.jsx
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useSpeech.js src/hooks/useSpeech.test.js src/components/JournalEditor.jsx src/components/JournalEditor.module.css src/components/JournalEditor.test.jsx
git commit -m "feat: add useSpeech hook and JournalEditor with speech-to-text"
```

---

## Task 12: Today Screen

**Files:**
- Modify: `src/screens/Today.jsx` (replace stub)
- Create: `src/screens/Today.module.css`
- Create: `src/screens/Today.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `src/screens/Today.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Today } from './Today'
import { HabitsProvider, useHabits } from '../contexts/HabitsContext'
import { JournalProvider } from '../contexts/JournalContext'
import { db } from '../db/db'
import { act } from '@testing-library/react'

beforeEach(async () => {
  await db.habits.clear()
  await db.completions.clear()
  await db.journal_entries.clear()
})

function Wrapper({ children }) {
  return <HabitsProvider><JournalProvider>{children}</JournalProvider></HabitsProvider>
}

test('shows "No habits scheduled" when no habits exist', async () => {
  render(<Today />, { wrapper: Wrapper })
  await screen.findByText(/no habits scheduled/i)
})

test('shows habits due today', async () => {
  const today = new Date()
  const todayDay = today.getDay()
  await db.habits.add({ name: 'Meditate', days: [todayDay], time: null, notifyEnabled: false, createdAt: new Date().toISOString() })
  render(<Today />, { wrapper: Wrapper })
  await screen.findByText('Meditate')
})

test('shows progress count', async () => {
  const todayDay = new Date().getDay()
  await db.habits.add({ name: 'Run', days: [todayDay], time: null, notifyEnabled: false, createdAt: new Date().toISOString() })
  render(<Today />, { wrapper: Wrapper })
  await screen.findByText(/0\/1 done/i)
})

test('journal section is rendered', async () => {
  render(<Today />, { wrapper: Wrapper })
  expect(screen.getByPlaceholderText(/add a note/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/screens/Today.test.jsx
```
Expected: FAIL.

- [ ] **Step 3: Implement `src/screens/Today.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { useHabits } from '../contexts/HabitsContext'
import { useJournal } from '../contexts/JournalContext'
import { DayStrip } from '../components/DayStrip'
import { HabitRow } from '../components/HabitRow'
import { JournalEditor } from '../components/JournalEditor'
import { today } from '../utils/dates'
import styles from './Today.module.css'

export function Today() {
  const { habits, selectedDate, setSelectedDate, completions, toggleCompletion } = useHabits()
  const { loadEntry, saveEntry } = useJournal()
  const [journalText, setJournalText] = useState('')

  useEffect(() => {
    loadEntry(selectedDate).then(entry => setJournalText(entry?.text ?? ''))
  }, [selectedDate, loadEntry])

  const todayStr = today()
  const dayOfWeek = new Date(selectedDate + 'T12:00:00').getDay()
  const habitsDue = habits.filter(h => h.days.includes(dayOfWeek))
  const doneCount = habitsDue.filter(h => completions[h.id]).length

  const dateLabel = selectedDate === todayStr
    ? 'Today'
    : new Date(selectedDate + 'T12:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })

  function handleJournalBlur() {
    if (journalText.trim()) saveEntry(selectedDate, journalText)
  }

  return (
    <div className={styles.screen}>
      <DayStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      <div className={styles.header}>
        <span className={styles.dateLabel}>{dateLabel}</span>
        <span className={styles.progress}>{doneCount}/{habitsDue.length} done</span>
      </div>
      <div className={styles.habits}>
        {habitsDue.length === 0
          ? <p className={styles.empty}>No habits scheduled for this day.</p>
          : habitsDue.map(habit => (
              <HabitRow
                key={habit.id}
                habit={habit}
                completed={Boolean(completions[habit.id])}
                onToggle={() => toggleCompletion(habit.id)}
              />
            ))
        }
      </div>
      <div className={styles.journalSection}>
        <span className={styles.journalLabel}>Journal</span>
        <JournalEditor value={journalText} onChange={setJournalText} onBlur={handleJournalBlur} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `src/screens/Today.module.css`**

```css
.screen { display: flex; flex-direction: column; height: 100%; }
.header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 12px 16px 8px;
}
.dateLabel { font-size: 18px; font-weight: 700; }
.progress { font-size: 13px; color: #4ade80; }
.habits { display: flex; flex-direction: column; gap: 6px; padding: 0 12px; flex: 1; }
.empty { color: #555; font-size: 14px; padding: 20px 0; }
.journalSection {
  padding: 12px;
  border-top: 1px solid #1e1e1e;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.journalLabel { font-size: 11px; color: #555; text-transform: uppercase; letter-spacing: 0.08em; }
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run src/screens/Today.test.jsx
```
Expected: PASS (4 tests).

- [ ] **Step 6: Start dev server and verify visually**

```bash
npm run dev
```

Open the app. The Today screen should show the day strip, habit list, and journal editor. Test: tap a habit row checkbox — it should toggle on/off.

- [ ] **Step 7: Commit**

```bash
git add src/screens/Today.jsx src/screens/Today.module.css src/screens/Today.test.jsx
git commit -m "feat: implement Today screen with day strip, habits, and journal"
```

---

## Task 13: Habits Screen

**Files:**
- Modify: `src/screens/Habits.jsx` (replace stub)
- Create: `src/screens/Habits.module.css`
- Create: `src/screens/Habits.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `src/screens/Habits.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Habits } from './Habits'
import { HabitsProvider } from '../contexts/HabitsContext'
import { JournalProvider } from '../contexts/JournalContext'
import { db } from '../db/db'

beforeEach(async () => { await db.habits.clear(); await db.completions.clear() })

function Wrapper({ children }) {
  return <HabitsProvider><JournalProvider>{children}</JournalProvider></HabitsProvider>
}

test('shows empty state when no habits', async () => {
  render(<Habits />, { wrapper: Wrapper })
  await screen.findByText(/no habits yet/i)
})

test('FAB button is present', async () => {
  render(<Habits />, { wrapper: Wrapper })
  expect(screen.getByLabelText(/add habit/i)).toBeInTheDocument()
})

test('clicking FAB opens HabitForm', async () => {
  const user = userEvent.setup()
  render(<Habits />, { wrapper: Wrapper })
  await user.click(screen.getByLabelText(/add habit/i))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
})

test('added habit appears in list', async () => {
  const user = userEvent.setup()
  render(<Habits />, { wrapper: Wrapper })
  await user.click(screen.getByLabelText(/add habit/i))
  await user.type(screen.getByPlaceholderText(/morning run/i), 'Yoga')
  await user.click(screen.getByText('Save'))
  await screen.findByText('Yoga')
})

test('delete button shows confirmation', async () => {
  const user = userEvent.setup()
  await db.habits.add({ name: 'Run', days: [1], time: null, notifyEnabled: false, createdAt: new Date().toISOString() })
  render(<Habits />, { wrapper: Wrapper })
  await screen.findByText('Run')
  await user.click(screen.getByLabelText(/delete run/i))
  expect(screen.getByText('Delete')).toBeInTheDocument()
  expect(screen.getByText('Cancel')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/screens/Habits.test.jsx
```
Expected: FAIL.

- [ ] **Step 3: Implement `src/screens/Habits.jsx`**

```jsx
import { useState } from 'react'
import { useHabits } from '../contexts/HabitsContext'
import { HabitForm } from '../components/HabitForm'
import { SHORT_DAYS } from '../utils/dates'
import styles from './Habits.module.css'

export function Habits() {
  const { habits, addHabit, updateHabit, deleteHabit } = useHabits()
  const [formHabit, setFormHabit] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  async function handleSave(data) {
    if (formHabit?.id) {
      await updateHabit(formHabit.id, data)
    } else {
      await addHabit(data)
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.header}><h1>Habits</h1></div>
      {habits.length === 0 && <p className={styles.empty}>No habits yet. Tap + to add one.</p>}
      <ul className={styles.list}>
        {habits.map(habit => (
          <li key={habit.id} className={styles.item}>
            <button className={styles.itemContent} onClick={() => setFormHabit(habit)}>
              <span className={styles.habitName}>{habit.name}</span>
              <span className={styles.habitDays}>{habit.days.map(d => SHORT_DAYS[d]).join(' · ')}</span>
            </button>
            {confirmDeleteId === habit.id ? (
              <div className={styles.confirmRow}>
                <button onClick={() => { deleteHabit(habit.id); setConfirmDeleteId(null) }} className={styles.deleteConfirmBtn}>Delete</button>
                <button onClick={() => setConfirmDeleteId(null)} className={styles.cancelBtn}>Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDeleteId(habit.id)}
                className={styles.deleteBtn}
                aria-label={`Delete ${habit.name}`}
              >✕</button>
            )}
          </li>
        ))}
      </ul>
      <button className={styles.fab} onClick={() => setFormHabit({})} aria-label="Add habit">+</button>
      {formHabit !== null && (
        <HabitForm
          habit={formHabit?.id ? formHabit : null}
          onSave={handleSave}
          onClose={() => setFormHabit(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create `src/screens/Habits.module.css`**

```css
.screen { height: 100%; display: flex; flex-direction: column; position: relative; }
.header { padding: 16px; }
.header h1 { font-size: 22px; font-weight: 700; }
.empty { color: #555; font-size: 14px; padding: 20px 16px; }
.list { list-style: none; padding: 0 12px; display: flex; flex-direction: column; gap: 6px; }
.item { display: flex; align-items: center; background: #1a1a1a; border-radius: 10px; padding: 2px 8px 2px 0; }
.itemContent { flex: 1; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 12px 12px; }
.habitName { font-size: 15px; font-weight: 500; }
.habitDays { font-size: 11px; color: #666; }
.deleteBtn { font-size: 14px; color: #666; padding: 8px; }
.confirmRow { display: flex; gap: 6px; padding-right: 4px; }
.deleteConfirmBtn { background: #7f1d1d; color: #fca5a5; font-size: 12px; padding: 6px 10px; border-radius: 6px; }
.cancelBtn { background: #1e1e1e; color: #888; font-size: 12px; padding: 6px 10px; border-radius: 6px; }
.fab {
  position: fixed; bottom: calc(64px + env(safe-area-inset-bottom, 0) + 16px); right: 20px;
  width: 52px; height: 52px; border-radius: 50%;
  background: #4ade80; color: #000; font-size: 28px; font-weight: 300;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
}
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run src/screens/Habits.test.jsx
```
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/screens/Habits.jsx src/screens/Habits.module.css src/screens/Habits.test.jsx
git commit -m "feat: implement Habits screen with CRUD and HabitForm"
```

---

## Task 14: Journal Screen

**Files:**
- Modify: `src/screens/Journal.jsx` (replace stub)
- Create: `src/screens/Journal.module.css`
- Create: `src/screens/Journal.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `src/screens/Journal.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Journal } from './Journal'
import { HabitsProvider } from '../contexts/HabitsContext'
import { JournalProvider } from '../contexts/JournalContext'
import { db } from '../db/db'

beforeEach(async () => { await db.journal_entries.clear() })

function Wrapper({ children }) {
  return <HabitsProvider><JournalProvider>{children}</JournalProvider></HabitsProvider>
}

test('shows empty state when no entries', async () => {
  render(<Journal />, { wrapper: Wrapper })
  await screen.findByText(/no journal entries yet/i)
})

test('lists existing entries', async () => {
  const now = new Date().toISOString()
  await db.journal_entries.add({ date: '2026-06-08', text: 'Great day', createdAt: now, updatedAt: now })
  render(<Journal />, { wrapper: Wrapper })
  await screen.findByText(/great day/i)
})

test('tapping an entry opens edit view', async () => {
  const user = userEvent.setup()
  const now = new Date().toISOString()
  await db.journal_entries.add({ date: '2026-06-08', text: 'My note', createdAt: now, updatedAt: now })
  render(<Journal />, { wrapper: Wrapper })
  const item = await screen.findByText(/my note/i)
  await user.click(item)
  expect(screen.getByRole('textbox')).toHaveValue('My note')
})

test('back button returns to list', async () => {
  const user = userEvent.setup()
  const now = new Date().toISOString()
  await db.journal_entries.add({ date: '2026-06-08', text: 'Note', createdAt: now, updatedAt: now })
  render(<Journal />, { wrapper: Wrapper })
  await user.click(await screen.findByText(/note/))
  await user.click(screen.getByText(/← Back/))
  await screen.findByText(/journal/i)
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/screens/Journal.test.jsx
```
Expected: FAIL.

- [ ] **Step 3: Implement `src/screens/Journal.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { useJournal } from '../contexts/JournalContext'
import styles from './Journal.module.css'

export function Journal() {
  const { getAllEntries, saveEntry } = useJournal()
  const [entries, setEntries] = useState([])
  const [selected, setSelected] = useState(null)
  const [editText, setEditText] = useState('')

  useEffect(() => {
    getAllEntries().then(setEntries)
  }, [getAllEntries])

  function openEntry(entry) {
    setSelected(entry)
    setEditText(entry.text)
  }

  async function handleBlur() {
    if (!selected) return
    await saveEntry(selected.date, editText)
    setEntries(prev => prev.map(e => e.date === selected.date ? { ...e, text: editText } : e))
  }

  if (selected) {
    const d = new Date(selected.date + 'T12:00:00')
    const label = d.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    return (
      <div className={styles.screen}>
        <div className={styles.header}>
          <button onClick={() => setSelected(null)} className={styles.backBtn}>← Back</button>
          <span className={styles.entryDateFull}>{label}</span>
        </div>
        <textarea
          className={styles.editArea}
          value={editText}
          onChange={e => setEditText(e.target.value)}
          onBlur={handleBlur}
          autoFocus
        />
      </div>
    )
  }

  return (
    <div className={styles.screen}>
      <div className={styles.header}><h1>Journal</h1></div>
      {entries.length === 0 && <p className={styles.empty}>No journal entries yet. Add one from Today.</p>}
      <ul className={styles.list}>
        {entries.map(entry => (
          <li key={entry.date}>
            <button className={styles.entryItem} onClick={() => openEntry(entry)}>
              <span className={styles.entryDate}>
                {new Date(entry.date + 'T12:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className={styles.entryPreview}>
                {entry.text.slice(0, 90)}{entry.text.length > 90 ? '…' : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: Create `src/screens/Journal.module.css`**

```css
.screen { height: 100%; display: flex; flex-direction: column; }
.header { padding: 16px; display: flex; align-items: center; gap: 12px; }
.header h1 { font-size: 22px; font-weight: 700; }
.backBtn { font-size: 15px; color: #4ade80; padding: 4px 0; }
.entryDateFull { font-size: 14px; color: #888; }
.empty { color: #555; font-size: 14px; padding: 20px 16px; }
.list { list-style: none; padding: 0 12px; display: flex; flex-direction: column; gap: 6px; }
.entryItem {
  display: flex; flex-direction: column; gap: 4px; width: 100%;
  background: #1a1a1a; border-radius: 10px; padding: 12px 14px; text-align: left;
}
.entryDate { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.06em; }
.entryPreview { font-size: 14px; color: #ccc; line-height: 1.4; }
.editArea {
  flex: 1; background: transparent; border: none; outline: none;
  padding: 0 16px 16px; font-size: 16px; color: #e0e0e0; line-height: 1.6; resize: none;
}
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run src/screens/Journal.test.jsx
```
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/screens/Journal.jsx src/screens/Journal.module.css src/screens/Journal.test.jsx
git commit -m "feat: implement Journal screen with entry list and edit view"
```

---

## Task 15: Notifications

**Files:**
- Create: `src/notifications.js`
- Create: `src/notifications.test.js`
- Modify: `src/main.jsx`

- [ ] **Step 1: Write the failing tests**

Create `src/notifications.test.js`:

```js
import { vi } from 'vitest'
import { scheduleHabitReminders } from './notifications'

// Mock Notification API
beforeEach(() => {
  vi.stubGlobal('Notification', {
    permission: 'granted',
  })
  vi.useFakeTimers()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

test('scheduleHabitReminders does nothing if habit has no time', () => {
  const habits = [{ id: 1, name: 'Run', days: [0,1,2,3,4,5,6], time: null, notifyEnabled: true }]
  expect(() => scheduleHabitReminders(habits, [])).not.toThrow()
})

test('scheduleHabitReminders skips habits with notifyEnabled false', () => {
  const habits = [{ id: 1, name: 'Run', days: [0,1,2,3,4,5,6], time: '08:00', notifyEnabled: false }]
  const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
  scheduleHabitReminders(habits)
  expect(setTimeoutSpy).not.toHaveBeenCalled()
})

test('scheduleHabitReminders skips if habit not scheduled today', () => {
  const today = new Date()
  const todayDay = today.getDay()
  const otherDay = (todayDay + 1) % 7
  const habits = [{ id: 1, name: 'Run', days: [otherDay], time: '08:00', notifyEnabled: true }]
  const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
  scheduleHabitReminders(habits)
  expect(setTimeoutSpy).not.toHaveBeenCalled()
})

test('requestNotificationPermission returns false when Notification unavailable', async () => {
  vi.stubGlobal('Notification', undefined)
  const { requestNotificationPermission } = await import('./notifications')
  const result = await requestNotificationPermission()
  expect(result).toBe(false)
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/notifications.test.js
```
Expected: FAIL.

- [ ] **Step 3: Implement `src/notifications.js`**

```js
export async function requestNotificationPermission() {
  if (!window.Notification) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}

// Called on app startup. Schedules browser notifications for habits due today.
// Works when the app is open (foreground or backgrounded PWA).
// True push notifications (app fully closed) require a backend — deferred to Cloud Sync phase.
export function scheduleHabitReminders(habits) {
  if (!window.Notification || Notification.permission !== 'granted') return

  const now = new Date()
  const todayDay = now.getDay()

  habits.forEach(habit => {
    if (!habit.notifyEnabled) return
    if (!habit.time) return
    if (!habit.days.includes(todayDay)) return

    const [hours, minutes] = habit.time.split(':').map(Number)
    const target = new Date(now)
    target.setHours(hours, minutes, 0, 0)

    const delay = target.getTime() - now.getTime()
    if (delay <= 0) return

    setTimeout(() => {
      new Notification(`Time for: ${habit.name}`, {
        body: 'Tap to open Daily Habit',
        icon: '/icon-192.png',
      })
    }, delay)
  })
}
```

- [ ] **Step 4: Wire notifications into `src/main.jsx`**

Replace `src/main.jsx`:
```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { db } from './db/db'
import { scheduleHabitReminders } from './notifications'

async function init() {
  // Schedule any habit reminders for today on startup
  const habits = await db.habits.toArray()
  scheduleHabitReminders(habits)
}

init()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 5: Wire up notification permission request in HabitForm**

In `src/components/HabitForm.jsx`, add the permission request when user enables notifications. Add this import at the top:

```js
import { requestNotificationPermission } from '../notifications'
```

Replace the `notifyEnabled` checkbox's `onChange` handler:

```jsx
onChange={async (e) => {
  if (e.target.checked) {
    const granted = await requestNotificationPermission()
    setNotifyEnabled(granted)
  } else {
    setNotifyEnabled(false)
  }
}}
```

- [ ] **Step 6: Run all tests**

```bash
npx vitest run src/notifications.test.js
```
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add src/notifications.js src/notifications.test.js src/main.jsx src/components/HabitForm.jsx
git commit -m "feat: add notification scheduling (in-app, no backend required)"
```

---

## Task 16: PWA Config, Icons, and Final Verification

**Files:**
- Create: `public/icon-192.png` (real icon)
- Create: `public/icon-512.png` (real icon)
- Verify: `vite.config.js` manifest (already done in Task 1)

- [ ] **Step 1: Generate real PWA icons**

You can use any image editor or an online tool. The icons should be:
- `public/icon-192.png` — 192×192px, dark background (#111111), app initial or logo
- `public/icon-512.png` — 512×512px, same design

Quick approach using ImageMagick if available:
```bash
# Check if ImageMagick is available
which convert && \
  convert -size 192x192 xc:#111111 -fill '#4ade80' -font DejaVu-Sans -pointsize 80 -gravity center -annotate 0 'H' public/icon-192.png && \
  convert -size 512x512 xc:#111111 -fill '#4ade80' -font DejaVu-Sans -pointsize 200 -gravity center -annotate 0 'H' public/icon-512.png
```

If ImageMagick is not available, use any image. The app will still work with placeholder icons.

- [ ] **Step 2: Build and inspect the PWA manifest**

```bash
npm run build
```

Expected: build completes with no errors. Check `dist/` for the generated manifest.

- [ ] **Step 3: Preview the production build**

```bash
npm run preview
```

Open `http://localhost:4173`. In Chrome DevTools → Application → Manifest, verify:
- Name: "Daily Habit"
- Icons: both 192 and 512 listed
- Display: standalone

- [ ] **Step 4: Test installability on Android**

On your Android phone, open Chrome and navigate to the preview URL (your machine's local IP, e.g. `http://192.168.x.x:4173`). Chrome should show an "Add to Home Screen" prompt or you can trigger it from the browser menu.

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: all tests PASS. No failures.

- [ ] **Step 6: Commit**

```bash
git add public/icon-192.png public/icon-512.png
git commit -m "feat: add PWA icons and verify installability"
```

---

## Final Check

Run the complete test suite one last time:

```bash
npx vitest run
```

Then start the dev server and manually test the golden paths:

1. **Add a habit** → Habits tab → tap + → fill form → Save → habit appears in list
2. **Daily check-in** → Today tab → tap a habit checkbox → toggles on/off, streak appears
3. **Journal entry** → Today tab → type in journal field → tap away → navigate to Journal tab → entry appears
4. **Speech-to-text** → Today tab → tap mic → speak → text appended to journal field
5. **Navigate days** → Today tab → scroll day strip left → tap a past day → habits and journal for that day load
6. **Delete habit** → Habits tab → tap ✕ → confirm Delete → habit removed

---

> **Plan complete.** Two execution options:
>
> **1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks
>
> **2. Inline Execution** — execute tasks in this session using executing-plans

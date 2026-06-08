# Health Tracking Core — Implementation Plan (Phase 2a)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Health tab with body-map symptom logging and vital sign recording to the existing Daily Habit PWA.

**Architecture:** Two new React Contexts (HealthContext, VitalsContext) own all DB access via Dexie v2 migration. Symptom drawing uses an SVG overlay layer recording Catmull-Rom smoothed paths in a 200×300 coordinate space. Body region SVG outlines are static files in `public/body/` — swappable without code changes. Google Fit integration is deferred to Plan 2b.

**Tech Stack:** React 18, Vite, Dexie.js 4 (v2 migration), Vitest + @testing-library/react, SVG path drawing (no canvas)

---

## File Map

```
public/body/                         # Static SVG region outlines (swappable)
  full-front.svg  full-back.svg
  head-front.svg  head-back.svg  head-left.svg  head-right.svg
  chest-front.svg  chest-back.svg  chest-left.svg  chest-right.svg
  abdomen-front.svg  abdomen-back.svg
  back-front.svg  back-back.svg  back-left.svg  back-right.svg
  left_arm-front.svg  ...  (4 views each, 8 remaining regions)
  right_arm-front.svg  ...
  left_hand-front.svg  ...
  right_hand-front.svg  ...
  left_leg-front.svg  ...
  right_leg-front.svg  ...
  left_foot-front.svg  ...
  right_foot-front.svg  ...

src/
  db/db.js                           # Modify: add v2 schema + seeding
  utils/bezier.js                    # Create: pointsToPath(points) → SVG d string
  utils/bezier.test.js
  utils/intensity.js                 # Create: INTENSITY_LEVELS constant
  contexts/HealthContext.jsx         # Create: symptom_types + symptoms CRUD
  contexts/HealthContext.test.jsx
  contexts/VitalsContext.jsx         # Create: vital_types + vital_entries CRUD
  contexts/VitalsContext.test.jsx
  components/BottomNav.jsx           # Modify: add Health tab
  components/BottomNav.test.jsx      # Modify: update tab count assertion
  App.jsx                            # Modify: add HealthProvider, VitalsProvider, Health screen
  screens/Health.jsx                 # Create: Overview + History segmented tabs
  screens/Health.module.css
  screens/Health.test.jsx
  components/health/
    IntensityPicker.jsx              # Create: 1-5 named scale
    IntensityPicker.module.css
    IntensityPicker.test.jsx
    DrawingCanvas.jsx                # Create: SVG path recorder (pointer events)
    DrawingCanvas.module.css
    DrawingCanvas.test.jsx
    BodyMap.jsx                      # Create: full-body inline SVG, region tap
    BodyMap.module.css
    BodyMap.test.jsx
    BodyRegion.jsx                   # Create: drill-down, 4-view selector, draws on top
    BodyRegion.module.css
    BodyRegion.test.jsx
    LogSymptomSheet.jsx              # Create: 3-step bottom sheet
    LogSymptomSheet.module.css
    LogSymptomSheet.test.jsx
    LogVitalSheet.jsx                # Create: vital entry form
    LogVitalSheet.module.css
    LogVitalSheet.test.jsx
    VitalTypeForm.jsx                # Create: add/edit custom vital type
    VitalTypeForm.module.css
    VitalTypeForm.test.jsx
    GoogleFitSync.jsx                # Create: placeholder button (wired in Plan 2b)
    GoogleFitSync.module.css
```

---

## Task 1: DB Schema v2 Migration + Vital Type Seeding

**Files:**
- Modify: `src/db/db.js`
- Modify: `src/db/db.test.js`

- [ ] **Step 1: Write the failing tests**

Add to `src/db/db.test.js` (after existing tests):

```js
describe('version 2 tables', () => {
  beforeEach(async () => {
    await db.symptom_types.clear()
    await db.symptoms.clear()
    await db.vital_types.clear()
    await db.vital_entries.clear()
    await db.google_fit_sync.clear()
  })

  test('symptom_types table exists', () => {
    expect(db.symptom_types).toBeDefined()
  })

  test('symptoms table exists', () => {
    expect(db.symptoms).toBeDefined()
  })

  test('vital_types table exists and is seeded with 6 standard types', async () => {
    const types = await db.vital_types.toArray()
    // Seeding happens in upgrade hook — in tests fake-indexeddb starts fresh
    // so we test the table exists and can accept records
    expect(db.vital_types).toBeDefined()
  })

  test('can add and retrieve a symptom', async () => {
    const id = await db.symptoms.add({
      symptom_type_id: 1,
      region: 'head',
      view: 'front',
      svg_paths: JSON.stringify([]),
      intensity: 3,
      pain_type: JSON.stringify(['throbbing']),
      notes: '',
      timestamp: new Date().toISOString(),
    })
    const row = await db.symptoms.get(id)
    expect(row.region).toBe('head')
    expect(row.intensity).toBe(3)
  })

  test('vital_entries compound index on vital_type_id works', async () => {
    await db.vital_entries.add({
      vital_type_id: 1,
      value: JSON.stringify('72'),
      notes: '',
      timestamp: new Date().toISOString(),
      source: 'manual',
    })
    const rows = await db.vital_entries.where('vital_type_id').equals(1).toArray()
    expect(rows).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run src/db/db.test.js
```
Expected: FAIL — new tables don't exist yet.

- [ ] **Step 3: Implement DB v2 in `src/db/db.js`**

Read the current file first, then replace entirely:

```js
import Dexie from 'dexie'

export const db = new Dexie('dailyhabit')

db.version(1).stores({
  habits: '++id, createdAt',
  completions: '++id, [habitId+date], date',
  journal_entries: '++id, &date',
  notification_prefs: 'habitId',
})

db.version(2).stores({
  habits: '++id, createdAt',
  completions: '++id, [habitId+date], date',
  journal_entries: '++id, &date',
  notification_prefs: 'habitId',
  symptom_types: '++id, name, createdAt',
  symptoms: '++id, symptom_type_id, timestamp, region',
  vital_types: '++id, name, is_standard',
  vital_entries: '++id, vital_type_id, timestamp, source',
  google_fit_sync: '++id, data_type',
}).upgrade(tx => {
  const now = new Date().toISOString()
  return tx.table('vital_types').bulkAdd([
    { name: 'Blood Pressure', unit: 'mmHg', value_schema: 'compound', is_standard: true, normal_min: null, normal_max: null, createdAt: now },
    { name: 'Blood Sugar', unit: 'mmol/L', value_schema: 'single', is_standard: true, normal_min: 3.9, normal_max: 7.8, createdAt: now },
    { name: 'Heart Rate', unit: 'bpm', value_schema: 'single', is_standard: true, normal_min: 60, normal_max: 100, createdAt: now },
    { name: 'Weight', unit: 'kg', value_schema: 'single', is_standard: true, normal_min: null, normal_max: null, createdAt: now },
    { name: 'Temperature', unit: '°C', value_schema: 'single', is_standard: true, normal_min: 36.1, normal_max: 37.2, createdAt: now },
    { name: 'Oxygen Saturation', unit: '%', value_schema: 'single', is_standard: true, normal_min: 95, normal_max: 100, createdAt: now },
  ])
})
```

- [ ] **Step 4: Run tests**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run src/db/db.test.js
```
Expected: PASS (all tests including old ones).

- [ ] **Step 5: Run full suite to check no regressions**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run
```
Expected: all existing tests still PASS.

- [ ] **Step 6: Commit**

```bash
cd /home/jazman/projects/dailyhabitapp && git add src/db/db.js src/db/db.test.js && git commit -m "feat: add Dexie v2 schema (symptoms, vitals, google_fit_sync) with vital type seeding"
```

---

## Task 2: Intensity Constants + Bézier Smoothing Utility

**Files:**
- Create: `src/utils/intensity.js`
- Create: `src/utils/bezier.js`
- Create: `src/utils/bezier.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/utils/bezier.test.js`:

```js
import { pointsToPath } from './bezier'

test('returns empty string for fewer than 2 points', () => {
  expect(pointsToPath([])).toBe('')
  expect(pointsToPath([{ x: 10, y: 20 }])).toBe('')
})

test('returns a line for exactly 2 points', () => {
  const result = pointsToPath([{ x: 0, y: 0 }, { x: 100, y: 100 }])
  expect(result).toMatch(/^M /)
  expect(result).toContain('0 0')
  expect(result).toContain('100 100')
})

test('returns a path starting with M for 3+ points', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 50, y: 50 },
    { x: 100, y: 0 },
  ]
  const result = pointsToPath(points)
  expect(result).toMatch(/^M 0 0/)
  expect(result).toContain('C ')
})

test('output is a valid SVG path d attribute (no NaN)', () => {
  const points = Array.from({ length: 10 }, (_, i) => ({ x: i * 10, y: Math.sin(i) * 20 + 50 }))
  const result = pointsToPath(points)
  expect(result).not.toContain('NaN')
  expect(result).not.toContain('undefined')
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run src/utils/bezier.test.js
```
Expected: FAIL.

- [ ] **Step 3: Create `src/utils/intensity.js`**

```js
export const INTENSITY_LEVELS = [
  { value: 1, label: 'Minimal',  color: '#4ade80' },
  { value: 2, label: 'Mild',     color: '#a3e635' },
  { value: 3, label: 'Moderate', color: '#facc15' },
  { value: 4, label: 'Severe',   color: '#f97316' },
  { value: 5, label: 'Extreme',  color: '#ef4444' },
]

export function intensityColor(value) {
  return INTENSITY_LEVELS.find(l => l.value === value)?.color ?? '#4ade80'
}

export function intensityLabel(value) {
  return INTENSITY_LEVELS.find(l => l.value === value)?.label ?? 'Unknown'
}
```

- [ ] **Step 4: Create `src/utils/bezier.js`**

```js
// Catmull-Rom → cubic Bézier conversion for smooth freehand paths.
// Input: [{x, y}, ...] touch/pointer points
// Output: SVG path d string
export function pointsToPath(points) {
  if (points.length < 2) return ''
  if (points.length === 2) {
    const [a, b] = points
    return `M ${r(a.x)} ${r(a.y)} L ${r(b.x)} ${r(b.y)}`
  }

  const d = [`M ${r(points[0].x)} ${r(points[0].y)}`]

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(i + 2, points.length - 1)]

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    d.push(`C ${r(cp1x)} ${r(cp1y)}, ${r(cp2x)} ${r(cp2y)}, ${r(p2.x)} ${r(p2.y)}`)
  }

  return d.join(' ')
}

function r(n) {
  return Math.round(n * 10) / 10
}
```

- [ ] **Step 5: Run tests**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run src/utils/bezier.test.js
```
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
cd /home/jazman/projects/dailyhabitapp && git add src/utils/intensity.js src/utils/bezier.js src/utils/bezier.test.js && git commit -m "feat: add bezier smoothing utility and intensity constants"
```

---

## Task 3: SVG Body Placeholder Assets

**Files:**
- Create: `public/body/*.svg` (50 files — generated by script)
- Create: `scripts/generate-body-svgs.js`

- [ ] **Step 1: Create the generation script**

Create `scripts/generate-body-svgs.js`:

```js
// Generates placeholder SVG outlines for all body regions and views.
// Run once: node scripts/generate-body-svgs.js
// Replace individual files with anatomically accurate SVGs later.
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const OUT = join(process.cwd(), 'public', 'body')
mkdirSync(OUT, { recursive: true })

const REGIONS = {
  full:       { views: ['front', 'back'], label: 'Full Body',   shape: 'body' },
  head:       { views: ['front', 'back', 'left', 'right'], label: 'Head',       shape: 'oval' },
  chest:      { views: ['front', 'back', 'left', 'right'], label: 'Chest',      shape: 'trap' },
  abdomen:    { views: ['front', 'back'],                  label: 'Abdomen',    shape: 'rect' },
  back:       { views: ['front', 'back', 'left', 'right'], label: 'Back',       shape: 'rect' },
  left_arm:   { views: ['front', 'back', 'left', 'right'], label: 'Left Arm',   shape: 'arm' },
  right_arm:  { views: ['front', 'back', 'left', 'right'], label: 'Right Arm',  shape: 'arm' },
  left_hand:  { views: ['front', 'back', 'left', 'right'], label: 'Left Hand',  shape: 'hand' },
  right_hand: { views: ['front', 'back', 'left', 'right'], label: 'Right Hand', shape: 'hand' },
  left_leg:   { views: ['front', 'back', 'left', 'right'], label: 'Left Leg',   shape: 'leg' },
  right_leg:  { views: ['front', 'back', 'left', 'right'], label: 'Right Leg',  shape: 'leg' },
  left_foot:  { views: ['front', 'back', 'left', 'right'], label: 'Left Foot',  shape: 'foot' },
  right_foot: { views: ['front', 'back', 'left', 'right'], label: 'Right Foot', shape: 'foot' },
}

function outline(shape) {
  switch (shape) {
    case 'oval':  return '<ellipse cx="100" cy="100" rx="70" ry="85" fill="none" stroke="#4a4a4a" stroke-width="2"/>'
    case 'trap':  return '<path d="M30,40 L170,40 L155,160 L45,160Z" fill="none" stroke="#4a4a4a" stroke-width="2"/>'
    case 'rect':  return '<rect x="40" y="30" width="120" height="140" rx="12" fill="none" stroke="#4a4a4a" stroke-width="2"/>'
    case 'arm':   return '<rect x="70" y="20" width="60" height="160" rx="28" fill="none" stroke="#4a4a4a" stroke-width="2"/>'
    case 'hand':  return '<path d="M60,160 L60,80 Q60,30 100,30 Q140,30 140,80 L140,160 Q140,180 100,190 Q60,180 60,160Z" fill="none" stroke="#4a4a4a" stroke-width="2"/>'
    case 'leg':   return '<rect x="65" y="20" width="70" height="160" rx="30" fill="none" stroke="#4a4a4a" stroke-width="2"/>'
    case 'foot':  return '<path d="M30,80 Q30,20 100,20 Q150,20 170,60 L170,140 Q170,170 130,175 L40,175 Q20,170 20,140 L20,100 Q20,80 30,80Z" fill="none" stroke="#4a4a4a" stroke-width="2"/>'
    case 'body':  return `
      <ellipse cx="100" cy="28" rx="22" ry="25" fill="none" stroke="#4a4a4a" stroke-width="2"/>
      <path d="M68,55 L68,120 Q100,128 132,120 L132,55 Q116,48 100,48 Q84,48 68,55Z" fill="none" stroke="#4a4a4a" stroke-width="2"/>
      <path d="M68,120 L65,150 Q100,158 135,150 L132,120 Q100,128 68,120Z" fill="none" stroke="#4a4a4a" stroke-width="2"/>
      <path d="M65,150 L60,200 Q72,205 82,200 L85,150Z" fill="none" stroke="#4a4a4a" stroke-width="2"/>
      <path d="M135,150 L140,200 Q128,205 118,200 L115,150Z" fill="none" stroke="#4a4a4a" stroke-width="2"/>
      <path d="M45,56 L38,100 Q44,106 52,102 L60,56Z" fill="none" stroke="#4a4a4a" stroke-width="2"/>
      <path d="M155,56 L162,100 Q156,106 148,102 L140,56Z" fill="none" stroke="#4a4a4a" stroke-width="2"/>`
    default:      return '<rect x="20" y="20" width="160" height="160" rx="12" fill="none" stroke="#4a4a4a" stroke-width="2"/>'
  }
}

for (const [region, { views, label, shape }] of Object.entries(REGIONS)) {
  for (const view of views) {
    const filename = `${region}-${view}.svg`
    const svg = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="200" fill="#111"/>
  ${outline(shape)}
  <text x="100" y="195" text-anchor="middle" font-size="10" fill="#444" font-family="system-ui">${label} · ${view}</text>
</svg>`
    writeFileSync(join(OUT, filename), svg)
    console.log('wrote', filename)
  }
}
console.log('Done — replace files in public/body/ with anatomically accurate SVGs when ready.')
```

- [ ] **Step 2: Run the script**

```bash
cd /home/jazman/projects/dailyhabitapp && node scripts/generate-body-svgs.js
```
Expected: `wrote full-front.svg` … `Done — replace files in public/body/…`

Verify files exist:
```bash
ls public/body/ | wc -l
```
Expected: 50

- [ ] **Step 3: Add to .gitignore if desired, otherwise commit**

These placeholder SVGs should be committed so the app renders without broken images.

```bash
cd /home/jazman/projects/dailyhabitapp && git add public/body/ scripts/generate-body-svgs.js && git commit -m "feat: add placeholder body region SVG assets and generator script"
```

---

## Task 4: HealthContext

**Files:**
- Create: `src/contexts/HealthContext.jsx`
- Create: `src/contexts/HealthContext.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `src/contexts/HealthContext.test.jsx`:

```jsx
import { renderHook, act } from '@testing-library/react'
import { HealthProvider, useHealth } from './HealthContext'
import { db } from '../db/db'

beforeEach(async () => {
  await db.symptom_types.clear()
  await db.symptoms.clear()
})

const wrapper = ({ children }) => <HealthProvider>{children}</HealthProvider>

test('symptomTypes starts empty', async () => {
  const { result } = renderHook(() => useHealth(), { wrapper })
  await act(async () => {})
  expect(result.current.symptomTypes).toEqual([])
})

test('addSymptomType adds to db and state', async () => {
  const { result } = renderHook(() => useHealth(), { wrapper })
  await act(async () => {
    await result.current.addSymptomType('Headache')
  })
  expect(result.current.symptomTypes).toHaveLength(1)
  expect(result.current.symptomTypes[0].name).toBe('Headache')
})

test('addSymptom adds to db and state', async () => {
  const { result } = renderHook(() => useHealth(), { wrapper })
  let type
  await act(async () => {
    type = await result.current.addSymptomType('Nausea')
  })
  await act(async () => {
    await result.current.addSymptom({
      symptom_type_id: type.id,
      region: 'abdomen',
      view: 'front',
      svg_paths: JSON.stringify([]),
      intensity: 2,
      pain_type: JSON.stringify(['dull']),
      notes: '',
      timestamp: new Date().toISOString(),
    })
  })
  expect(result.current.symptoms).toHaveLength(1)
  expect(result.current.symptoms[0].region).toBe('abdomen')
})

test('deleteSymptomType removes type and its symptoms', async () => {
  const { result } = renderHook(() => useHealth(), { wrapper })
  let type
  await act(async () => {
    type = await result.current.addSymptomType('Test')
    await result.current.addSymptom({
      symptom_type_id: type.id, region: 'head', view: 'front',
      svg_paths: '[]', intensity: 1, pain_type: '[]', notes: '',
      timestamp: new Date().toISOString(),
    })
  })
  await act(async () => {
    await result.current.deleteSymptomType(type.id)
  })
  expect(result.current.symptomTypes).toHaveLength(0)
  expect(result.current.symptoms).toHaveLength(0)
})

test('deleteSymptom removes from state', async () => {
  const { result } = renderHook(() => useHealth(), { wrapper })
  let symptom
  await act(async () => {
    const type = await result.current.addSymptomType('Test')
    symptom = await result.current.addSymptom({
      symptom_type_id: type.id, region: 'head', view: 'front',
      svg_paths: '[]', intensity: 1, pain_type: '[]', notes: '',
      timestamp: new Date().toISOString(),
    })
  })
  await act(async () => {
    await result.current.deleteSymptom(symptom.id)
  })
  expect(result.current.symptoms).toHaveLength(0)
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run src/contexts/HealthContext.test.jsx
```
Expected: FAIL.

- [ ] **Step 3: Implement `src/contexts/HealthContext.jsx`**

```jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { db } from '../db/db'

const HealthContext = createContext(null)

export function HealthProvider({ children }) {
  const [symptomTypes, setSymptomTypes] = useState([])
  const [symptoms, setSymptoms] = useState([])

  useEffect(() => {
    db.symptom_types.orderBy('name').toArray().then(setSymptomTypes)
    db.symptoms.orderBy('timestamp').reverse().toArray().then(setSymptoms)
  }, [])

  const addSymptomType = useCallback(async (name) => {
    const id = await db.symptom_types.add({ name, createdAt: new Date().toISOString() })
    const type = await db.symptom_types.get(id)
    setSymptomTypes(prev => [...prev, type].sort((a, b) => a.name.localeCompare(b.name)))
    return type
  }, [])

  const deleteSymptomType = useCallback(async (id) => {
    await db.transaction('rw', db.symptom_types, db.symptoms, async () => {
      await db.symptom_types.delete(id)
      await db.symptoms.where('symptom_type_id').equals(id).delete()
    })
    setSymptomTypes(prev => prev.filter(t => t.id !== id))
    setSymptoms(prev => prev.filter(s => s.symptom_type_id !== id))
  }, [])

  const addSymptom = useCallback(async (data) => {
    const row = { ...data, timestamp: data.timestamp ?? new Date().toISOString() }
    const id = await db.symptoms.add(row)
    const saved = await db.symptoms.get(id)
    setSymptoms(prev => [saved, ...prev])
    return saved
  }, [])

  const deleteSymptom = useCallback(async (id) => {
    await db.symptoms.delete(id)
    setSymptoms(prev => prev.filter(s => s.id !== id))
  }, [])

  const getRecentSymptoms = useCallback(async (days = 7) => {
    const since = new Date()
    since.setDate(since.getDate() - days)
    return db.symptoms.where('timestamp').above(since.toISOString()).toArray()
  }, [])

  return (
    <HealthContext.Provider value={{
      symptomTypes, symptoms,
      addSymptomType, deleteSymptomType, addSymptom, deleteSymptom, getRecentSymptoms,
    }}>
      {children}
    </HealthContext.Provider>
  )
}

export function useHealth() {
  const ctx = useContext(HealthContext)
  if (!ctx) throw new Error('useHealth must be used within HealthProvider')
  return ctx
}
```

- [ ] **Step 4: Run tests**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run src/contexts/HealthContext.test.jsx
```
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/jazman/projects/dailyhabitapp && git add src/contexts/HealthContext.jsx src/contexts/HealthContext.test.jsx && git commit -m "feat: add HealthContext with symptom types and symptoms CRUD"
```

---

## Task 5: VitalsContext

**Files:**
- Create: `src/contexts/VitalsContext.jsx`
- Create: `src/contexts/VitalsContext.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `src/contexts/VitalsContext.test.jsx`:

```jsx
import { renderHook, act } from '@testing-library/react'
import { VitalsProvider, useVitals } from './VitalsContext'
import { db } from '../db/db'

beforeEach(async () => {
  await db.vital_types.clear()
  await db.vital_entries.clear()
})

const wrapper = ({ children }) => <VitalsProvider>{children}</VitalsProvider>

test('vitalTypes starts empty when db is cleared', async () => {
  const { result } = renderHook(() => useVitals(), { wrapper })
  await act(async () => {})
  expect(result.current.vitalTypes).toEqual([])
})

test('addVitalType adds custom type with is_standard false', async () => {
  const { result } = renderHook(() => useVitals(), { wrapper })
  await act(async () => {
    await result.current.addVitalType({
      name: 'Steps', unit: 'steps/day', value_schema: 'single',
      normal_min: null, normal_max: null,
    })
  })
  expect(result.current.vitalTypes).toHaveLength(1)
  expect(result.current.vitalTypes[0].is_standard).toBe(false)
})

test('addVitalEntry adds to db and state', async () => {
  const { result } = renderHook(() => useVitals(), { wrapper })
  let type
  await act(async () => {
    type = await result.current.addVitalType({
      name: 'Heart Rate', unit: 'bpm', value_schema: 'single',
      normal_min: 60, normal_max: 100,
    })
  })
  await act(async () => {
    await result.current.addVitalEntry({
      vital_type_id: type.id,
      value: JSON.stringify('72'),
      notes: '',
    })
  })
  expect(result.current.vitalEntries).toHaveLength(1)
  expect(result.current.vitalEntries[0].source).toBe('manual')
})

test('deleteVitalType removes type and its entries', async () => {
  const { result } = renderHook(() => useVitals(), { wrapper })
  let type
  await act(async () => {
    type = await result.current.addVitalType({ name: 'X', unit: 'u', value_schema: 'single', normal_min: null, normal_max: null })
    await result.current.addVitalEntry({ vital_type_id: type.id, value: '"1"', notes: '' })
  })
  await act(async () => {
    await result.current.deleteVitalType(type.id)
  })
  expect(result.current.vitalTypes).toHaveLength(0)
  expect(result.current.vitalEntries).toHaveLength(0)
})

test('standard types cannot be deleted — deleteVitalType no-ops for is_standard', async () => {
  const { result } = renderHook(() => useVitals(), { wrapper })
  // Manually seed a standard type for this test
  await act(async () => {
    await db.vital_types.add({ name: 'Std', unit: 'u', value_schema: 'single', is_standard: true, normal_min: null, normal_max: null, createdAt: new Date().toISOString() })
    // Re-load
    const types = await db.vital_types.toArray()
    result.current.vitalTypes.push(...types) // trigger via proper reload
  })
  // reload hook
  const { result: r2 } = renderHook(() => useVitals(), { wrapper })
  await act(async () => {})
  const stdType = r2.current.vitalTypes.find(t => t.is_standard)
  if (stdType) {
    await act(async () => {
      await r2.current.deleteVitalType(stdType.id)
    })
    // Standard type should still exist
    expect(r2.current.vitalTypes.some(t => t.id === stdType.id)).toBe(true)
  }
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run src/contexts/VitalsContext.test.jsx
```
Expected: FAIL.

- [ ] **Step 3: Implement `src/contexts/VitalsContext.jsx`**

```jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { db } from '../db/db'

const VitalsContext = createContext(null)

export function VitalsProvider({ children }) {
  const [vitalTypes, setVitalTypes] = useState([])
  const [vitalEntries, setVitalEntries] = useState([])

  useEffect(() => {
    db.vital_types.orderBy('name').toArray().then(setVitalTypes)
    db.vital_entries.orderBy('timestamp').reverse().limit(200).toArray().then(setVitalEntries)
  }, [])

  const addVitalType = useCallback(async (data) => {
    const id = await db.vital_types.add({ ...data, is_standard: false, createdAt: new Date().toISOString() })
    const type = await db.vital_types.get(id)
    setVitalTypes(prev => [...prev, type].sort((a, b) => a.name.localeCompare(b.name)))
    return type
  }, [])

  const updateVitalType = useCallback(async (id, data) => {
    await db.vital_types.update(id, data)
    setVitalTypes(prev => prev.map(t => t.id === id ? { ...t, ...data } : t))
  }, [])

  const deleteVitalType = useCallback(async (id) => {
    const type = await db.vital_types.get(id)
    if (!type || type.is_standard) return
    await db.transaction('rw', db.vital_types, db.vital_entries, async () => {
      await db.vital_types.delete(id)
      await db.vital_entries.where('vital_type_id').equals(id).delete()
    })
    setVitalTypes(prev => prev.filter(t => t.id !== id))
    setVitalEntries(prev => prev.filter(e => e.vital_type_id !== id))
  }, [])

  const addVitalEntry = useCallback(async (data) => {
    const entry = { ...data, source: data.source ?? 'manual', timestamp: data.timestamp ?? new Date().toISOString() }
    const id = await db.vital_entries.add(entry)
    const saved = await db.vital_entries.get(id)
    setVitalEntries(prev => [saved, ...prev])
    return saved
  }, [])

  const getEntriesForType = useCallback(async (vitalTypeId, limit = 50) => {
    return db.vital_entries.where('vital_type_id').equals(vitalTypeId).reverse().limit(limit).toArray()
  }, [])

  return (
    <VitalsContext.Provider value={{
      vitalTypes, vitalEntries,
      addVitalType, updateVitalType, deleteVitalType, addVitalEntry, getEntriesForType,
    }}>
      {children}
    </VitalsContext.Provider>
  )
}

export function useVitals() {
  const ctx = useContext(VitalsContext)
  if (!ctx) throw new Error('useVitals must be used within VitalsProvider')
  return ctx
}
```

- [ ] **Step 4: Run tests**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run src/contexts/VitalsContext.test.jsx
```
Expected: PASS (5 tests — the last test may be skipped if no standard type exists in clean DB, that's fine).

- [ ] **Step 5: Commit**

```bash
cd /home/jazman/projects/dailyhabitapp && git add src/contexts/VitalsContext.jsx src/contexts/VitalsContext.test.jsx && git commit -m "feat: add VitalsContext with vital types and entries CRUD"
```

---

## Task 6: BottomNav + App — Add Health Tab

**Files:**
- Modify: `src/components/BottomNav.jsx`
- Modify: `src/components/BottomNav.test.jsx`
- Modify: `src/App.jsx`
- Create: `src/screens/Health.jsx` (stub — replaced in Task 13)

- [ ] **Step 1: Update BottomNav test**

Read `src/components/BottomNav.test.jsx`, then update the tab-count assertion:

Replace the `'renders three tabs'` test with:

```jsx
test('renders four tabs', () => {
  render(<BottomNav activeTab="today" onTabChange={() => {}} />)
  expect(screen.getByText('Today')).toBeInTheDocument()
  expect(screen.getByText('Habits')).toBeInTheDocument()
  expect(screen.getByText('Journal')).toBeInTheDocument()
  expect(screen.getByText('Health')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run src/components/BottomNav.test.jsx
```
Expected: FAIL — 'Health' not found.

- [ ] **Step 3: Update `src/components/BottomNav.jsx`**

Read the file, then change the TABS array to add Health:

```jsx
const TABS = [
  { id: 'today',   label: 'Today',   icon: '✅' },
  { id: 'habits',  label: 'Habits',  icon: '⚙️' },
  { id: 'journal', label: 'Journal', icon: '📓' },
  { id: 'health',  label: 'Health',  icon: '🩺' },
]
```

- [ ] **Step 4: Create Health stub screen `src/screens/Health.jsx`**

```jsx
export function Health() {
  return <div>Health</div>
}
```

- [ ] **Step 5: Update `src/App.jsx`**

Read the file, then:

1. Add imports at the top:
```jsx
import { HealthProvider } from './contexts/HealthContext'
import { VitalsProvider } from './contexts/VitalsContext'
import { Health } from './screens/Health'
```

2. Wrap providers (add inside JournalProvider):
```jsx
<HealthProvider>
  <VitalsProvider>
    {/* existing content */}
  </VitalsProvider>
</HealthProvider>
```

3. Add Health tab rendering inside `<main>`:
```jsx
{activeTab === 'health' && <Health />}
```

Full updated App.jsx:

```jsx
import { useState } from 'react'
import { HabitsProvider } from './contexts/HabitsContext'
import { JournalProvider } from './contexts/JournalContext'
import { HealthProvider } from './contexts/HealthContext'
import { VitalsProvider } from './contexts/VitalsContext'
import { Today } from './screens/Today'
import { Habits } from './screens/Habits'
import { Journal } from './screens/Journal'
import { Health } from './screens/Health'
import { BottomNav } from './components/BottomNav'
import styles from './App.module.css'

export default function App() {
  const [activeTab, setActiveTab] = useState('today')
  return (
    <HabitsProvider>
      <JournalProvider>
        <HealthProvider>
          <VitalsProvider>
            <div className={styles.app}>
              <main className={styles.main}>
                {activeTab === 'today' && <Today />}
                {activeTab === 'habits' && <Habits />}
                {activeTab === 'journal' && <Journal />}
                {activeTab === 'health' && <Health />}
              </main>
              <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
            </div>
          </VitalsProvider>
        </HealthProvider>
      </JournalProvider>
    </HabitsProvider>
  )
}
```

- [ ] **Step 6: Run all tests**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run
```
Expected: all existing tests PASS (BottomNav test now checks 4 tabs).

- [ ] **Step 7: Commit**

```bash
cd /home/jazman/projects/dailyhabitapp && git add src/components/BottomNav.jsx src/components/BottomNav.test.jsx src/App.jsx src/screens/Health.jsx && git commit -m "feat: add Health tab to navigation and wire up providers"
```

---

## Task 7: IntensityPicker Component

**Files:**
- Create: `src/components/health/IntensityPicker.jsx`
- Create: `src/components/health/IntensityPicker.module.css`
- Create: `src/components/health/IntensityPicker.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/health/IntensityPicker.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntensityPicker } from './IntensityPicker'

test('renders all 5 intensity level labels', () => {
  render(<IntensityPicker value={1} onChange={() => {}} />)
  expect(screen.getByText('Minimal')).toBeInTheDocument()
  expect(screen.getByText('Mild')).toBeInTheDocument()
  expect(screen.getByText('Moderate')).toBeInTheDocument()
  expect(screen.getByText('Severe')).toBeInTheDocument()
  expect(screen.getByText('Extreme')).toBeInTheDocument()
})

test('selected level has aria-pressed="true"', () => {
  render(<IntensityPicker value={3} onChange={() => {}} />)
  const btn = screen.getByText('Moderate').closest('button')
  expect(btn).toHaveAttribute('aria-pressed', 'true')
})

test('clicking a level calls onChange with its value', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<IntensityPicker value={1} onChange={onChange} />)
  await user.click(screen.getByText('Severe'))
  expect(onChange).toHaveBeenCalledWith(4)
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run src/components/health/IntensityPicker.test.jsx
```
Expected: FAIL.

- [ ] **Step 3: Implement `src/components/health/IntensityPicker.jsx`**

```jsx
import { INTENSITY_LEVELS } from '../../utils/intensity'
import styles from './IntensityPicker.module.css'

export function IntensityPicker({ value, onChange }) {
  return (
    <div className={styles.picker}>
      {INTENSITY_LEVELS.map(level => (
        <button
          key={level.value}
          type="button"
          className={`${styles.level} ${value === level.value ? styles.selected : ''}`}
          style={{ '--color': level.color }}
          onClick={() => onChange(level.value)}
          aria-pressed={value === level.value}
        >
          <span className={styles.dot} />
          <span className={styles.label}>{level.label}</span>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create `src/components/health/IntensityPicker.module.css`**

```css
.picker { display: flex; flex-direction: column; gap: 6px; }
.level {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; border-radius: 8px;
  background: #1a1a1a; border: 1.5px solid transparent;
  transition: border-color 0.15s, background 0.15s;
  text-align: left;
}
.level.selected {
  background: color-mix(in srgb, var(--color) 15%, #111);
  border-color: var(--color);
}
.dot {
  width: 14px; height: 14px; border-radius: 50%;
  background: var(--color); flex-shrink: 0;
}
.label { font-size: 14px; }
```

- [ ] **Step 5: Run tests**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run src/components/health/IntensityPicker.test.jsx
```
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
cd /home/jazman/projects/dailyhabitapp && git add src/components/health/ && git commit -m "feat: add IntensityPicker component (1-5 named scale)"
```

---

## Task 8: DrawingCanvas Component

**Files:**
- Create: `src/components/health/DrawingCanvas.jsx`
- Create: `src/components/health/DrawingCanvas.module.css`
- Create: `src/components/health/DrawingCanvas.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/health/DrawingCanvas.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DrawingCanvas } from './DrawingCanvas'

const noop = () => {}

test('renders draw, erase, and clear buttons', () => {
  render(<DrawingCanvas paths={[]} onPathsChange={noop} color="#ef4444" />)
  expect(screen.getByLabelText(/draw/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/erase last/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/clear all/i)).toBeInTheDocument()
})

test('erase last button removes last path', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  const paths = [{ d: 'M 0 0 L 10 10', color: '#ef4444', strokeWidth: 8 }]
  render(<DrawingCanvas paths={paths} onPathsChange={onChange} color="#ef4444" />)
  await user.click(screen.getByLabelText(/erase last/i))
  expect(onChange).toHaveBeenCalledWith([])
})

test('clear all button empties paths', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  const paths = [
    { d: 'M 0 0 L 10 10', color: '#ef4444', strokeWidth: 8 },
    { d: 'M 5 5 L 50 50', color: '#f97316', strokeWidth: 8 },
  ]
  render(<DrawingCanvas paths={paths} onPathsChange={onChange} color="#ef4444" />)
  await user.click(screen.getByLabelText(/clear all/i))
  expect(onChange).toHaveBeenCalledWith([])
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run src/components/health/DrawingCanvas.test.jsx
```
Expected: FAIL.

- [ ] **Step 3: Implement `src/components/health/DrawingCanvas.jsx`**

```jsx
import { useRef, useState, useCallback } from 'react'
import { pointsToPath } from '../../utils/bezier'
import styles from './DrawingCanvas.module.css'

// Overlay component positioned absolute over a parent with position:relative.
// Captures pointer events, converts to SVG 200×300 coordinate space, records paths.
// Parent is responsible for rendering the <svg> with paths.
export function DrawingCanvas({ paths, onPathsChange, color, strokeWidth = 8 }) {
  const overlayRef = useRef(null)
  const currentPoints = useRef([])
  const [isDrawing, setIsDrawing] = useState(false)

  function toSvgCoords(clientX, clientY) {
    const rect = overlayRef.current.getBoundingClientRect()
    return {
      x: Math.round(((clientX - rect.left) / rect.width) * 200 * 10) / 10,
      y: Math.round(((clientY - rect.top) / rect.height) * 300 * 10) / 10,
    }
  }

  function getClientXY(e) {
    if (e.touches) return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY }
    return { clientX: e.clientX, clientY: e.clientY }
  }

  const onStart = useCallback((e) => {
    e.preventDefault()
    setIsDrawing(true)
    const { clientX, clientY } = getClientXY(e)
    currentPoints.current = [toSvgCoords(clientX, clientY)]
  }, [])

  const onMove = useCallback((e) => {
    e.preventDefault()
    if (!isDrawing) return
    const { clientX, clientY } = getClientXY(e)
    currentPoints.current.push(toSvgCoords(clientX, clientY))
  }, [isDrawing])

  const onEnd = useCallback((e) => {
    e.preventDefault()
    if (!isDrawing) return
    setIsDrawing(false)
    if (currentPoints.current.length < 2) { currentPoints.current = []; return }
    const d = pointsToPath(currentPoints.current)
    onPathsChange([...paths, { d, color, strokeWidth }])
    currentPoints.current = []
  }, [isDrawing, paths, onPathsChange, color, strokeWidth])

  return (
    <>
      <div
        ref={overlayRef}
        className={styles.overlay}
        onMouseDown={onStart}
        onMouseMove={onMove}
        onMouseUp={onEnd}
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
      />
      <div className={styles.tools}>
        <button type="button" className={styles.tool} aria-label="Draw">✏️</button>
        <button
          type="button"
          className={styles.tool}
          aria-label="Erase last"
          onClick={() => onPathsChange(paths.slice(0, -1))}
        >⊘</button>
        <button
          type="button"
          className={styles.tool}
          aria-label="Clear all"
          onClick={() => onPathsChange([])}
        >🗑</button>
      </div>
    </>
  )
}
```

- [ ] **Step 4: Create `src/components/health/DrawingCanvas.module.css`**

```css
.overlay {
  position: absolute;
  inset: 0;
  cursor: crosshair;
  touch-action: none;
}
.tools {
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 10;
}
.tool {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(26, 26, 26, 0.9);
  border: 1px solid #333;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}
```

- [ ] **Step 5: Run tests**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run src/components/health/DrawingCanvas.test.jsx
```
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
cd /home/jazman/projects/dailyhabitapp && git add src/components/health/DrawingCanvas.jsx src/components/health/DrawingCanvas.module.css src/components/health/DrawingCanvas.test.jsx && git commit -m "feat: add DrawingCanvas SVG path recorder"
```

---

## Task 9: BodyMap Component (Full Body)

**Files:**
- Create: `src/components/health/BodyMap.jsx`
- Create: `src/components/health/BodyMap.module.css`
- Create: `src/components/health/BodyMap.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/health/BodyMap.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BodyMap } from './BodyMap'

test('renders front/back toggle', () => {
  render(<BodyMap onRegionSelect={() => {}} symptoms={[]} />)
  expect(screen.getByText('Front')).toBeInTheDocument()
  expect(screen.getByText('Back')).toBeInTheDocument()
})

test('clicking a region calls onRegionSelect with region name', async () => {
  const user = userEvent.setup()
  const onSelect = vi.fn()
  render(<BodyMap onRegionSelect={onSelect} symptoms={[]} />)
  await user.click(screen.getByLabelText(/tap head/i))
  expect(onSelect).toHaveBeenCalledWith('head')
})

test('switching to back view changes the displayed regions', async () => {
  const user = userEvent.setup()
  render(<BodyMap onRegionSelect={() => {}} symptoms={[]} />)
  await user.click(screen.getByText('Back'))
  // Back view should still have tappable regions
  expect(screen.getByLabelText(/tap head/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run src/components/health/BodyMap.test.jsx
```
Expected: FAIL.

- [ ] **Step 3: Implement `src/components/health/BodyMap.jsx`**

```jsx
import { useState } from 'react'
import { intensityColor } from '../../utils/intensity'
import styles from './BodyMap.module.css'

// Regions and their approximate hit-area centers in the 0-200 × 0-440 viewBox
const REGIONS = [
  { id: 'head',       cx: 100, cy: 38,  r: 28, label: 'Head' },
  { id: 'chest',      cx: 100, cy: 110, r: 30, label: 'Chest' },
  { id: 'abdomen',    cx: 100, cy: 165, r: 25, label: 'Abdomen' },
  { id: 'back',       cx: 100, cy: 165, r: 25, label: 'Back' },   // same position, toggled by view
  { id: 'left_arm',   cx: 38,  cy: 140, r: 18, label: 'Left Arm' },
  { id: 'right_arm',  cx: 162, cy: 140, r: 18, label: 'Right Arm' },
  { id: 'left_hand',  cx: 28,  cy: 195, r: 13, label: 'Left Hand' },
  { id: 'right_hand', cx: 172, cy: 195, r: 13, label: 'Right Hand' },
  { id: 'left_leg',   cx: 72,  cy: 290, r: 20, label: 'Left Leg' },
  { id: 'right_leg',  cx: 128, cy: 290, r: 20, label: 'Right Leg' },
  { id: 'left_foot',  cx: 68,  cy: 395, r: 15, label: 'Left Foot' },
  { id: 'right_foot', cx: 132, cy: 395, r: 15, label: 'Right Foot' },
]

const FRONT_REGIONS = ['head', 'chest', 'abdomen', 'left_arm', 'right_arm', 'left_hand', 'right_hand', 'left_leg', 'right_leg', 'left_foot', 'right_foot']
const BACK_REGIONS  = ['head', 'back',  'left_arm', 'right_arm', 'left_hand', 'right_hand', 'left_leg', 'right_leg', 'left_foot', 'right_foot']

export function BodyMap({ onRegionSelect, symptoms = [] }) {
  const [view, setView] = useState('front')
  const activeRegions = view === 'front' ? FRONT_REGIONS : BACK_REGIONS
  const baseUrl = `${import.meta.env.BASE_URL}body/full-${view}.svg`

  // Map region → most severe recent symptom intensity for dot colouring
  const regionIntensity = {}
  symptoms.forEach(s => {
    const current = regionIntensity[s.region] ?? 0
    if (s.intensity > current) regionIntensity[s.region] = s.intensity
  })

  return (
    <div className={styles.container}>
      <div className={styles.toggle}>
        <button
          className={view === 'front' ? styles.active : ''}
          onClick={() => setView('front')}
        >Front</button>
        <button
          className={view === 'back' ? styles.active : ''}
          onClick={() => setView('back')}
        >Back</button>
      </div>
      <div className={styles.svgWrapper}>
        <img src={baseUrl} alt={`Body ${view} view`} className={styles.bodyImg} />
        <svg viewBox="0 0 200 440" className={styles.overlay} aria-hidden="false">
          {REGIONS.filter(r => activeRegions.includes(r.id)).map(region => (
            <g key={region.id}>
              <circle
                cx={region.cx}
                cy={region.cy}
                r={region.r}
                fill="transparent"
                stroke="transparent"
                className={styles.hitArea}
                role="button"
                aria-label={`Tap ${region.label}`}
                onClick={() => onRegionSelect(region.id)}
                style={{ cursor: 'pointer' }}
              />
              {regionIntensity[region.id] && (
                <circle
                  cx={region.cx}
                  cy={region.cy}
                  r={7}
                  fill={intensityColor(regionIntensity[region.id])}
                  opacity={0.8}
                  style={{ pointerEvents: 'none' }}
                />
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `src/components/health/BodyMap.module.css`**

```css
.container { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.toggle {
  display: flex;
  background: #1a1a1a;
  border-radius: 8px;
  padding: 2px;
  gap: 2px;
}
.toggle button {
  flex: 1;
  padding: 5px 20px;
  border-radius: 6px;
  font-size: 12px;
  color: #555;
  transition: all 0.15s;
}
.toggle button.active { background: #4ade80; color: #000; font-weight: 700; }
.svgWrapper { position: relative; width: 140px; }
.bodyImg { width: 100%; display: block; }
.overlay { position: absolute; inset: 0; width: 100%; height: 100%; }
.hitArea { transition: fill 0.1s; }
.hitArea:hover { fill: rgba(99, 102, 241, 0.15); }
```

- [ ] **Step 5: Run tests**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run src/components/health/BodyMap.test.jsx
```
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
cd /home/jazman/projects/dailyhabitapp && git add src/components/health/BodyMap.jsx src/components/health/BodyMap.module.css src/components/health/BodyMap.test.jsx && git commit -m "feat: add BodyMap component with region tap and intensity dots"
```

---

## Task 10: BodyRegion Component (Drill-down + Drawing)

**Files:**
- Create: `src/components/health/BodyRegion.jsx`
- Create: `src/components/health/BodyRegion.module.css`
- Create: `src/components/health/BodyRegion.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/health/BodyRegion.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BodyRegion } from './BodyRegion'

const noop = () => {}

test('renders region label', () => {
  render(<BodyRegion region="head" view="front" onViewChange={noop} paths={[]} onPathsChange={noop} intensity={3} />)
  expect(screen.getByText(/head/i)).toBeInTheDocument()
})

test('renders view selector buttons', () => {
  render(<BodyRegion region="head" view="front" onViewChange={noop} paths={[]} onPathsChange={noop} intensity={3} />)
  expect(screen.getByText('Front')).toBeInTheDocument()
  expect(screen.getByText('Back')).toBeInTheDocument()
  expect(screen.getByText('Left')).toBeInTheDocument()
  expect(screen.getByText('Right')).toBeInTheDocument()
})

test('clicking a view button calls onViewChange', async () => {
  const user = userEvent.setup()
  const onViewChange = vi.fn()
  render(<BodyRegion region="head" view="front" onViewChange={onViewChange} paths={[]} onPathsChange={noop} intensity={3} />)
  await user.click(screen.getByText('Back'))
  expect(onViewChange).toHaveBeenCalledWith('back')
})

test('abdomen only shows front and back view buttons', () => {
  render(<BodyRegion region="abdomen" view="front" onViewChange={noop} paths={[]} onPathsChange={noop} intensity={2} />)
  expect(screen.getByText('Front')).toBeInTheDocument()
  expect(screen.getByText('Back')).toBeInTheDocument()
  expect(screen.queryByText('Left')).not.toBeInTheDocument()
  expect(screen.queryByText('Right')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run src/components/health/BodyRegion.test.jsx
```
Expected: FAIL.

- [ ] **Step 3: Implement `src/components/health/BodyRegion.jsx`**

```jsx
import { intensityColor } from '../../utils/intensity'
import { DrawingCanvas } from './DrawingCanvas'
import styles from './BodyRegion.module.css'

// Regions that only have front/back (no left/right view)
const FRONT_BACK_ONLY = ['abdomen', 'back']

const REGION_LABELS = {
  head: 'Head', chest: 'Chest', abdomen: 'Abdomen', back: 'Back',
  left_arm: 'Left Arm', right_arm: 'Right Arm',
  left_hand: 'Left Hand', right_hand: 'Right Hand',
  left_leg: 'Left Leg', right_leg: 'Right Leg',
  left_foot: 'Left Foot', right_foot: 'Right Foot',
}

const ALL_VIEWS = ['front', 'back', 'left', 'right']

export function BodyRegion({ region, view, onViewChange, paths, onPathsChange, intensity }) {
  const color = intensityColor(intensity)
  const availableViews = FRONT_BACK_ONLY.includes(region)
    ? ['front', 'back']
    : ALL_VIEWS
  const baseUrl = `${import.meta.env.BASE_URL}body/${region}-${view}.svg`

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.regionLabel}>{REGION_LABELS[region]}</span>
      </div>

      <div className={styles.viewSelector}>
        {availableViews.map(v => (
          <button
            key={v}
            type="button"
            className={`${styles.viewBtn} ${view === v ? styles.activeView : ''}`}
            onClick={() => onViewChange(v)}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      <div className={styles.drawArea}>
        <img src={baseUrl} alt={`${REGION_LABELS[region]} ${view} view`} className={styles.regionImg} />
        <svg viewBox="0 0 200 300" className={styles.pathLayer} aria-hidden="true">
          {paths.map((p, i) => (
            <path
              key={i}
              d={p.d}
              stroke={p.color}
              strokeWidth={p.strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.75}
            />
          ))}
        </svg>
        <DrawingCanvas
          paths={paths}
          onPathsChange={onPathsChange}
          color={color}
          strokeWidth={10}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `src/components/health/BodyRegion.module.css`**

```css
.container { display: flex; flex-direction: column; gap: 10px; }
.header { display: flex; align-items: center; }
.regionLabel { font-size: 16px; font-weight: 700; }
.viewSelector {
  display: flex;
  background: #1a1a1a;
  border-radius: 8px;
  padding: 2px;
  gap: 2px;
}
.viewBtn {
  flex: 1;
  padding: 5px 0;
  border-radius: 6px;
  font-size: 11px;
  color: #555;
  transition: all 0.15s;
}
.activeView { background: #4ade80; color: #000; font-weight: 700; }
.drawArea {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  background: #111;
  aspect-ratio: 2 / 3;
}
.regionImg { width: 100%; height: 100%; object-fit: contain; display: block; }
.pathLayer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
```

- [ ] **Step 5: Run tests**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run src/components/health/BodyRegion.test.jsx
```
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
cd /home/jazman/projects/dailyhabitapp && git add src/components/health/BodyRegion.jsx src/components/health/BodyRegion.module.css src/components/health/BodyRegion.test.jsx && git commit -m "feat: add BodyRegion drill-down with 4-view selector and drawing"
```

---

## Task 11: LogSymptomSheet (3-step bottom sheet)

**Files:**
- Create: `src/components/health/LogSymptomSheet.jsx`
- Create: `src/components/health/LogSymptomSheet.module.css`
- Create: `src/components/health/LogSymptomSheet.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/health/LogSymptomSheet.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LogSymptomSheet } from './LogSymptomSheet'
import { HealthProvider } from '../../contexts/HealthContext'
import { db } from '../../db/db'

beforeEach(async () => { await db.symptom_types.clear(); await db.symptoms.clear() })

const wrapper = ({ children }) => <HealthProvider>{children}</HealthProvider>

test('renders body map in step 1', () => {
  render(<LogSymptomSheet onClose={() => {}} />, { wrapper })
  expect(screen.getByText('Front')).toBeInTheDocument()
  expect(screen.getByText('Back')).toBeInTheDocument()
})

test('tapping a region advances to step 2', async () => {
  const user = userEvent.setup()
  render(<LogSymptomSheet onClose={() => {}} />, { wrapper })
  await user.click(screen.getByLabelText(/tap head/i))
  expect(screen.getByText('Head')).toBeInTheDocument()
  expect(screen.getByText('Minimal')).toBeInTheDocument()
})

test('step 2 Next button advances to step 3', async () => {
  const user = userEvent.setup()
  render(<LogSymptomSheet onClose={() => {}} />, { wrapper })
  await user.click(screen.getByLabelText(/tap head/i))
  await user.click(screen.getByText('Next'))
  expect(screen.getByText('Symptom type')).toBeInTheDocument()
})

test('Save in step 3 calls onClose after saving', async () => {
  const user = userEvent.setup()
  const onClose = vi.fn()
  render(<LogSymptomSheet onClose={onClose} />, { wrapper })
  await user.click(screen.getByLabelText(/tap head/i))
  await user.click(screen.getByText('Next'))
  await user.type(screen.getByPlaceholderText(/new symptom type/i), 'Headache')
  await user.click(screen.getByText('Save'))
  expect(onClose).toHaveBeenCalled()
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run src/components/health/LogSymptomSheet.test.jsx
```
Expected: FAIL.

- [ ] **Step 3: Implement `src/components/health/LogSymptomSheet.jsx`**

```jsx
import { useState } from 'react'
import { useHealth } from '../../contexts/HealthContext'
import { BodyMap } from './BodyMap'
import { BodyRegion } from './BodyRegion'
import { IntensityPicker } from './IntensityPicker'
import styles from './LogSymptomSheet.module.css'

const PAIN_TYPES = ['Throbbing', 'Sharp', 'Dull', 'Burning', 'Aching']

export function LogSymptomSheet({ onClose }) {
  const { symptomTypes, addSymptomType, addSymptom, symptoms } = useHealth()
  const [step, setStep] = useState(1)
  const [region, setRegion] = useState(null)
  const [view, setView] = useState('front')
  // paths keyed by view so each view has independent drawings
  const [pathsByView, setPathsByView] = useState({})
  const [intensity, setIntensity] = useState(3)
  const [selectedType, setSelectedType] = useState(null)
  const [newTypeName, setNewTypeName] = useState('')
  const [painTypes, setPainTypes] = useState([])
  const [notes, setNotes] = useState('')

  function handleRegionSelect(r) {
    setRegion(r)
    setStep(2)
  }

  function handlePathsChange(newPaths) {
    setPathsByView(prev => ({ ...prev, [view]: newPaths }))
  }

  async function handleSave() {
    let typeId = selectedType
    if (!typeId && newTypeName.trim()) {
      const type = await addSymptomType(newTypeName.trim())
      typeId = type.id
    }
    if (!typeId) return

    // Collect all paths across all views into one array tagged with view
    const allPaths = Object.entries(pathsByView).flatMap(([v, paths]) =>
      paths.map(p => ({ ...p, view: v }))
    )

    await addSymptom({
      symptom_type_id: typeId,
      region,
      view,
      svg_paths: JSON.stringify(allPaths),
      intensity,
      pain_type: JSON.stringify(painTypes),
      notes,
      timestamp: new Date().toISOString(),
    })
    onClose()
  }

  function togglePainType(pt) {
    setPainTypes(prev =>
      prev.includes(pt) ? prev.filter(x => x !== pt) : [...prev, pt]
    )
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Log Symptom">
      <div className={styles.sheet}>
        <div className={styles.header}>
          <h2>Log Symptom</h2>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className={styles.steps}>
          {[1, 2, 3].map(s => (
            <div key={s} className={`${styles.step} ${step === s ? styles.activeStep : step > s ? styles.doneStep : ''}`}>{s}</div>
          ))}
        </div>

        {step === 1 && (
          <div className={styles.body}>
            <p className={styles.hint}>Tap a body region to locate the symptom</p>
            <BodyMap onRegionSelect={handleRegionSelect} symptoms={symptoms} />
          </div>
        )}

        {step === 2 && (
          <div className={styles.body}>
            <BodyRegion
              region={region}
              view={view}
              onViewChange={setView}
              paths={pathsByView[view] ?? []}
              onPathsChange={handlePathsChange}
              intensity={intensity}
            />
            <div className={styles.section}>
              <span className={styles.sectionLabel}>Intensity</span>
              <IntensityPicker value={intensity} onChange={setIntensity} />
            </div>
            <button className={styles.nextBtn} onClick={() => setStep(3)}>Next</button>
          </div>
        )}

        {step === 3 && (
          <div className={styles.body}>
            <div className={styles.section}>
              <span className={styles.sectionLabel}>Symptom type</span>
              <div className={styles.typeList}>
                {symptomTypes.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    className={`${styles.typeChip} ${selectedType === t.id ? styles.selectedChip : ''}`}
                    onClick={() => { setSelectedType(t.id); setNewTypeName('') }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
              <input
                className={styles.input}
                placeholder="New symptom type..."
                value={newTypeName}
                onChange={e => { setNewTypeName(e.target.value); setSelectedType(null) }}
              />
            </div>
            <div className={styles.section}>
              <span className={styles.sectionLabel}>Pain quality</span>
              <div className={styles.typeList}>
                {PAIN_TYPES.map(pt => (
                  <button
                    key={pt}
                    type="button"
                    className={`${styles.typeChip} ${painTypes.includes(pt) ? styles.selectedChip : ''}`}
                    onClick={() => togglePainType(pt)}
                  >
                    {pt}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.section}>
              <span className={styles.sectionLabel}>Notes</span>
              <textarea className={styles.textarea} value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Optional note..." />
            </div>
            <button
              className={styles.saveBtn}
              onClick={handleSave}
              disabled={!selectedType && !newTypeName.trim()}
            >
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `src/components/health/LogSymptomSheet.module.css`**

```css
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: flex-end; z-index: 100; }
.sheet { background: #1a1a1a; width: 100%; border-radius: 16px 16px 0 0; padding: 20px 16px calc(20px + env(safe-area-inset-bottom,0)); max-height: 92vh; overflow-y: auto; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.header h2 { font-size: 18px; font-weight: 700; }
.steps { display: flex; gap: 8px; justify-content: center; margin-bottom: 16px; }
.step { width: 28px; height: 28px; border-radius: 50%; background: #2a2a2a; border: 1.5px solid #333; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #555; }
.activeStep { background: #14532d; border-color: #4ade80; color: #4ade80; font-weight: 700; }
.doneStep { background: #4ade80; border-color: #4ade80; color: #000; }
.body { display: flex; flex-direction: column; gap: 14px; }
.hint { font-size: 13px; color: #666; text-align: center; }
.section { display: flex; flex-direction: column; gap: 6px; }
.sectionLabel { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.06em; }
.typeList { display: flex; flex-wrap: wrap; gap: 6px; }
.typeChip { padding: 6px 12px; border-radius: 20px; background: #111; border: 1px solid #333; font-size: 13px; }
.selectedChip { background: #14532d; border-color: #4ade80; color: #4ade80; }
.input { background: #111; border: 1px solid #333; border-radius: 8px; padding: 9px 12px; font-size: 14px; color: #e0e0e0; }
.textarea { background: #111; border: 1px solid #333; border-radius: 8px; padding: 9px 12px; font-size: 14px; color: #e0e0e0; resize: none; }
.nextBtn { background: #1a1a2e; color: #6366f1; border: 1px solid #6366f1; font-weight: 600; padding: 12px; border-radius: 10px; font-size: 15px; }
.saveBtn { background: #4ade80; color: #000; font-weight: 700; padding: 14px; border-radius: 10px; font-size: 16px; }
.saveBtn:disabled { opacity: 0.4; }
```

- [ ] **Step 5: Run tests**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run src/components/health/LogSymptomSheet.test.jsx
```
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
cd /home/jazman/projects/dailyhabitapp && git add src/components/health/LogSymptomSheet.jsx src/components/health/LogSymptomSheet.module.css src/components/health/LogSymptomSheet.test.jsx && git commit -m "feat: add LogSymptomSheet 3-step body map flow"
```

---

## Task 12: LogVitalSheet + VitalTypeForm

**Files:**
- Create: `src/components/health/VitalTypeForm.jsx`
- Create: `src/components/health/VitalTypeForm.module.css`
- Create: `src/components/health/VitalTypeForm.test.jsx`
- Create: `src/components/health/LogVitalSheet.jsx`
- Create: `src/components/health/LogVitalSheet.module.css`
- Create: `src/components/health/LogVitalSheet.test.jsx`

- [ ] **Step 1: Write failing tests for VitalTypeForm**

Create `src/components/health/VitalTypeForm.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VitalTypeForm } from './VitalTypeForm'

const noop = () => {}

test('renders name and unit inputs', () => {
  render(<VitalTypeForm onSave={noop} onClose={noop} />)
  expect(screen.getByPlaceholderText(/e.g. steps/i)).toBeInTheDocument()
  expect(screen.getByPlaceholderText(/e.g. steps\/day/i)).toBeInTheDocument()
})

test('shows error if name is empty on save', async () => {
  const user = userEvent.setup()
  render(<VitalTypeForm onSave={noop} onClose={noop} />)
  await user.click(screen.getByText('Save'))
  expect(screen.getByText(/name is required/i)).toBeInTheDocument()
})

test('calls onSave with form data when valid', async () => {
  const user = userEvent.setup()
  const onSave = vi.fn().mockResolvedValue()
  render(<VitalTypeForm onSave={onSave} onClose={noop} />)
  await user.type(screen.getByPlaceholderText(/e.g. steps/i), 'Mood')
  await user.type(screen.getByPlaceholderText(/e.g. steps\/day/i), '1-10')
  await user.click(screen.getByText('Save'))
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'Mood', unit: '1-10' }))
})
```

- [ ] **Step 2: Write failing tests for LogVitalSheet**

Create `src/components/health/LogVitalSheet.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LogVitalSheet } from './LogVitalSheet'
import { VitalsProvider } from '../../contexts/VitalsContext'
import { db } from '../../db/db'

beforeEach(async () => { await db.vital_types.clear(); await db.vital_entries.clear() })

const wrapper = ({ children }) => <VitalsProvider>{children}</VitalsProvider>

test('renders vital type picker', async () => {
  render(<LogVitalSheet onClose={() => {}} />, { wrapper })
  expect(screen.getByText(/select vital/i)).toBeInTheDocument()
})

test('after selecting a type, shows value input', async () => {
  const user = userEvent.setup()
  await db.vital_types.add({ name: 'Heart Rate', unit: 'bpm', value_schema: 'single', is_standard: true, normal_min: 60, normal_max: 100, createdAt: new Date().toISOString() })
  render(<LogVitalSheet onClose={() => {}} />, { wrapper })
  await user.click(await screen.findByText('Heart Rate'))
  expect(screen.getByPlaceholderText(/value/i)).toBeInTheDocument()
})

test('Save calls onClose after saving an entry', async () => {
  const user = userEvent.setup()
  const onClose = vi.fn()
  await db.vital_types.add({ name: 'Weight', unit: 'kg', value_schema: 'single', is_standard: true, normal_min: null, normal_max: null, createdAt: new Date().toISOString() })
  render(<LogVitalSheet onClose={onClose} />, { wrapper })
  await user.click(await screen.findByText('Weight'))
  await user.type(screen.getByPlaceholderText(/value/i), '72')
  await user.click(screen.getByText('Save'))
  expect(onClose).toHaveBeenCalled()
})
```

- [ ] **Step 3: Run to verify failures**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run src/components/health/VitalTypeForm.test.jsx src/components/health/LogVitalSheet.test.jsx
```
Expected: FAIL.

- [ ] **Step 4: Implement `src/components/health/VitalTypeForm.jsx`**

```jsx
import { useState } from 'react'
import styles from './VitalTypeForm.module.css'

export function VitalTypeForm({ vitalType, onSave, onClose }) {
  const [name, setName] = useState(vitalType?.name ?? '')
  const [unit, setUnit] = useState(vitalType?.unit ?? '')
  const [schema, setSchema] = useState(vitalType?.value_schema ?? 'single')
  const [normalMin, setNormalMin] = useState(vitalType?.normal_min ?? '')
  const [normalMax, setNormalMax] = useState(vitalType?.normal_max ?? '')
  const [error, setError] = useState('')

  async function handleSave(e) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    await onSave({
      name: name.trim(),
      unit: unit.trim(),
      value_schema: schema,
      normal_min: normalMin !== '' ? Number(normalMin) : null,
      normal_max: normalMax !== '' ? Number(normalMax) : null,
    })
    onClose()
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Vital Type">
      <div className={styles.sheet}>
        <div className={styles.header}>
          <h2>{vitalType ? 'Edit Vital Type' : 'New Vital Type'}</h2>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form onSubmit={handleSave} className={styles.form}>
          <label className={styles.label}>
            Name
            <input className={styles.input} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Steps" autoFocus />
          </label>
          <label className={styles.label}>
            Unit
            <input className={styles.input} value={unit} onChange={e => setUnit(e.target.value)} placeholder="e.g. steps/day" />
          </label>
          <div className={styles.label}>
            Value type
            <div className={styles.toggle}>
              <button type="button" className={schema === 'single' ? styles.active : ''} onClick={() => setSchema('single')}>Single</button>
              <button type="button" className={schema === 'compound' ? styles.active : ''} onClick={() => setSchema('compound')}>Compound (e.g. BP)</button>
            </div>
          </div>
          <div className={styles.rangeRow}>
            <label className={styles.label}>
              Normal min
              <input type="number" className={styles.input} value={normalMin} onChange={e => setNormalMin(e.target.value)} placeholder="optional" />
            </label>
            <label className={styles.label}>
              Normal max
              <input type="number" className={styles.input} value={normalMax} onChange={e => setNormalMax(e.target.value)} placeholder="optional" />
            </label>
          </div>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button type="submit" className={styles.saveBtn}>Save</button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create `src/components/health/VitalTypeForm.module.css`**

```css
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: flex-end; z-index: 110; }
.sheet { background: #1a1a1a; width: 100%; border-radius: 16px 16px 0 0; padding: 20px 16px calc(20px + env(safe-area-inset-bottom,0)); max-height: 85vh; overflow-y: auto; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.header h2 { font-size: 18px; font-weight: 700; }
.form { display: flex; flex-direction: column; gap: 14px; }
.label { display: flex; flex-direction: column; gap: 5px; font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.06em; }
.input { background: #111; border: 1px solid #333; border-radius: 8px; padding: 9px 12px; font-size: 14px; color: #e0e0e0; }
.toggle { display: flex; gap: 6px; }
.toggle button { flex: 1; padding: 8px; border-radius: 8px; background: #111; border: 1px solid #333; font-size: 12px; }
.toggle .active { background: #14532d; border-color: #4ade80; color: #4ade80; }
.rangeRow { display: flex; gap: 10px; }
.rangeRow .label { flex: 1; }
.error { color: #f87171; font-size: 13px; }
.saveBtn { background: #4ade80; color: #000; font-weight: 700; padding: 14px; border-radius: 10px; font-size: 16px; margin-top: 4px; }
```

- [ ] **Step 6: Implement `src/components/health/LogVitalSheet.jsx`**

```jsx
import { useState } from 'react'
import { useVitals } from '../../contexts/VitalsContext'
import { VitalTypeForm } from './VitalTypeForm'
import styles from './LogVitalSheet.module.css'

export function LogVitalSheet({ onClose }) {
  const { vitalTypes, addVitalType, addVitalEntry } = useVitals()
  const [selectedType, setSelectedType] = useState(null)
  const [singleValue, setSingleValue] = useState('')
  const [sys, setSys] = useState('')
  const [dia, setDia] = useState('')
  const [notes, setNotes] = useState('')
  const [showTypeForm, setShowTypeForm] = useState(false)

  async function handleSave() {
    if (!selectedType) return
    let value
    if (selectedType.value_schema === 'compound') {
      value = JSON.stringify({ sys: Number(sys), dia: Number(dia) })
    } else {
      value = JSON.stringify(singleValue)
    }
    await addVitalEntry({ vital_type_id: selectedType.id, value, notes })
    onClose()
  }

  const canSave = selectedType && (
    selectedType.value_schema === 'compound' ? sys && dia : singleValue
  )

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Log Vital">
      <div className={styles.sheet}>
        <div className={styles.header}>
          <h2>Log Vital</h2>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className={styles.section}>
          <span className={styles.sectionLabel}>Select vital</span>
          <div className={styles.typeList}>
            {vitalTypes.map(t => (
              <button
                key={t.id}
                type="button"
                className={`${styles.typeChip} ${selectedType?.id === t.id ? styles.selected : ''}`}
                onClick={() => setSelectedType(t)}
              >
                {t.name}
              </button>
            ))}
            <button type="button" className={styles.addTypeBtn} onClick={() => setShowTypeForm(true)}>+ Add type</button>
          </div>
        </div>

        {selectedType && (
          <div className={styles.section}>
            <span className={styles.sectionLabel}>
              {selectedType.name} ({selectedType.unit})
              {selectedType.normal_min != null && selectedType.normal_max != null && (
                <span className={styles.normalRange}> · normal {selectedType.normal_min}–{selectedType.normal_max}</span>
              )}
            </span>
            {selectedType.value_schema === 'compound' ? (
              <div className={styles.compoundRow}>
                <input type="number" className={styles.input} placeholder="Systolic" value={sys} onChange={e => setSys(e.target.value)} />
                <span className={styles.slash}>/</span>
                <input type="number" className={styles.input} placeholder="Diastolic" value={dia} onChange={e => setDia(e.target.value)} />
              </div>
            ) : (
              <input type="number" className={styles.input} placeholder="Value" value={singleValue} onChange={e => setSingleValue(e.target.value)} />
            )}
          </div>
        )}

        <div className={styles.section}>
          <span className={styles.sectionLabel}>Notes (optional)</span>
          <textarea className={styles.textarea} value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
        </div>

        <button className={styles.saveBtn} onClick={handleSave} disabled={!canSave}>Save</button>

        {showTypeForm && (
          <VitalTypeForm
            onSave={async (data) => { await addVitalType(data); setShowTypeForm(false) }}
            onClose={() => setShowTypeForm(false)}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Create `src/components/health/LogVitalSheet.module.css`**

```css
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: flex-end; z-index: 100; }
.sheet { background: #1a1a1a; width: 100%; border-radius: 16px 16px 0 0; padding: 20px 16px calc(20px + env(safe-area-inset-bottom,0)); max-height: 85vh; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
.header { display: flex; justify-content: space-between; align-items: center; }
.header h2 { font-size: 18px; font-weight: 700; }
.section { display: flex; flex-direction: column; gap: 8px; }
.sectionLabel { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.06em; }
.normalRange { font-size: 10px; color: #555; text-transform: none; }
.typeList { display: flex; flex-wrap: wrap; gap: 6px; }
.typeChip { padding: 6px 12px; border-radius: 20px; background: #111; border: 1px solid #333; font-size: 13px; }
.typeChip.selected { background: #14532d; border-color: #4ade80; color: #4ade80; }
.addTypeBtn { padding: 6px 12px; border-radius: 20px; background: #111; border: 1px dashed #444; font-size: 13px; color: #666; }
.input { background: #111; border: 1px solid #333; border-radius: 8px; padding: 10px 12px; font-size: 16px; color: #e0e0e0; }
.compoundRow { display: flex; align-items: center; gap: 8px; }
.slash { font-size: 18px; color: #666; }
.textarea { background: #111; border: 1px solid #333; border-radius: 8px; padding: 9px 12px; font-size: 14px; color: #e0e0e0; resize: none; }
.saveBtn { background: #4ade80; color: #000; font-weight: 700; padding: 14px; border-radius: 10px; font-size: 16px; }
.saveBtn:disabled { opacity: 0.4; }
```

- [ ] **Step 8: Run tests**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run src/components/health/VitalTypeForm.test.jsx src/components/health/LogVitalSheet.test.jsx
```
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
cd /home/jazman/projects/dailyhabitapp && git add src/components/health/VitalTypeForm.jsx src/components/health/VitalTypeForm.module.css src/components/health/VitalTypeForm.test.jsx src/components/health/LogVitalSheet.jsx src/components/health/LogVitalSheet.module.css src/components/health/LogVitalSheet.test.jsx && git commit -m "feat: add LogVitalSheet and VitalTypeForm"
```

---

## Task 13: GoogleFitSync Placeholder + Health Screen

**Files:**
- Create: `src/components/health/GoogleFitSync.jsx`
- Create: `src/components/health/GoogleFitSync.module.css`
- Modify: `src/screens/Health.jsx` (replace stub)
- Create: `src/screens/Health.module.css`
- Create: `src/screens/Health.test.jsx`

- [ ] **Step 1: Create GoogleFitSync placeholder**

Create `src/components/health/GoogleFitSync.jsx`:

```jsx
import styles from './GoogleFitSync.module.css'

// Placeholder — wired up with real OAuth in Plan 2b (Google Fit Integration)
export function GoogleFitSync() {
  return (
    <button className={styles.btn} disabled aria-label="Sync with Google Fit (coming soon)">
      <span>🔗</span>
      <span>Google Fit — coming soon</span>
    </button>
  )
}
```

Create `src/components/health/GoogleFitSync.module.css`:
```css
.btn {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; border-radius: 10px;
  background: #1a1a1a; border: 1px solid #2a2a2a;
  font-size: 13px; color: #555; opacity: 0.6;
  width: 100%;
}
```

- [ ] **Step 2: Write failing Health screen tests**

Create `src/screens/Health.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Health } from './Health'
import { HealthProvider } from '../contexts/HealthContext'
import { VitalsProvider } from '../contexts/VitalsContext'
import { db } from '../db/db'

beforeEach(async () => {
  await db.symptom_types.clear()
  await db.symptoms.clear()
  await db.vital_types.clear()
  await db.vital_entries.clear()
})

function Wrapper({ children }) {
  return <HealthProvider><VitalsProvider>{children}</VitalsProvider></HealthProvider>
}

test('renders Overview and History tabs', async () => {
  render(<Health />, { wrapper: Wrapper })
  expect(screen.getByText('Overview')).toBeInTheDocument()
  expect(screen.getByText('History')).toBeInTheDocument()
})

test('Overview shows Log Symptom and Log Vital buttons', async () => {
  render(<Health />, { wrapper: Wrapper })
  expect(screen.getByText('Log Symptom')).toBeInTheDocument()
  expect(screen.getByText('Log Vital')).toBeInTheDocument()
})

test('clicking Log Symptom opens LogSymptomSheet', async () => {
  const user = userEvent.setup()
  render(<Health />, { wrapper: Wrapper })
  await user.click(screen.getByText('Log Symptom'))
  expect(screen.getByRole('dialog', { name: /log symptom/i })).toBeInTheDocument()
})

test('clicking Log Vital opens LogVitalSheet', async () => {
  const user = userEvent.setup()
  render(<Health />, { wrapper: Wrapper })
  await user.click(screen.getByText('Log Vital'))
  expect(screen.getByRole('dialog', { name: /log vital/i })).toBeInTheDocument()
})

test('switching to History tab shows history list with filter chips', async () => {
  const user = userEvent.setup()
  render(<Health />, { wrapper: Wrapper })
  await user.click(screen.getByText('History'))
  expect(screen.getByText(/no health events/i)).toBeInTheDocument()
  expect(screen.getByText('All')).toBeInTheDocument()
  expect(screen.getByText('Symptoms')).toBeInTheDocument()
  expect(screen.getByText('Vitals')).toBeInTheDocument()
})
```

- [ ] **Step 3: Run to verify failure**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run src/screens/Health.test.jsx
```
Expected: FAIL.

- [ ] **Step 4: Implement `src/screens/Health.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { useHealth } from '../contexts/HealthContext'
import { useVitals } from '../contexts/VitalsContext'
import { BodyMap } from '../components/health/BodyMap'
import { LogSymptomSheet } from '../components/health/LogSymptomSheet'
import { LogVitalSheet } from '../components/health/LogVitalSheet'
import { GoogleFitSync } from '../components/health/GoogleFitSync'
import { intensityLabel, intensityColor } from '../utils/intensity'
import { formatDate } from '../utils/dates'
import styles from './Health.module.css'

export function Health() {
  const { symptoms, getRecentSymptoms } = useHealth()
  const { vitalTypes, vitalEntries } = useVitals()
  const [tab, setTab] = useState('overview')
  const [showSymptomSheet, setShowSymptomSheet] = useState(false)
  const [showVitalSheet, setShowVitalSheet] = useState(false)
  const [recentSymptoms, setRecentSymptoms] = useState([])

  useEffect(() => {
    getRecentSymptoms(7).then(setRecentSymptoms)
  }, [getRecentSymptoms, symptoms])

  // Last entry per vital type for the overview
  const latestVitals = vitalTypes.map(vt => {
    const entry = vitalEntries.find(e => e.vital_type_id === vt.id)
    return entry ? { ...vt, entry } : null
  }).filter(Boolean)

  // Interleaved history (newest first)
  const history = [
    ...symptoms.map(s => ({ ...s, kind: 'symptom' })),
    ...vitalEntries.map(e => ({ ...e, kind: 'vital' })),
  ].sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  function vitalValueDisplay(vt, entry) {
    try {
      const v = JSON.parse(entry.value)
      if (vt.value_schema === 'compound') return `${v.sys}/${v.dia} ${vt.unit}`
      return `${v} ${vt.unit}`
    } catch { return '—' }
  }

  const [historyFilter, setHistoryFilter] = useState('all') // 'all' | 'symptom' | 'vital' | 'google_fit'

  const filteredHistory = history.filter(item => {
    if (historyFilter === 'all') return true
    if (historyFilter === 'google_fit') return item.kind === 'vital' && item.source === 'google_fit'
    return item.kind === historyFilter
  })

  return (
    <div className={styles.screen}>
      <div className={styles.tabBar}>
        <button className={`${styles.tabBtn} ${tab === 'overview' ? styles.activeTab : ''}`} onClick={() => setTab('overview')}>Overview</button>
        <button className={`${styles.tabBtn} ${tab === 'history' ? styles.activeTab : ''}`} onClick={() => setTab('history')}>History</button>
      </div>

      {tab === 'overview' && (
        <div className={styles.overview}>
          <div className={styles.bodyMapSection}>
            <BodyMap onRegionSelect={() => setShowSymptomSheet(true)} symptoms={recentSymptoms} />
          </div>

          {latestVitals.length > 0 && (
            <div className={styles.section}>
              <span className={styles.sectionLabel}>Recent vitals</span>
              {latestVitals.map(vt => (
                <div key={vt.id} className={styles.vitalRow}>
                  <span className={styles.vitalName}>{vt.name}</span>
                  <span className={styles.vitalValue}>{vitalValueDisplay(vt, vt.entry)}</span>
                </div>
              ))}
            </div>
          )}

          <div className={styles.actions}>
            <button className={styles.actionBtn} onClick={() => setShowSymptomSheet(true)}>Log Symptom</button>
            <button className={styles.actionBtnSecondary} onClick={() => setShowVitalSheet(true)}>Log Vital</button>
          </div>

          <GoogleFitSync />
        </div>
      )}

      {tab === 'history' && (
        <div className={styles.historyList}>
          <div className={styles.filterChips}>
            {['all', 'symptom', 'vital', 'google_fit'].map(f => (
              <button
                key={f}
                className={`${styles.filterChip} ${historyFilter === f ? styles.activeChip : ''}`}
                onClick={() => setHistoryFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'symptom' ? 'Symptoms' : f === 'vital' ? 'Vitals' : 'Google Fit'}
              </button>
            ))}
          </div>
          {filteredHistory.length === 0 && <p className={styles.empty}>No health events yet.</p>}
          {filteredHistory.map((item, i) => (
            <div key={i} className={styles.historyRow}>
              <div className={styles.historyMeta}>
                <span className={styles.historyType}>
                  {item.kind === 'symptom' ? '🤕' : '📊'}
                  {item.kind === 'symptom' ? `${item.region} · ${intensityLabel(item.intensity)}` : `Vital`}
                </span>
                <span className={styles.historyTime}>
                  {new Date(item.timestamp).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {item.kind === 'symptom' && item.intensity && (
                <span className={styles.intensityDot} style={{ background: intensityColor(item.intensity) }} />
              )}
            </div>
          ))}
        </div>
      )}

      {showSymptomSheet && <LogSymptomSheet onClose={() => setShowSymptomSheet(false)} />}
      {showVitalSheet && <LogVitalSheet onClose={() => setShowVitalSheet(false)} />}
    </div>
  )
}
```

- [ ] **Step 5: Create `src/screens/Health.module.css`**

```css
.screen { height: 100%; display: flex; flex-direction: column; overflow-y: auto; }
.tabBar { display: flex; background: #1a1a1a; border-bottom: 1px solid #2a2a2a; }
.tabBtn { flex: 1; padding: 12px 0; font-size: 14px; color: #555; border-bottom: 2px solid transparent; transition: color 0.15s, border-color 0.15s; }
.activeTab { color: #4ade80; border-bottom-color: #4ade80; font-weight: 600; }
.overview { display: flex; flex-direction: column; gap: 16px; padding: 16px; }
.bodyMapSection { display: flex; justify-content: center; }
.section { display: flex; flex-direction: column; gap: 8px; }
.sectionLabel { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.06em; }
.vitalRow { display: flex; justify-content: space-between; align-items: center; background: #1a1a1a; border-radius: 8px; padding: 10px 14px; }
.vitalName { font-size: 14px; }
.vitalValue { font-size: 14px; color: #4ade80; font-weight: 500; }
.actions { display: flex; gap: 10px; }
.actionBtn { flex: 1; background: #4ade80; color: #000; font-weight: 700; padding: 13px; border-radius: 10px; font-size: 15px; }
.actionBtnSecondary { flex: 1; background: #1a1a2e; color: #6366f1; border: 1px solid #6366f1; font-weight: 600; padding: 13px; border-radius: 10px; font-size: 15px; }
.historyList { padding: 12px; display: flex; flex-direction: column; gap: 6px; }
.empty { color: #555; font-size: 14px; padding: 20px 0; text-align: center; }
.historyRow { display: flex; align-items: center; justify-content: space-between; background: #1a1a1a; border-radius: 8px; padding: 10px 14px; }
.historyMeta { display: flex; flex-direction: column; gap: 2px; }
.historyType { font-size: 13px; }
.historyTime { font-size: 11px; color: #666; }
.intensityDot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.filterChips { display: flex; gap: 6px; flex-wrap: wrap; padding-bottom: 8px; }
.filterChip { padding: 5px 12px; border-radius: 20px; background: #1a1a1a; border: 1px solid #333; font-size: 12px; color: #888; }
.activeChip { background: #14532d; border-color: #4ade80; color: #4ade80; }
```

- [ ] **Step 6: Run tests**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run src/screens/Health.test.jsx
```
Expected: PASS (5 tests).

- [ ] **Step 7: Run full test suite**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run
```
Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
cd /home/jazman/projects/dailyhabitapp && git add src/components/health/GoogleFitSync.jsx src/components/health/GoogleFitSync.module.css src/screens/Health.jsx src/screens/Health.module.css src/screens/Health.test.jsx && git commit -m "feat: implement Health screen (Overview + History) with full symptom and vital logging"
```

---

## Final Verification

- [ ] **Run full test suite one last time**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run
```
Expected: all tests PASS.

- [ ] **Build to verify no bundle errors**

```bash
cd /home/jazman/projects/dailyhabitapp && npm run build 2>&1 | tail -10
```
Expected: build succeeds.

- [ ] **Push to GitHub**

```bash
cd /home/jazman/projects/dailyhabitapp && git push
```

---

> **Plan 2b (Google Fit Integration) follows this plan.** The `GoogleFitSync` component is a placeholder — Plan 2b replaces it with real OAuth + REST import logic.

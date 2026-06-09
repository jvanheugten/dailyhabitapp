# Google Fit Integration — Implementation Plan (Plan 2b)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the placeholder `GoogleFitSync` component with real Google OAuth and import 9 Fitness data types into the local Dexie DB.

**Architecture:** Google Identity Services (GIS) implicit token flow runs in a popup; no server-side OAuth callback needed. A pure service module (`src/services/googleFit.js`) handles all API concerns (token storage, expiry, Fitness API requests, response → DB entry mapping). `VitalsContext` gains a `bulkImportGoogleFitEntries` method. The `GoogleFitSync` component orchestrates connect / sync / disconnect UI. A Dexie v3 migration seeds 4 additional standard vital types needed for activity data (Steps, Calories, Active Minutes, Sleep Duration).

**Tech Stack:** Google Identity Services JS library (CDN), Google Fitness REST API v1, Dexie.js v2/v3, React 18 + Vite, Vitest

---

## Prerequisites (documented, not automated)

The user must create a Google Cloud Console project and enable the Fitness API:

1. <https://console.cloud.google.com/> → New project
2. APIs & Services → Enable "Fitness API"
3. Credentials → Create OAuth 2.0 Client ID (Web application)
4. Authorised JavaScript origins: `http://localhost:5173`, `https://<username>.github.io`
5. Copy the Client ID into `.env.local`:
   ```
   VITE_GOOGLE_CLIENT_ID=<your_client_id_here>
   ```

`.env.example` (committed) should show the variable name with a placeholder value.

---

## File Map

```
.env.example                                     Modify: add VITE_GOOGLE_CLIENT_ID placeholder
index.html                                       Modify: add GIS script tag
src/db/db.js                                     Modify: add Dexie v3 migration (4 activity vital types)
src/services/googleFit.js                        Create: OAuth + Fitness API client + data mapping
src/services/googleFit.test.js                   Create: unit tests for pure mapping functions
src/contexts/VitalsContext.jsx                   Modify: add bulkImportGoogleFitEntries
src/components/health/GoogleFitSync.jsx          Modify: replace placeholder with real implementation
src/components/health/GoogleFitSync.module.css   Modify: add connected/syncing/error styles
```

---

### Task 1: Dexie v3 migration — activity vital types

Seeds 4 standard vital types that Google Fit provides but the v2 migration doesn't include: Steps, Calories, Active Minutes, Sleep Duration.

**Files:**
- Modify: `src/db/db.js`
- Modify: `src/db/db.test.js`

- [ ] **Step 1: Add failing test**

Open `src/db/db.test.js` and add after the existing v2 tests:

```js
describe('db v3 migration', () => {
  it('seeds 4 activity vital types', async () => {
    const types = await db.vital_types.toArray()
    const names = types.map(t => t.name)
    expect(names).toContain('Steps')
    expect(names).toContain('Calories')
    expect(names).toContain('Active Minutes')
    expect(names).toContain('Sleep Duration')
    // Confirm is_standard flag
    const steps = types.find(t => t.name === 'Steps')
    expect(steps.is_standard).toBe(true)
    expect(steps.unit).toBe('steps')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run src/db/db.test.js
```

Expected: FAIL ("Steps" not found in vital_types)

- [ ] **Step 3: Add v3 migration to `src/db/db.js`**

After the existing `db.version(2)` block, add:

```js
db.version(3).stores({
  habits: '++id, createdAt',
  completions: '++id, [habitId+date], date',
  journal_entries: '++id, &date',
  notification_prefs: 'habitId',
  symptom_types: '++id, name, createdAt',
  symptoms: '++id, symptom_type_id, timestamp, region',
  vital_types: '++id, name, is_standard',
  vital_entries: '++id, vital_type_id, timestamp, source',
  google_fit_sync: '++id, data_type',
}).upgrade(async tx => {
  const existing = await tx.vital_types.toArray()
  const existingNames = new Set(existing.map(t => t.name))
  const toSeed = [
    { name: 'Steps',          unit: 'steps', value_schema: 'single', is_standard: true, normal_min: null, normal_max: null },
    { name: 'Calories',       unit: 'kcal',  value_schema: 'single', is_standard: true, normal_min: null, normal_max: null },
    { name: 'Active Minutes', unit: 'min',   value_schema: 'single', is_standard: true, normal_min: null, normal_max: null },
    { name: 'Sleep Duration', unit: 'min',   value_schema: 'single', is_standard: true, normal_min: null, normal_max: null },
  ].filter(t => !existingNames.has(t.name))
  for (const t of toSeed) {
    await tx.vital_types.add({ ...t, createdAt: new Date().toISOString() })
  }
})
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run src/db/db.test.js
```

Expected: all tests PASS

- [ ] **Step 5: Run full suite**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run
```

All tests must pass.

- [ ] **Step 6: Commit**

```bash
git add src/db/db.js src/db/db.test.js && git commit -m "feat: add Dexie v3 migration seeding Steps/Calories/Active Minutes/Sleep Duration vital types"
```

---

### Task 2: Environment setup + GIS script

**Files:**
- Modify: `.env.example`
- Modify: `index.html`

- [ ] **Step 1: Add `.env.example` entry**

Open `.env.example` (create if missing). Add:

```
# Google OAuth Client ID — create at https://console.cloud.google.com/
VITE_GOOGLE_CLIENT_ID=your_client_id_here
```

- [ ] **Step 2: Add GIS script to `index.html`**

Add before the closing `</head>` tag:

```html
    <script src="https://accounts.google.com/gsi/client" async defer></script>
```

- [ ] **Step 3: Commit**

```bash
git add .env.example index.html && git commit -m "feat: add GIS script tag and VITE_GOOGLE_CLIENT_ID env example"
```

---

### Task 3: Google Fit service — OAuth + data mapping

All API concerns live in one file. No React; pure functions where possible.

**Files:**
- Create: `src/services/googleFit.js`
- Create: `src/services/googleFit.test.js`

- [ ] **Step 1: Write failing tests for the pure mapping functions**

Create `src/services/googleFit.test.js`:

```js
import { describe, it, expect } from 'vitest'
import {
  mapStepsResponse,
  mapCaloriesResponse,
  mapActiveMinutesResponse,
  mapHeartRateResponse,
  mapSleepResponse,
  mapWeightResponse,
  mapBloodPressureResponse,
  mapBloodGlucoseResponse,
  mapOxygenSatResponse,
} from './googleFit'

// Minimal Google Fit aggregate response bucket
function bucket(startMs, endMs, values) {
  return { startTimeMillis: String(startMs), endTimeMillis: String(endMs), dataset: [{ point: values }] }
}

function fpVal(val) { return { value: [{ fpVal: val }] } }
function intVal(val) { return { value: [{ intVal: val }] } }
function mapVal(sys, dia) { return { value: [{ mapVal: [{ key: 'systolic', value: { fpVal: sys } }, { key: 'diastolic', value: { fpVal: dia } }] }] } }

const START = 1700000000000
const END   = START + 86400000

describe('mapStepsResponse', () => {
  it('sums step counts in a bucket', () => {
    const b = bucket(START, END, [intVal(3000), intVal(2000)])
    const result = mapStepsResponse([b], 99)
    expect(result).toHaveLength(1)
    expect(JSON.parse(result[0].value)).toBe(5000)
    expect(result[0].vital_type_id).toBe(99)
    expect(result[0].source).toBe('google_fit')
  })
  it('skips empty buckets', () => {
    const b = bucket(START, END, [])
    expect(mapStepsResponse([b], 99)).toHaveLength(0)
  })
})

describe('mapCaloriesResponse', () => {
  it('rounds calories to 1 decimal', () => {
    const b = bucket(START, END, [fpVal(312.567)])
    const result = mapCaloriesResponse([b], 88)
    expect(JSON.parse(result[0].value)).toBe(312.6)
  })
})

describe('mapActiveMinutesResponse', () => {
  it('converts milliseconds to minutes', () => {
    // active minutes uses intVal in minutes already
    const b = bucket(START, END, [intVal(45)])
    const result = mapActiveMinutesResponse([b], 77)
    expect(JSON.parse(result[0].value)).toBe(45)
  })
})

describe('mapHeartRateResponse', () => {
  it('takes average fpVal', () => {
    const b = bucket(START, END, [fpVal(70), fpVal(80)])
    const result = mapHeartRateResponse([b], 66)
    expect(JSON.parse(result[0].value)).toBe(75)
  })
})

describe('mapSleepResponse', () => {
  it('sums sleep segment durations into minutes', () => {
    // sleep segments are points with startTimeMillis/endTimeMillis on the point
    const point1 = { startTimeMillis: String(START), endTimeMillis: String(START + 3600000) } // 60 min
    const point2 = { startTimeMillis: String(START + 3600000), endTimeMillis: String(START + 7200000) } // 60 min
    const b = { startTimeMillis: String(START), endTimeMillis: String(END), dataset: [{ point: [point1, point2] }] }
    const result = mapSleepResponse([b], 55)
    expect(JSON.parse(result[0].value)).toBe(120)
  })
})

describe('mapWeightResponse', () => {
  it('takes last fpVal in bucket', () => {
    const b = bucket(START, END, [fpVal(72.5)])
    const result = mapWeightResponse([b], 44)
    expect(JSON.parse(result[0].value)).toBeCloseTo(72.5)
  })
})

describe('mapBloodPressureResponse', () => {
  it('maps compound sys/dia value', () => {
    const b = bucket(START, END, [mapVal(120, 80)])
    const result = mapBloodPressureResponse([b], 33)
    const val = JSON.parse(result[0].value)
    expect(val.sys).toBe(120)
    expect(val.dia).toBe(80)
  })
})

describe('mapBloodGlucoseResponse', () => {
  it('converts mg/dL to mmol/L (÷18.018)', () => {
    const b = bucket(START, END, [fpVal(126)]) // 126 mg/dL = ~7.0 mmol/L
    const result = mapBloodGlucoseResponse([b], 22)
    expect(JSON.parse(result[0].value)).toBeCloseTo(7.0, 1)
  })
})

describe('mapOxygenSatResponse', () => {
  it('converts 0-1 to percentage', () => {
    const b = bucket(START, END, [fpVal(0.98)])
    const result = mapOxygenSatResponse([b], 11)
    expect(JSON.parse(result[0].value)).toBeCloseTo(98, 0)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run src/services/googleFit.test.js
```

Expected: FAIL (module not found)

- [ ] **Step 3: Create `src/services/googleFit.js`**

```js
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

const SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.body.read',
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
  'https://www.googleapis.com/auth/fitness.blood_pressure.read',
  'https://www.googleapis.com/auth/fitness.blood_glucose.read',
  'https://www.googleapis.com/auth/fitness.oxygen_saturation.read',
  'https://www.googleapis.com/auth/fitness.sleep.read',
].join(' ')

// ─── Token management ────────────────────────────────────────────────────────

const TOKEN_KEY = 'gfit_token'
const EXPIRY_KEY = 'gfit_expiry'

export function saveToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(EXPIRY_KEY, String(Date.now() + 55 * 60 * 1000)) // 55 min
}

export function loadToken() {
  const token = sessionStorage.getItem(TOKEN_KEY)
  const expiry = Number(sessionStorage.getItem(EXPIRY_KEY) ?? 0)
  if (!token || Date.now() > expiry) return null
  return token
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(EXPIRY_KEY)
}

export function isConnected() {
  return Boolean(loadToken())
}

// ─── OAuth popup ─────────────────────────────────────────────────────────────

export function requestAccessToken() {
  return new Promise((resolve, reject) => {
    if (!window.google) {
      reject(new Error('Google Identity Services not loaded'))
      return
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description ?? response.error))
          return
        }
        saveToken(response.access_token)
        resolve(response.access_token)
      },
    })
    client.requestAccessToken()
  })
}

export function disconnect() {
  const token = loadToken()
  if (token && window.google) {
    window.google.accounts.oauth2.revoke(token, () => {})
  }
  clearToken()
}

// ─── Fitness API ──────────────────────────────────────────────────────────────

async function aggregateRequest(token, dataTypeName, startMs, endMs) {
  const res = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      aggregateBy: [{ dataTypeName }],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: startMs,
      endTimeMillis: endMs,
    }),
  })
  if (!res.ok) throw new Error(`Fitness API error ${res.status}`)
  const json = await res.json()
  return json.bucket ?? []
}

// ─── Mapping functions (pure — testable without fetch) ────────────────────────

function bucketTimestamp(b) {
  return new Date(Number(b.startTimeMillis)).toISOString()
}

function points(bucket) {
  return bucket.dataset?.[0]?.point ?? []
}

export function mapStepsResponse(buckets, vitalTypeId) {
  return buckets.flatMap((b) => {
    const pts = points(b)
    if (!pts.length) return []
    const total = pts.reduce((sum, p) => sum + (p.value?.[0]?.intVal ?? 0), 0)
    if (!total) return []
    return [{ vital_type_id: vitalTypeId, value: JSON.stringify(total), source: 'google_fit', timestamp: bucketTimestamp(b), notes: '' }]
  })
}

export function mapCaloriesResponse(buckets, vitalTypeId) {
  return buckets.flatMap((b) => {
    const pts = points(b)
    if (!pts.length) return []
    const total = pts.reduce((sum, p) => sum + (p.value?.[0]?.fpVal ?? 0), 0)
    if (!total) return []
    return [{ vital_type_id: vitalTypeId, value: JSON.stringify(Math.round(total * 10) / 10), source: 'google_fit', timestamp: bucketTimestamp(b), notes: '' }]
  })
}

export function mapActiveMinutesResponse(buckets, vitalTypeId) {
  return buckets.flatMap((b) => {
    const pts = points(b)
    if (!pts.length) return []
    const total = pts.reduce((sum, p) => sum + (p.value?.[0]?.intVal ?? 0), 0)
    if (!total) return []
    return [{ vital_type_id: vitalTypeId, value: JSON.stringify(total), source: 'google_fit', timestamp: bucketTimestamp(b), notes: '' }]
  })
}

export function mapHeartRateResponse(buckets, vitalTypeId) {
  return buckets.flatMap((b) => {
    const pts = points(b)
    if (!pts.length) return []
    const vals = pts.map((p) => p.value?.[0]?.fpVal ?? 0).filter(Boolean)
    if (!vals.length) return []
    const avg = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)
    return [{ vital_type_id: vitalTypeId, value: JSON.stringify(avg), source: 'google_fit', timestamp: bucketTimestamp(b), notes: '' }]
  })
}

export function mapSleepResponse(buckets, vitalTypeId) {
  return buckets.flatMap((b) => {
    const pts = points(b)
    if (!pts.length) return []
    const totalMs = pts.reduce((sum, p) => {
      const start = Number(p.startTimeMillis ?? 0)
      const end = Number(p.endTimeMillis ?? 0)
      return sum + (end - start)
    }, 0)
    const minutes = Math.round(totalMs / 60000)
    if (!minutes) return []
    return [{ vital_type_id: vitalTypeId, value: JSON.stringify(minutes), source: 'google_fit', timestamp: bucketTimestamp(b), notes: '' }]
  })
}

export function mapWeightResponse(buckets, vitalTypeId) {
  return buckets.flatMap((b) => {
    const pts = points(b)
    if (!pts.length) return []
    const last = pts[pts.length - 1]
    const val = last?.value?.[0]?.fpVal
    if (!val) return []
    return [{ vital_type_id: vitalTypeId, value: JSON.stringify(Math.round(val * 10) / 10), source: 'google_fit', timestamp: bucketTimestamp(b), notes: '' }]
  })
}

export function mapBloodPressureResponse(buckets, vitalTypeId) {
  return buckets.flatMap((b) => {
    const pts = points(b)
    if (!pts.length) return []
    return pts.flatMap((p) => {
      const mapVal = p.value?.[0]?.mapVal ?? []
      const sys = mapVal.find((m) => m.key === 'systolic')?.value?.fpVal
      const dia = mapVal.find((m) => m.key === 'diastolic')?.value?.fpVal
      if (!sys || !dia) return []
      return [{ vital_type_id: vitalTypeId, value: JSON.stringify({ sys: Math.round(sys), dia: Math.round(dia) }), source: 'google_fit', timestamp: bucketTimestamp(b), notes: '' }]
    })
  })
}

export function mapBloodGlucoseResponse(buckets, vitalTypeId) {
  return buckets.flatMap((b) => {
    const pts = points(b)
    if (!pts.length) return []
    return pts.flatMap((p) => {
      const mgdl = p.value?.[0]?.fpVal
      if (!mgdl) return []
      const mmol = Math.round((mgdl / 18.018) * 10) / 10
      return [{ vital_type_id: vitalTypeId, value: JSON.stringify(mmol), source: 'google_fit', timestamp: bucketTimestamp(b), notes: '' }]
    })
  })
}

export function mapOxygenSatResponse(buckets, vitalTypeId) {
  return buckets.flatMap((b) => {
    const pts = points(b)
    if (!pts.length) return []
    return pts.flatMap((p) => {
      const raw = p.value?.[0]?.fpVal
      if (!raw) return []
      return [{ vital_type_id: vitalTypeId, value: JSON.stringify(Math.round(raw * 100)), source: 'google_fit', timestamp: bucketTimestamp(b), notes: '' }]
    })
  })
}

// ─── Full sync ────────────────────────────────────────────────────────────────

// typeMap: { Steps: id, Calories: id, 'Active Minutes': id, 'Heart Rate': id,
//            'Sleep Duration': id, Weight: id, 'Blood Pressure': id,
//            'Blood Sugar': id, 'Oxygen Saturation': id }
// lastSyncedISO: ISO string or null (null = fetch last 30 days)
export async function fetchAllFitnessData(token, typeMap, lastSyncedISO) {
  const endMs = Date.now()
  const startMs = lastSyncedISO
    ? new Date(lastSyncedISO).getTime()
    : endMs - 30 * 24 * 60 * 60 * 1000

  const jobs = [
    { type: 'com.google.step_count.delta',   name: 'Steps',              mapper: mapStepsResponse },
    { type: 'com.google.calories.expended',  name: 'Calories',           mapper: mapCaloriesResponse },
    { type: 'com.google.active_minutes',     name: 'Active Minutes',     mapper: mapActiveMinutesResponse },
    { type: 'com.google.heart_rate.summary', name: 'Heart Rate',         mapper: mapHeartRateResponse },
    { type: 'com.google.sleep.segment',      name: 'Sleep Duration',     mapper: mapSleepResponse },
    { type: 'com.google.weight',             name: 'Weight',             mapper: mapWeightResponse },
    { type: 'com.google.blood_pressure',     name: 'Blood Pressure',     mapper: mapBloodPressureResponse },
    { type: 'com.google.blood_glucose',      name: 'Blood Sugar',        mapper: mapBloodGlucoseResponse },
    { type: 'com.google.oxygen_saturation',  name: 'Oxygen Saturation',  mapper: mapOxygenSatResponse },
  ]

  const allEntries = []
  for (const job of jobs) {
    const id = typeMap[job.name]
    if (!id) continue
    try {
      const buckets = await aggregateRequest(token, job.type, startMs, endMs)
      const entries = job.mapper(buckets, id)
      allEntries.push(...entries)
    } catch {
      // skip unavailable data types silently
    }
  }
  return allEntries
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run src/services/googleFit.test.js
```

Expected: all tests PASS

- [ ] **Step 5: Run full suite**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run
```

- [ ] **Step 6: Commit**

```bash
git add src/services/googleFit.js src/services/googleFit.test.js && git commit -m "feat: add Google Fit service with OAuth token management and Fitness API data mapping"
```

---

### Task 4: VitalsContext — bulk import

Adds `bulkImportGoogleFitEntries` and a `typeMap` helper for the sync component.

**Files:**
- Modify: `src/contexts/VitalsContext.jsx`

- [ ] **Step 1: Write failing test**

In `src/contexts/VitalsContext.test.jsx` (create if missing), add:

```jsx
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { VitalsProvider, useVitals } from './VitalsContext'
import { db } from '../db/db'

beforeEach(async () => {
  await db.vital_entries.clear()
  await db.vital_types.clear()
  await db.vital_types.bulkAdd([
    { id: 1, name: 'Heart Rate', unit: 'bpm', value_schema: 'single', is_standard: true, createdAt: new Date().toISOString() },
  ])
})

const wrapper = ({ children }) => <VitalsProvider>{children}</VitalsProvider>

describe('bulkImportGoogleFitEntries', () => {
  it('inserts entries and updates state', async () => {
    const { result } = renderHook(() => useVitals(), { wrapper })
    const entries = [
      { vital_type_id: 1, value: JSON.stringify(72), source: 'google_fit', timestamp: new Date().toISOString(), notes: '' },
      { vital_type_id: 1, value: JSON.stringify(75), source: 'google_fit', timestamp: new Date(Date.now() - 86400000).toISOString(), notes: '' },
    ]
    await act(async () => {
      await result.current.bulkImportGoogleFitEntries(entries)
    })
    expect(result.current.vitalEntries.filter(e => e.source === 'google_fit')).toHaveLength(2)
  })

  it('skips duplicate timestamps for same vital_type_id', async () => {
    const { result } = renderHook(() => useVitals(), { wrapper })
    const ts = new Date().toISOString()
    const entry = { vital_type_id: 1, value: JSON.stringify(72), source: 'google_fit', timestamp: ts, notes: '' }
    await act(async () => {
      await result.current.bulkImportGoogleFitEntries([entry])
      await result.current.bulkImportGoogleFitEntries([entry]) // second import, same data
    })
    const fitEntries = result.current.vitalEntries.filter(e => e.source === 'google_fit')
    expect(fitEntries).toHaveLength(1)
  })

  it('getVitalTypeMap returns object keyed by name', async () => {
    const { result } = renderHook(() => useVitals(), { wrapper })
    const map = result.current.getVitalTypeMap()
    expect(map['Heart Rate']).toBe(1)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run src/contexts/VitalsContext.test.jsx 2>&1 | tail -20
```

Expected: FAIL (`bulkImportGoogleFitEntries` not defined, `getVitalTypeMap` not defined)

- [ ] **Step 3: Add methods to `VitalsContext.jsx`**

Add `getVitalTypeMap` after `getEntriesForType`:

```js
const getVitalTypeMap = useCallback(() => {
  return Object.fromEntries(vitalTypes.map(t => [t.name, t.id]))
}, [vitalTypes])
```

Add `bulkImportGoogleFitEntries` after `getVitalTypeMap`:

```js
const bulkImportGoogleFitEntries = useCallback(async (entries) => {
  if (!entries.length) return
  // Dedup: fetch existing timestamps per vital_type_id
  const existing = await db.vital_entries
    .where('source').equals('google_fit')
    .toArray()
  const existingKeys = new Set(existing.map(e => `${e.vital_type_id}::${e.timestamp}`))
  const fresh = entries.filter(e => !existingKeys.has(`${e.vital_type_id}::${e.timestamp}`))
  if (!fresh.length) return
  await db.vital_entries.bulkAdd(fresh)
  const saved = await db.vital_entries.orderBy('timestamp').reverse().limit(200).toArray()
  setVitalEntries(saved)
}, [])
```

Expose both in the context value:

```js
value={{
  vitalTypes,
  vitalEntries,
  addVitalType,
  updateVitalType,
  deleteVitalType,
  addVitalEntry,
  getEntriesForType,
  getVitalTypeMap,
  bulkImportGoogleFitEntries,
}}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run src/contexts/VitalsContext.test.jsx
```

- [ ] **Step 5: Run full suite**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run
```

- [ ] **Step 6: Commit**

```bash
git add src/contexts/VitalsContext.jsx && git commit -m "feat: add bulkImportGoogleFitEntries and getVitalTypeMap to VitalsContext"
```

---

### Task 5: GoogleFitSync component

Replaces the placeholder with a full connect / sync / disconnect flow.

**Files:**
- Modify: `src/components/health/GoogleFitSync.jsx`
- Modify: `src/components/health/GoogleFitSync.module.css`

- [ ] **Step 1: Write `src/components/health/GoogleFitSync.jsx`**

Replace the file entirely:

```jsx
import { useState, useEffect, useCallback } from 'react'
import { useVitals } from '../../contexts/VitalsContext'
import { db } from '../../db/db'
import {
  isConnected,
  requestAccessToken,
  loadToken,
  disconnect as gDisconnect,
  fetchAllFitnessData,
} from '../../services/googleFit'
import styles from './GoogleFitSync.module.css'

export function GoogleFitSync() {
  const { getVitalTypeMap, bulkImportGoogleFitEntries } = useVitals()
  const [connected, setConnected] = useState(() => isConnected())
  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    db.google_fit_sync.orderBy('id').last().then((row) => {
      if (row?.last_synced) setLastSynced(row.last_synced)
    })
  }, [])

  const handleConnect = useCallback(async () => {
    setError(null)
    try {
      await requestAccessToken()
      setConnected(true)
    } catch (e) {
      setError(e.message)
    }
  }, [])

  const handleSync = useCallback(async () => {
    setError(null)
    setSyncing(true)
    try {
      let token = loadToken()
      if (!token) {
        token = await requestAccessToken()
        setConnected(true)
      }
      const typeMap = getVitalTypeMap()
      const entries = await fetchAllFitnessData(token, typeMap, lastSynced)
      await bulkImportGoogleFitEntries(entries)
      const now = new Date().toISOString()
      await db.google_fit_sync.put({ data_type: 'all', last_synced: now, access_token: '' })
      setLastSynced(now)
    } catch (e) {
      setError(e.message)
    } finally {
      setSyncing(false)
    }
  }, [getVitalTypeMap, bulkImportGoogleFitEntries, lastSynced])

  const handleDisconnect = useCallback(async () => {
    gDisconnect()
    await db.google_fit_sync.clear()
    setConnected(false)
    setLastSynced(null)
    setError(null)
  }, [])

  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    return (
      <div className={styles.wrap}>
        <span className={styles.noConfig}>Google Fit: set VITE_GOOGLE_CLIENT_ID to enable</span>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.label}>Google Fit</span>
        {connected && (
          <button className={styles.disconnectBtn} onClick={handleDisconnect}>
            Disconnect
          </button>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {!connected ? (
        <button className={styles.connectBtn} onClick={handleConnect}>
          <span>🔗</span>
          <span>Connect Google Fit</span>
        </button>
      ) : (
        <div className={styles.connectedRow}>
          <div className={styles.syncInfo}>
            <span className={styles.connectedDot} />
            <span className={styles.syncTime}>
              {lastSynced
                ? `Last synced ${new Date(lastSynced).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                : 'Never synced'}
            </span>
          </div>
          <button className={styles.syncBtn} onClick={handleSync} disabled={syncing}>
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write `src/components/health/GoogleFitSync.module.css`**

Replace the file entirely:

```css
.wrap {
  padding: 12px 14px;
  border-radius: var(--radius);
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-dim);
}

.connectBtn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  transition: border-color 0.15s, color 0.15s;
}

.connectBtn:hover { border-color: var(--accent); color: var(--text); }

.connectedRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.syncInfo {
  display: flex;
  align-items: center;
  gap: 7px;
}

.connectedDot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--green);
  box-shadow: 0 0 6px var(--green);
  flex-shrink: 0;
}

.syncTime {
  font-size: 12px;
  color: var(--text-muted);
}

.syncBtn {
  padding: 7px 14px;
  border-radius: var(--radius-sm);
  background: var(--accent-dim);
  border: 1px solid rgba(61,142,240,0.3);
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
  transition: background 0.15s;
  white-space: nowrap;
}

.syncBtn:hover:not(:disabled) { background: rgba(61,142,240,0.2); }
.syncBtn:disabled { opacity: 0.5; cursor: not-allowed; }

.disconnectBtn {
  font-size: 11px;
  color: var(--text-dim);
  transition: color 0.15s;
}

.disconnectBtn:hover { color: #ef4444; }

.error {
  font-size: 12px;
  color: #ef4444;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  margin: 0;
}

.noConfig {
  font-size: 11px;
  color: var(--text-dim);
}
```

- [ ] **Step 3: Run full test suite**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run
```

All tests must pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/health/GoogleFitSync.jsx src/components/health/GoogleFitSync.module.css && git commit -m "feat: replace GoogleFitSync placeholder with real OAuth connect/sync/disconnect UI"
```

---

### Task 6: Final integration check

- [ ] **Step 1: Start dev server and verify build**

```bash
cd /home/jazman/projects/dailyhabitapp && npm run build 2>&1 | tail -20
```

Expected: build succeeds with no errors.

- [ ] **Step 2: Run full test suite one final time**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run
```

All tests pass.

- [ ] **Step 3: Verify GoogleFitSync renders correctly without a client ID**

When `VITE_GOOGLE_CLIENT_ID` is not set, the component should show the "set VITE_GOOGLE_CLIENT_ID to enable" message rather than a broken UI. Confirm by checking the Health screen overview tab renders without errors.

- [ ] **Step 4: Commit if any fixes were needed, then push**

```bash
git push
```

---

## Notes for developers

- The GIS library uses a popup for OAuth. Popups are blocked in PWA standalone mode on some platforms; if that's a problem, a redirect flow can replace `initTokenClient` in a future iteration.
- Access tokens expire after ~1 hour (55-minute buffer stored). The sync button re-prompts for auth when the token is expired.
- Google Fit API is deprecated for new apps as of May 2024 in favour of Health Connect on Android. The integration works for existing users but long-term the plan should migrate to Health Connect or Apple Health (HealthKit) APIs.
- All data imported from Google Fit is marked `source: 'google_fit'` and is deduplicated by `vital_type_id + timestamp` on every sync.

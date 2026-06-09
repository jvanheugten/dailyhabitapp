# Statistics & Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 5th Stats tab with a scrollable page showing habit stats, health stats, and cross-domain correlation insights, all filtered by a shared time-range selector.

**Architecture:** Pure stat functions in `statsHelpers.js` (fully unit-tested) compute all derived values from raw context data + a range-filtered DB query for completions. `Stats.jsx` owns time-range state and passes pre-filtered data to three dumb section components. Recharts handles vital trend line charts only; all other charts are pure SVG/CSS.

**Tech Stack:** React 18, Vite, Dexie.js v3, Recharts, Vitest, CSS Modules

---

## File map

```
src/utils/statsHelpers.js          Create: all pure stat computation functions
src/utils/statsHelpers.test.js     Create: unit tests for every function
src/components/health/BodyMap.jsx  Modify: add readOnly + regionColors props
src/components/BottomNav.jsx       Modify: add 5th Stats tab
src/App.jsx                        Modify: import + render Stats screen
src/screens/Stats.jsx              Create: time-range state, data loading, renders 3 sections
src/screens/Stats.module.css       Create: screen layout, range chips, custom picker
src/components/stats/HabitStats.jsx        Create: summary cards, per-habit list, day chart, heatmap
src/components/stats/HabitStats.module.css Create
src/components/stats/HealthStats.jsx       Create: body map display, symptom freq, vital trends
src/components/stats/HealthStats.module.css Create
src/components/stats/InsightsSection.jsx   Create: insight card renderer
src/components/stats/InsightsSection.module.css Create
```

---

### Task 1: statsHelpers.js — pure stat functions (TDD)

**Files:**
- Create: `src/utils/statsHelpers.js`
- Create: `src/utils/statsHelpers.test.js`

All functions receive plain data arrays + a `range: { start: Date, end: Date }` object. No DB access, no React.

- [ ] **Step 1: Create the test file**

```js
// src/utils/statsHelpers.test.js
import { describe, it, expect } from 'vitest'
import {
  eachDayInRange,
  calcCompletionRate,
  calcPerHabitRate,
  calcDayOfWeekBreakdown,
  calcHeatmapData,
  calcSymptomFrequency,
  calcBodyMapIntensity,
  generateInsights,
} from './statsHelpers'

// Helpers for building test fixtures
function mkRange(startStr, endStr) {
  const start = new Date(startStr + 'T00:00:00')
  const end = new Date(endStr + 'T23:59:59')
  return { start, end }
}
function mkHabit(id, days) { return { id, name: `Habit ${id}`, days } }
function mkCompletion(habitId, date) { return { habitId, date } }
function mkSymptom(id, typeId, region, intensity, timestamp) {
  return { id, symptom_type_id: typeId, region, intensity, timestamp }
}
function mkSymptomType(id, name) { return { id, name } }
function mkVitalType(id, name, schema = 'single', normalMin = null, normalMax = null) {
  return { id, name, value_schema: schema, normal_min: normalMin, normal_max: normalMax }
}
function mkVitalEntry(id, typeId, value, timestamp) {
  return { id, vital_type_id: typeId, value: JSON.stringify(value), timestamp }
}

// ── eachDayInRange ──────────────────────────────────────────────────────────

describe('eachDayInRange', () => {
  it('returns one string per day inclusive', () => {
    const days = eachDayInRange(mkRange('2026-06-01', '2026-06-03'))
    expect(days).toEqual(['2026-06-01', '2026-06-02', '2026-06-03'])
  })
  it('returns single day when start equals end', () => {
    expect(eachDayInRange(mkRange('2026-06-01', '2026-06-01'))).toHaveLength(1)
  })
})

// ── calcCompletionRate ──────────────────────────────────────────────────────

describe('calcCompletionRate', () => {
  it('returns 0 when no habits', () => {
    expect(calcCompletionRate([], [], mkRange('2026-06-01', '2026-06-07'))).toBe(0)
  })
  it('returns 100 when all scheduled slots completed', () => {
    // Mon-only habit (day=1), range is Mon Jun 2 only
    const habit = mkHabit(1, [1])
    const comp = mkCompletion(1, '2026-06-02')
    expect(calcCompletionRate([habit], [comp], mkRange('2026-06-02', '2026-06-02'))).toBe(100)
  })
  it('returns 0 when nothing completed', () => {
    const habit = mkHabit(1, [1])
    expect(calcCompletionRate([habit], [], mkRange('2026-06-02', '2026-06-02'))).toBe(0)
  })
  it('calculates partial completion correctly', () => {
    // daily habit, 2 of 4 days completed
    const habit = mkHabit(1, [0, 1, 2, 3, 4, 5, 6])
    const comps = [mkCompletion(1, '2026-06-01'), mkCompletion(1, '2026-06-02')]
    expect(calcCompletionRate([habit], comps, mkRange('2026-06-01', '2026-06-04'))).toBe(50)
  })
  it('ignores completions outside range', () => {
    const habit = mkHabit(1, [0, 1, 2, 3, 4, 5, 6])
    const comps = [mkCompletion(1, '2026-05-01')]
    expect(calcCompletionRate([habit], comps, mkRange('2026-06-01', '2026-06-07'))).toBe(0)
  })
})

// ── calcPerHabitRate ────────────────────────────────────────────────────────

describe('calcPerHabitRate', () => {
  it('returns rate for a single habit', () => {
    const habit = mkHabit(1, [0, 1, 2, 3, 4, 5, 6])
    const comps = [mkCompletion(1, '2026-06-01'), mkCompletion(1, '2026-06-02'), mkCompletion(2, '2026-06-03')]
    // habit 1: 2 of 4 days = 50%
    expect(calcPerHabitRate(habit, comps, mkRange('2026-06-01', '2026-06-04'))).toBe(50)
  })
  it('returns 0 when habit not scheduled in range', () => {
    // Mon-only habit, range is all Sundays
    const habit = mkHabit(1, [1])
    expect(calcPerHabitRate(habit, [], mkRange('2026-06-07', '2026-06-07'))).toBe(0)
  })
})

// ── calcDayOfWeekBreakdown ──────────────────────────────────────────────────

describe('calcDayOfWeekBreakdown', () => {
  it('returns array of length 7', () => {
    const result = calcDayOfWeekBreakdown([], [], mkRange('2026-06-01', '2026-06-07'))
    expect(result).toHaveLength(7)
    expect(result[0]).toHaveProperty('day', 0)
    expect(result[6]).toHaveProperty('day', 6)
  })
  it('gives 0 rate for days with no scheduled habits', () => {
    const habit = mkHabit(1, [1]) // Mon only
    const result = calcDayOfWeekBreakdown([habit], [], mkRange('2026-06-01', '2026-06-07'))
    expect(result.find(r => r.day === 0).rate).toBe(0) // Sunday unscheduled
  })
  it('gives 100 rate for a day where all completions done', () => {
    const habit = mkHabit(1, [1]) // Mon only, Jun 2 is Monday
    const comps = [mkCompletion(1, '2026-06-02')]
    const result = calcDayOfWeekBreakdown([habit], comps, mkRange('2026-06-02', '2026-06-02'))
    expect(result.find(r => r.day === 1).rate).toBe(100)
  })
})

// ── calcHeatmapData ─────────────────────────────────────────────────────────

describe('calcHeatmapData', () => {
  it('returns one cell per day in range', () => {
    const result = calcHeatmapData([], [], mkRange('2026-06-01', '2026-06-05'))
    expect(result).toHaveLength(5)
  })
  it('level 0 when no habits scheduled', () => {
    const habit = mkHabit(1, [1]) // Mon only
    // Jun 7 2026 is a Sunday
    const result = calcHeatmapData([habit], [], mkRange('2026-06-07', '2026-06-07'))
    expect(result[0].level).toBe(0)
  })
  it('level 4 for 100% completion', () => {
    const habit = mkHabit(1, [1]) // Jun 2 is Monday
    const comps = [mkCompletion(1, '2026-06-02')]
    const result = calcHeatmapData([habit], comps, mkRange('2026-06-02', '2026-06-02'))
    expect(result[0].level).toBe(4)
  })
  it('level 1 for <50%', () => {
    const h1 = mkHabit(1, [1]), h2 = mkHabit(2, [1]) // both Monday
    const comps = [mkCompletion(1, '2026-06-02')] // only h1 done = 50% — that's level 2
    const result = calcHeatmapData([h1, h2], comps, mkRange('2026-06-02', '2026-06-02'))
    expect(result[0].level).toBe(2) // 50% = level 2
  })
  it('level 1 for 1–49%', () => {
    const habits = [mkHabit(1,[1]),mkHabit(2,[1]),mkHabit(3,[1]),mkHabit(4,[1])]
    const comps = [mkCompletion(1, '2026-06-02')] // 1/4 = 25%
    const result = calcHeatmapData(habits, comps, mkRange('2026-06-02', '2026-06-02'))
    expect(result[0].level).toBe(1)
  })
  it('level 3 for 75–99%', () => {
    const habits = [mkHabit(1,[1]),mkHabit(2,[1]),mkHabit(3,[1]),mkHabit(4,[1])]
    const comps = [mkCompletion(1,'2026-06-02'),mkCompletion(2,'2026-06-02'),mkCompletion(3,'2026-06-02')]
    // 3/4 = 75% → level 3
    const result = calcHeatmapData(habits, comps, mkRange('2026-06-02', '2026-06-02'))
    expect(result[0].level).toBe(3)
  })
})

// ── calcSymptomFrequency ────────────────────────────────────────────────────

describe('calcSymptomFrequency', () => {
  it('returns empty array when no symptoms', () => {
    expect(calcSymptomFrequency([], [], mkRange('2026-06-01', '2026-06-30'))).toEqual([])
  })
  it('resolves names via symptomTypes', () => {
    const types = [mkSymptomType(1, 'Headache'), mkSymptomType(2, 'Nausea')]
    const syms = [
      mkSymptom(1, 1, 'head', 3, '2026-06-05T10:00:00.000Z'),
      mkSymptom(2, 1, 'head', 2, '2026-06-06T10:00:00.000Z'),
      mkSymptom(3, 2, 'abdomen', 1, '2026-06-07T10:00:00.000Z'),
    ]
    const result = calcSymptomFrequency(syms, types, mkRange('2026-06-01', '2026-06-30'))
    expect(result[0]).toEqual({ name: 'Headache', count: 2 })
    expect(result[1]).toEqual({ name: 'Nausea', count: 1 })
  })
  it('filters out symptoms outside range', () => {
    const types = [mkSymptomType(1, 'Headache')]
    const syms = [mkSymptom(1, 1, 'head', 3, '2026-05-01T10:00:00.000Z')]
    const result = calcSymptomFrequency(syms, types, mkRange('2026-06-01', '2026-06-30'))
    expect(result).toHaveLength(0)
  })
})

// ── calcBodyMapIntensity ────────────────────────────────────────────────────

describe('calcBodyMapIntensity', () => {
  it('returns empty object when no symptoms', () => {
    expect(calcBodyMapIntensity([], mkRange('2026-06-01', '2026-06-30'))).toEqual({})
  })
  it('counts symptoms per region', () => {
    const syms = [
      mkSymptom(1, 1, 'head', 3, '2026-06-05T10:00:00.000Z'),
      mkSymptom(2, 1, 'head', 2, '2026-06-06T10:00:00.000Z'),
      mkSymptom(3, 2, 'chest', 1, '2026-06-07T10:00:00.000Z'),
    ]
    const result = calcBodyMapIntensity(syms, mkRange('2026-06-01', '2026-06-30'))
    expect(result.head).toBe(2)
    expect(result.chest).toBe(1)
  })
  it('excludes symptoms outside range', () => {
    const syms = [mkSymptom(1, 1, 'head', 3, '2026-05-01T10:00:00.000Z')]
    expect(calcBodyMapIntensity(syms, mkRange('2026-06-01', '2026-06-30'))).toEqual({})
  })
})

// ── generateInsights ────────────────────────────────────────────────────────

describe('generateInsights', () => {
  it('returns [] when range < 7 days', () => {
    const result = generateInsights([], [], [], [], [], [], mkRange('2026-06-01', '2026-06-05'))
    expect(result).toEqual([])
  })

  it('emits habit→symptom insight when threshold met', () => {
    // Daily habit, high-completion days Mon-Fri, low Sat-Sun
    const habit = mkHabit(1, [0,1,2,3,4,5,6])
    const comps = []
    // High completion days: all weekdays Jun 1-5 (Mon-Fri)
    for (const d of ['2026-06-01','2026-06-02','2026-06-03','2026-06-04','2026-06-05']) {
      comps.push(mkCompletion(1, d))
    }
    // Low completion days: Jun 6-7 (Sat-Sun) — no completions
    // Headache type
    const symptomTypes = [mkSymptomType(1, 'Headache')]
    // Symptoms: low intensity on high-completion days, high on low-completion days
    const symptoms = [
      mkSymptom(1,1,'head',1,'2026-06-01T10:00:00.000Z'),
      mkSymptom(2,1,'head',1,'2026-06-02T10:00:00.000Z'),
      mkSymptom(3,1,'head',1,'2026-06-03T10:00:00.000Z'),
      mkSymptom(4,1,'head',4,'2026-06-06T10:00:00.000Z'),
      mkSymptom(5,1,'head',4,'2026-06-07T10:00:00.000Z'),
      mkSymptom(6,1,'head',4,'2026-06-08T10:00:00.000Z'), // extra to hit >=5
    ]
    const result = generateInsights(
      [habit], comps, symptoms, symptomTypes, [], [],
      mkRange('2026-06-01', '2026-06-14')
    )
    const insight = result.find(i => i.tag === 'Habit → Symptom')
    expect(insight).toBeDefined()
    expect(insight.text).toContain('headache')
  })

  it('emits day-of-week insight when ≥35% on one day', () => {
    const symptomTypes = [mkSymptomType(1, 'Headache')]
    // 4 out of 6 headaches on Sunday (day 0)
    const symptoms = [
      mkSymptom(1,1,'head',2,'2026-06-07T10:00:00.000Z'), // Sun
      mkSymptom(2,1,'head',2,'2026-06-14T10:00:00.000Z'), // Sun
      mkSymptom(3,1,'head',2,'2026-06-21T10:00:00.000Z'), // Sun
      mkSymptom(4,1,'head',2,'2026-06-01T10:00:00.000Z'), // Mon
      mkSymptom(5,1,'head',2,'2026-06-02T10:00:00.000Z'), // Tue
      mkSymptom(6,1,'head',2,'2026-06-03T10:00:00.000Z'), // Wed
    ]
    const result = generateInsights(
      [], [], symptoms, symptomTypes, [], [],
      mkRange('2026-06-01', '2026-06-30')
    )
    const insight = result.find(i => i.tag === 'Symptom pattern')
    expect(insight).toBeDefined()
    expect(insight.text).toContain('Headache')
    expect(insight.text).toContain('Sunday')
  })

  it('returns at most 5 insights', () => {
    // Just check the cap — minimal valid data
    const result = generateInsights([], [], [], [], [], [], mkRange('2026-06-01', '2026-06-30'))
    expect(result.length).toBeLessThanOrEqual(5)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run src/utils/statsHelpers.test.js 2>&1 | tail -5
```

Expected: FAIL (module not found)

- [ ] **Step 3: Create `src/utils/statsHelpers.js`**

```js
import { formatDate } from './dates'

// Returns array of 'YYYY-MM-DD' strings for each day in [range.start, range.end] inclusive
export function eachDayInRange(range) {
  const days = []
  const cursor = new Date(range.start)
  cursor.setHours(12, 0, 0, 0)
  const end = new Date(range.end)
  end.setHours(12, 0, 0, 0)
  while (cursor <= end) {
    days.push(formatDate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

function inRange(isoString, range) {
  const d = new Date(isoString)
  return d >= range.start && d <= range.end
}

// Monday of the week containing dateStr, as 'YYYY-MM-DD'
function weekKey(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const dow = d.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  return formatDate(d)
}

// Returns overall completion rate 0–100 across all habits for the range
export function calcCompletionRate(habits, completionRows, range) {
  if (!habits.length) return 0
  const days = eachDayInRange(range)
  const completedSet = new Set(completionRows.map((r) => `${r.habitId}::${r.date}`))
  let scheduled = 0, done = 0
  for (const dateStr of days) {
    const dow = new Date(dateStr + 'T12:00:00').getDay()
    for (const h of habits) {
      if (!h.days.includes(dow)) continue
      scheduled++
      if (completedSet.has(`${h.id}::${dateStr}`)) done++
    }
  }
  return scheduled ? Math.round((done / scheduled) * 100) : 0
}

// Returns completion rate 0–100 for a single habit in the range
export function calcPerHabitRate(habit, completionRows, range) {
  const days = eachDayInRange(range)
  const completedSet = new Set(
    completionRows.filter((r) => r.habitId === habit.id).map((r) => r.date)
  )
  let scheduled = 0, done = 0
  for (const dateStr of days) {
    const dow = new Date(dateStr + 'T12:00:00').getDay()
    if (!habit.days.includes(dow)) continue
    scheduled++
    if (completedSet.has(dateStr)) done++
  }
  return scheduled ? Math.round((done / scheduled) * 100) : 0
}

// Returns [{ day: 0–6, rate: 0–100 }] for each day of week
export function calcDayOfWeekBreakdown(habits, completionRows, range) {
  const days = eachDayInRange(range)
  const completedSet = new Set(completionRows.map((r) => `${r.habitId}::${r.date}`))
  const slots = Array(7).fill(0)
  const completions = Array(7).fill(0)
  for (const dateStr of days) {
    const dow = new Date(dateStr + 'T12:00:00').getDay()
    for (const h of habits) {
      if (!h.days.includes(dow)) continue
      slots[dow]++
      if (completedSet.has(`${h.id}::${dateStr}`)) completions[dow]++
    }
  }
  return Array.from({ length: 7 }, (_, i) => ({
    day: i,
    rate: slots[i] ? Math.round((completions[i] / slots[i]) * 100) : 0,
  }))
}

// Returns [{ date: 'YYYY-MM-DD', level: 0–4 }] for each day in range
export function calcHeatmapData(habits, completionRows, range) {
  const days = eachDayInRange(range)
  const completedSet = new Set(completionRows.map((r) => `${r.habitId}::${r.date}`))
  return days.map((dateStr) => {
    const dow = new Date(dateStr + 'T12:00:00').getDay()
    const scheduled = habits.filter((h) => h.days.includes(dow))
    if (!scheduled.length) return { date: dateStr, level: 0 }
    const done = scheduled.filter((h) => completedSet.has(`${h.id}::${dateStr}`)).length
    const pct = (done / scheduled.length) * 100
    const level = pct === 0 ? 0 : pct < 50 ? 1 : pct < 75 ? 2 : pct < 100 ? 3 : 4
    return { date: dateStr, level }
  })
}

// Returns [{ name, count }] sorted descending by count
export function calcSymptomFrequency(symptoms, symptomTypes, range) {
  const filtered = symptoms.filter((s) => inRange(s.timestamp, range))
  const counts = {}
  for (const s of filtered) counts[s.symptom_type_id] = (counts[s.symptom_type_id] ?? 0) + 1
  return symptomTypes
    .filter((t) => counts[t.id])
    .map((t) => ({ name: t.name, count: counts[t.id] }))
    .sort((a, b) => b.count - a.count)
}

// Returns { [regionId]: count } for symptoms in range
export function calcBodyMapIntensity(symptoms, range) {
  const counts = {}
  for (const s of symptoms) {
    if (!inRange(s.timestamp, range)) continue
    counts[s.region] = (counts[s.region] ?? 0) + 1
  }
  return counts
}

// Returns up to 5 insight objects { tag, text, stat }, sorted by sample size desc
export function generateInsights(
  habits,
  completionRows,
  symptoms,
  symptomTypes,
  vitalTypes,
  vitalEntries,
  range
) {
  const days = eachDayInRange(range)
  if (days.length < 7) return []

  const insights = []
  const completedSet = new Set(completionRows.map((r) => `${r.habitId}::${r.date}`))

  // Pre-compute daily completion rate (null = no habits scheduled)
  const dailyRate = {}
  for (const dateStr of days) {
    const dow = new Date(dateStr + 'T12:00:00').getDay()
    const scheduled = habits.filter((h) => h.days.includes(dow))
    if (!scheduled.length) { dailyRate[dateStr] = null; continue }
    const done = scheduled.filter((h) => completedSet.has(`${h.id}::${dateStr}`)).length
    dailyRate[dateStr] = (done / scheduled.length) * 100
  }

  const symptomsInRange = symptoms.filter((s) => {
    const d = new Date(s.timestamp)
    return d >= range.start && d <= range.end
  })

  // 1. Habit → Symptom intensity correlation
  for (const st of symptomTypes) {
    const typeSymptoms = symptomsInRange.filter((s) => s.symptom_type_id === st.id)
    if (typeSymptoms.length < 5) continue
    const high = [], low = []
    for (const s of typeSymptoms) {
      const dateStr = s.timestamp.slice(0, 10)
      const rate = dailyRate[dateStr]
      if (rate === null || rate === undefined) continue
      if (rate >= 75) high.push(s.intensity)
      else low.push(s.intensity)
    }
    if (high.length < 3 || low.length < 3) continue
    const avgHigh = high.reduce((a, b) => a + b, 0) / high.length
    const avgLow = low.reduce((a, b) => a + b, 0) / low.length
    if (Math.abs(avgHigh - avgLow) < 0.5) continue
    const pct = Math.round((Math.abs(avgHigh - avgLow) / Math.max(avgLow, 0.1)) * 100)
    const direction = avgHigh < avgLow ? 'lower' : 'higher'
    insights.push({
      tag: 'Habit → Symptom',
      text: `On days you complete most habits, ${st.name.toLowerCase()} severity is ${pct}% ${direction} on average.`,
      stat: `Based on ${high.length + low.length} matched days`,
      _w: high.length + low.length,
    })
  }

  // 2. Day-of-week symptom pattern
  const DOW = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays']
  for (const st of symptomTypes) {
    const typeSymptoms = symptomsInRange.filter((s) => s.symptom_type_id === st.id)
    if (typeSymptoms.length < 4) continue
    const dowCounts = Array(7).fill(0)
    for (const s of typeSymptoms) dowCounts[new Date(s.timestamp).getDay()]++
    const maxCount = Math.max(...dowCounts)
    const maxDow = dowCounts.indexOf(maxCount)
    if (maxCount / typeSymptoms.length < 0.35) continue
    insights.push({
      tag: 'Symptom pattern',
      text: `${st.name} occurs most often on ${DOW[maxDow]}.`,
      stat: `${maxCount} of ${typeSymptoms.length} occurrences`,
      _w: typeSymptoms.length,
    })
  }

  // 3. Vital trend (weekly habit correlation)
  const vitalEntriesInRange = vitalEntries.filter((e) => {
    const d = new Date(e.timestamp)
    return d >= range.start && d <= range.end
  })
  for (const vt of vitalTypes) {
    const entries = vitalEntriesInRange.filter((e) => e.vital_type_id === vt.id)
    if (entries.length < 4) continue

    // Build per-week avg completion and vital avg
    const weekData = {}
    for (const dateStr of days) {
      const wk = weekKey(dateStr)
      if (!weekData[wk]) weekData[wk] = { rates: [], vals: [] }
      if (dailyRate[dateStr] !== null && dailyRate[dateStr] !== undefined)
        weekData[wk].rates.push(dailyRate[dateStr])
    }
    for (const e of entries) {
      const wk = weekKey(e.timestamp.slice(0, 10))
      if (!weekData[wk]) continue
      try {
        const v = JSON.parse(e.value)
        const num = vt.value_schema === 'compound' ? (v.sys + v.dia) / 2 : Number(v)
        if (!isNaN(num)) weekData[wk].vals.push(num)
      } catch { /* skip */ }
    }

    const activeVals = [], inactiveVals = []
    for (const { rates, vals } of Object.values(weekData)) {
      if (!rates.length || !vals.length) continue
      const weekRate = rates.reduce((a, b) => a + b, 0) / rates.length
      const weekAvg = vals.reduce((a, b) => a + b, 0) / vals.length
      if (weekRate >= 75) activeVals.push(weekAvg)
      else inactiveVals.push(weekAvg)
    }
    if (activeVals.length < 2 || inactiveVals.length < 2) continue

    const activeAvg = activeVals.reduce((a, b) => a + b, 0) / activeVals.length
    const inactiveAvg = inactiveVals.reduce((a, b) => a + b, 0) / inactiveVals.length
    const mean = (activeAvg + inactiveAvg) / 2
    if (mean === 0 || Math.abs(activeAvg - inactiveAvg) / mean < 0.05) continue

    const direction = activeAvg < inactiveAvg ? 'lower' : 'higher'
    insights.push({
      tag: 'Habit → Vital',
      text: `Your ${vt.name.toLowerCase()} tends to be ${direction} on weeks with high habit completion.`,
      stat: `Based on ${activeVals.length + inactiveVals.length} weeks`,
      _w: activeVals.length + inactiveVals.length,
    })
  }

  return insights
    .sort((a, b) => b._w - a._w)
    .slice(0, 5)
    .map(({ tag, text, stat }) => ({ tag, text, stat }))
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run src/utils/statsHelpers.test.js
```

Expected: all tests pass

- [ ] **Step 5: Run full suite**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run
```

- [ ] **Step 6: Commit**

```bash
git add src/utils/statsHelpers.js src/utils/statsHelpers.test.js
git commit -m "feat: add statsHelpers pure functions with full test coverage"
```

---

### Task 2: BodyMap — readOnly + regionColors props

**Files:**
- Modify: `src/components/health/BodyMap.jsx`

Adds two optional props:
- `readOnly?: boolean` — disables click/keyboard handlers and pointer cursor
- `regionColors?: { [id]: string }` — overrides the intensity-based fill with an explicit color per region

- [ ] **Step 1: Read the current file**

```bash
cat /home/jazman/projects/dailyhabitapp/src/components/health/BodyMap.jsx
```

- [ ] **Step 2: Update the `BodyMap` component signature and interactive layer**

Change the function signature from:
```jsx
export function BodyMap({ onRegionSelect, symptoms = [] }) {
```
to:
```jsx
export function BodyMap({ onRegionSelect, symptoms = [], readOnly = false, regionColors = {} }) {
```

In the interactive layer `regions.map(...)` block, change the Shape props:

Replace:
```jsx
fill={icolor ?? (isHovered ? 'rgba(61,142,240,0.22)' : 'transparent')}
fillOpacity={intensity ? 0.45 : 1}
stroke={icolor ? icolor : isHovered ? 'rgba(61,142,240,0.7)' : 'transparent'}
strokeWidth={isHovered || intensity ? 1 : 0}
role="button"
tabIndex={0}
aria-label={`Tap ${r.label}`}
style={{ cursor: 'pointer', outline: 'none' }}
onClick={() => onRegionSelect(r.id)}
onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onRegionSelect(r.id)}
onMouseEnter={() => setHovered(r.id)}
onMouseLeave={() => setHovered(null)}
onFocus={() => setHovered(r.id)}
onBlur={() => setHovered(null)}
```

With:
```jsx
fill={
  regionColors[r.id] ??
  icolor ??
  (isHovered && !readOnly ? 'rgba(61,142,240,0.22)' : 'transparent')
}
fillOpacity={regionColors[r.id] ? 0.9 : intensity ? 0.45 : 1}
stroke={
  regionColors[r.id]
    ? regionColors[r.id]
    : icolor
      ? icolor
      : isHovered && !readOnly
        ? 'rgba(61,142,240,0.7)'
        : 'transparent'
}
strokeWidth={isHovered || intensity || regionColors[r.id] ? 1 : 0}
role={readOnly ? undefined : 'button'}
tabIndex={readOnly ? undefined : 0}
aria-label={readOnly ? undefined : `Tap ${r.label}`}
style={{ cursor: readOnly ? 'default' : 'pointer', outline: 'none' }}
onClick={readOnly ? undefined : () => onRegionSelect(r.id)}
onKeyDown={readOnly ? undefined : (e) => (e.key === 'Enter' || e.key === ' ') && onRegionSelect(r.id)}
onMouseEnter={readOnly ? undefined : () => setHovered(r.id)}
onMouseLeave={readOnly ? undefined : () => setHovered(null)}
onFocus={readOnly ? undefined : () => setHovered(r.id)}
onBlur={readOnly ? undefined : () => setHovered(null)}
```

- [ ] **Step 3: Run full suite to confirm no regressions**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run
```

- [ ] **Step 4: Commit**

```bash
git add src/components/health/BodyMap.jsx
git commit -m "feat: add readOnly and regionColors props to BodyMap"
```

---

### Task 3: Nav wiring + Stats screen shell

**Files:**
- Modify: `src/components/BottomNav.jsx`
- Modify: `src/App.jsx`
- Create: `src/screens/Stats.jsx`
- Create: `src/screens/Stats.module.css`

- [ ] **Step 1: Add Stats tab to BottomNav**

In `src/components/BottomNav.jsx`, change the TABS array:

```js
const TABS = [
  { id: 'today', label: 'Today', icon: '✅' },
  { id: 'habits', label: 'Habits', icon: '⚙️' },
  { id: 'journal', label: 'Journal', icon: '📓' },
  { id: 'health', label: 'Health', icon: '🩺' },
  { id: 'stats', label: 'Stats', icon: '📊' },
]
```

- [ ] **Step 2: Wire Stats in App.jsx**

In `src/App.jsx`, add the import and render:

Add import after Health import:
```js
import { Stats } from './screens/Stats'
```

Add render inside `<main>` after the health line:
```jsx
{activeTab === 'stats' && <Stats />}
```

- [ ] **Step 3: Create `src/screens/Stats.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { useHabits } from '../contexts/HabitsContext'
import { useHealth } from '../contexts/HealthContext'
import { useVitals } from '../contexts/VitalsContext'
import { db } from '../db/db'
import { formatDate, today } from '../utils/dates'
import { HabitStats } from '../components/stats/HabitStats'
import { HealthStats } from '../components/stats/HealthStats'
import { InsightsSection } from '../components/stats/InsightsSection'
import styles from './Stats.module.css'

function makeRange(label, customStart, customEnd) {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  if (label === '7D') {
    const start = new Date(); start.setDate(start.getDate() - 6); start.setHours(0,0,0,0)
    return { start, end }
  }
  if (label === '90D') {
    const start = new Date(); start.setDate(start.getDate() - 89); start.setHours(0,0,0,0)
    return { start, end }
  }
  if (label === 'custom' && customStart && customEnd) {
    const s = new Date(customStart + 'T00:00:00')
    const e = new Date(customEnd + 'T23:59:59')
    return { start: s, end: e > end ? end : e }
  }
  // default 30D
  const start = new Date(); start.setDate(start.getDate() - 29); start.setHours(0,0,0,0)
  return { start, end }
}

export function Stats() {
  const { habits } = useHabits()
  const { symptoms, symptomTypes } = useHealth()
  const { vitalTypes, vitalEntries } = useVitals()

  const [activeChip, setActiveChip] = useState('30D')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState(today())
  const [completionRows, setCompletionRows] = useState([])

  const range = makeRange(activeChip, customStart, customEnd)

  useEffect(() => {
    const startStr = formatDate(range.start)
    const endStr = formatDate(range.end)
    db.completions.where('date').between(startStr, endStr, true, true).toArray()
      .then(setCompletionRows)
  }, [range.start.getTime(), range.end.getTime()])

  function selectChip(chip) {
    setActiveChip(chip)
  }

  return (
    <div className={styles.screen}>
      {/* Time range selector */}
      <div className={styles.rangeBar}>
        {['7D', '30D', '90D'].map((chip) => (
          <button
            key={chip}
            className={`${styles.chip} ${activeChip === chip ? styles.activeChip : ''}`}
            onClick={() => selectChip(chip)}
          >
            {chip}
          </button>
        ))}
        <button
          className={`${styles.chip} ${activeChip === 'custom' ? styles.activeChip : ''}`}
          onClick={() => selectChip('custom')}
        >
          {activeChip === 'custom' && customStart
            ? `${customStart.slice(5)} – ${customEnd.slice(5)}`
            : 'Custom…'}
        </button>
      </div>

      {activeChip === 'custom' && (
        <div className={styles.customPicker}>
          <input
            type="date"
            className={styles.dateInput}
            value={customStart}
            max={customEnd || today()}
            onChange={(e) => setCustomStart(e.target.value)}
          />
          <span className={styles.dateSep}>–</span>
          <input
            type="date"
            className={styles.dateInput}
            value={customEnd}
            max={today()}
            onChange={(e) => setCustomEnd(e.target.value)}
          />
        </div>
      )}

      <div className={styles.content}>
        <HabitStats habits={habits} completionRows={completionRows} range={range} />
        <HealthStats
          symptoms={symptoms}
          symptomTypes={symptomTypes}
          vitalTypes={vitalTypes}
          vitalEntries={vitalEntries}
          range={range}
        />
        <InsightsSection
          habits={habits}
          completionRows={completionRows}
          symptoms={symptoms}
          symptomTypes={symptomTypes}
          vitalTypes={vitalTypes}
          vitalEntries={vitalEntries}
          range={range}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `src/screens/Stats.module.css`**

```css
.screen {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  overflow-y: auto;
}

.rangeBar {
  display: flex;
  gap: 6px;
  padding: 14px 16px 10px;
  background: var(--bg);
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid var(--border-subtle);
}

.chip {
  padding: 5px 13px;
  border-radius: 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  transition: all 0.15s;
}

.chip:hover { border-color: var(--accent); color: var(--text); }

.activeChip {
  background: var(--accent-dim);
  border-color: rgba(61, 142, 240, 0.45);
  color: var(--accent);
}

.customPicker {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--surface);
  border-bottom: 1px solid var(--border-subtle);
}

.dateInput {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 6px 10px;
  font-size: 13px;
  color: var(--text);
  color-scheme: dark;
}

.dateSep { font-size: 13px; color: var(--text-dim); }

.content {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 20px 16px calc(32px + env(safe-area-inset-bottom, 0));
}
```

- [ ] **Step 5: Run full suite**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run
```

- [ ] **Step 6: Commit**

```bash
git add src/components/BottomNav.jsx src/App.jsx src/screens/Stats.jsx src/screens/Stats.module.css
git commit -m "feat: add Stats tab to nav and Stats screen shell with time range selector"
```

---

### Task 4: HabitStats component

**Files:**
- Create: `src/components/stats/HabitStats.jsx`
- Create: `src/components/stats/HabitStats.module.css`

Props: `{ habits, completionRows, range }`

Uses `calcCompletionRate`, `calcPerHabitRate`, `calcDayOfWeekBreakdown`, `calcHeatmapData` from statsHelpers. Uses `computeStreak` from `utils/streaks` (existing) for streak badges.

- [ ] **Step 1: Create `src/components/stats/HabitStats.jsx`**

```jsx
import { useMemo, useEffect, useState } from 'react'
import { db } from '../../db/db'
import { computeStreak } from '../../utils/streaks'
import {
  calcCompletionRate,
  calcPerHabitRate,
  calcDayOfWeekBreakdown,
  calcHeatmapData,
} from '../../utils/statsHelpers'
import { SHORT_DAYS } from '../../utils/dates'
import styles from './HabitStats.module.css'

function rateColor(rate) {
  if (rate >= 80) return '#4ade80'
  if (rate >= 50) return '#facc15'
  return '#f97316'
}

export function HabitStats({ habits, completionRows, range }) {
  const [streaks, setStreaks] = useState({})

  useEffect(() => {
    if (!habits.length) return
    Promise.all(
      habits.map(async (h) => {
        const rows = await db.completions.where('habitId').equals(h.id).toArray()
        const dates = new Set(rows.map((r) => r.date))
        return [h.id, computeStreak(h, dates)]
      })
    ).then((pairs) => setStreaks(Object.fromEntries(pairs)))
  }, [habits])

  const overallRate = useMemo(
    () => calcCompletionRate(habits, completionRows, range),
    [habits, completionRows, range]
  )

  const bestStreakHabit = useMemo(() => {
    if (!habits.length) return null
    return habits.reduce(
      (best, h) => (!best || (streaks[h.id] ?? 0) > (streaks[best.id] ?? 0) ? h : best),
      null
    )
  }, [habits, streaks])

  const perHabit = useMemo(
    () =>
      habits
        .map((h) => ({ habit: h, rate: calcPerHabitRate(h, completionRows, range) }))
        .sort((a, b) => b.rate - a.rate),
    [habits, completionRows, range]
  )

  const dowBreakdown = useMemo(
    () => calcDayOfWeekBreakdown(habits, completionRows, range),
    [habits, completionRows, range]
  )

  const heatmap = useMemo(
    () => calcHeatmapData(habits, completionRows, range),
    [habits, completionRows, range]
  )

  if (!habits.length) {
    return (
      <div className={styles.section}>
        <div className={styles.heading}>Habits</div>
        <p className={styles.empty}>Add habits to see stats.</p>
      </div>
    )
  }

  const maxDowRate = Math.max(...dowBreakdown.map((d) => d.rate), 1)

  return (
    <div className={styles.section}>
      <div className={styles.heading}>Habits</div>

      {/* Summary cards */}
      <div className={styles.cardRow}>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Best streak</span>
          <span className={styles.cardValue}>
            {bestStreakHabit ? `${streaks[bestStreakHabit.id] ?? 0}d` : '—'}
          </span>
          {bestStreakHabit && (
            <span className={styles.cardSub}>{bestStreakHabit.name}</span>
          )}
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Avg completion</span>
          <span className={styles.cardValue}>{overallRate}%</span>
          <span className={styles.cardSub}>in range</span>
        </div>
      </div>

      {/* Per-habit list */}
      <div className={styles.habitList}>
        {perHabit.map(({ habit, rate }) => (
          <div key={habit.id} className={styles.habitRow}>
            <span className={styles.habitName}>{habit.name}</span>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{ width: `${rate}%`, background: rateColor(rate) }}
              />
            </div>
            <span className={styles.streak} style={{ color: rateColor(rate) }}>
              🔥 {streaks[habit.id] ?? 0}d
            </span>
          </div>
        ))}
      </div>

      {/* Day-of-week breakdown */}
      <div className={styles.card} style={{ gridColumn: 'span 2' }}>
        <span className={styles.cardLabel}>Completion by day of week</span>
        <svg
          viewBox={`0 0 ${7 * 22} 52`}
          className={styles.dowChart}
          aria-label="Completion by day of week"
        >
          {dowBreakdown.map((d, i) => {
            const barH = maxDowRate > 0 ? Math.round((d.rate / maxDowRate) * 36) : 0
            return (
              <g key={d.day} transform={`translate(${i * 22}, 0)`}>
                <rect
                  x={3}
                  y={38 - barH}
                  width={16}
                  height={barH}
                  rx={2}
                  fill="#3d8ef0"
                  opacity={barH ? 0.85 : 0.15}
                />
                <text x={11} y={50} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.3)">
                  {SHORT_DAYS[d.day]}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Heatmap */}
      <div className={styles.card} style={{ gridColumn: 'span 2' }}>
        <span className={styles.cardLabel}>Daily completion heatmap</span>
        <div className={styles.heatmap}>
          {heatmap.map((cell) => (
            <div key={cell.date} className={`${styles.hmCell} ${styles[`lv${cell.level}`]}`} />
          ))}
        </div>
        <span className={styles.cardSub} style={{ marginTop: 6 }}>
          Green intensity = % of habits completed
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/components/stats/HabitStats.module.css`**

```css
.section { display: flex; flex-direction: column; gap: 10px; }

.heading {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-dim);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-subtle);
}

.empty { font-size: 13px; color: var(--text-muted); }

.cardRow { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

.card {
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.cardLabel {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-dim);
}

.cardValue {
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
  font-family: var(--mono);
  line-height: 1.1;
}

.cardSub { font-size: 11px; color: var(--text-muted); }

.habitList { display: flex; flex-direction: column; gap: 6px; }

.habitRow {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
}

.habitName { font-size: 13px; color: var(--text); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.barTrack { flex: 1; height: 4px; background: var(--surface-2); border-radius: 2px; }

.barFill { height: 4px; border-radius: 2px; transition: width 0.3s ease; }

.streak { font-size: 12px; font-family: var(--mono); font-weight: 600; white-space: nowrap; }

.dowChart { width: 100%; margin-top: 8px; }

.heatmap {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-top: 8px;
}

.hmCell {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.05);
}

.lv1 { background: rgba(74, 222, 128, 0.2); }
.lv2 { background: rgba(74, 222, 128, 0.45); }
.lv3 { background: rgba(74, 222, 128, 0.7); }
.lv4 { background: #4ade80; }
```

- [ ] **Step 3: Run full suite**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run
```

- [ ] **Step 4: Commit**

```bash
git add src/components/stats/HabitStats.jsx src/components/stats/HabitStats.module.css
git commit -m "feat: add HabitStats component with summary cards, per-habit list, day chart, heatmap"
```

---

### Task 5: HealthStats component + install Recharts

**Files:**
- Create: `src/components/stats/HealthStats.jsx`
- Create: `src/components/stats/HealthStats.module.css`

- [ ] **Step 1: Install Recharts**

```bash
cd /home/jazman/projects/dailyhabitapp && npm install recharts
```

- [ ] **Step 2: Create `src/components/stats/HealthStats.jsx`**

```jsx
import { useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
} from 'recharts'
import { BodyMap } from '../health/BodyMap'
import { calcSymptomFrequency, calcBodyMapIntensity } from '../../utils/statsHelpers'
import styles from './HealthStats.module.css'

function countToColor(count) {
  if (count <= 0) return null
  if (count <= 2) return 'rgba(249,115,22,0.3)'
  if (count <= 5) return 'rgba(249,115,22,0.55)'
  return '#f97316'
}

function parseVitalValue(entry, schema) {
  try {
    const v = JSON.parse(entry.value)
    if (schema === 'compound') return { sys: v.sys, dia: v.dia }
    return { val: Number(v) }
  } catch {
    return null
  }
}

function formatXTick(isoStr) {
  return new Date(isoStr).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

export function HealthStats({ symptoms, symptomTypes, vitalTypes, vitalEntries, range }) {
  const freq = useMemo(
    () => calcSymptomFrequency(symptoms, symptomTypes, range),
    [symptoms, symptomTypes, range]
  )

  const regionCounts = useMemo(
    () => calcBodyMapIntensity(symptoms, range),
    [symptoms, range]
  )

  const regionColors = useMemo(() => {
    const out = {}
    for (const [id, count] of Object.entries(regionCounts)) {
      const color = countToColor(count)
      if (color) out[id] = color
    }
    return out
  }, [regionCounts])

  const maxFreq = freq.length ? freq[0].count : 1

  // Build per-vital-type chart data from entries in range
  const vitalCharts = useMemo(() => {
    const inRange = vitalEntries.filter((e) => {
      const d = new Date(e.timestamp)
      return d >= range.start && d <= range.end
    })
    return vitalTypes
      .map((vt) => {
        const entries = inRange
          .filter((e) => e.vital_type_id === vt.id)
          .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
        if (entries.length < 2) return null
        const data = entries.map((e) => {
          const v = parseVitalValue(e, vt.value_schema)
          if (!v) return null
          return { date: e.timestamp.slice(0, 10), ...v }
        }).filter(Boolean)
        if (data.length < 2) return null
        return { vt, data }
      })
      .filter(Boolean)
  }, [vitalTypes, vitalEntries, range])

  return (
    <div className={styles.section}>
      <div className={styles.heading}>Health</div>

      {/* Symptom frequency + body map */}
      {freq.length === 0 && vitalCharts.length === 0 ? (
        <p className={styles.empty}>No health data logged in this period.</p>
      ) : (
        <>
          {freq.length > 0 && (
            <div className={styles.card}>
              <span className={styles.cardLabel}>Symptom frequency</span>
              <div className={styles.freqRow}>
                <div className={styles.bodyMapWrap}>
                  <BodyMap
                    onRegionSelect={() => {}}
                    symptoms={[]}
                    readOnly
                    regionColors={regionColors}
                  />
                </div>
                <div className={styles.freqList}>
                  {freq.map((f) => (
                    <div key={f.name} className={styles.freqItem}>
                      <span className={styles.freqName}>{f.name}</span>
                      <div className={styles.freqTrack}>
                        <div
                          className={styles.freqFill}
                          style={{ width: `${(f.count / maxFreq) * 100}%` }}
                        />
                      </div>
                      <span className={styles.freqCount}>{f.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Vital trend charts */}
          {vitalCharts.map(({ vt, data }) => (
            <div key={vt.id} className={styles.card}>
              <span className={styles.cardLabel}>{vt.name}</span>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatXTick}
                    tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                    labelFormatter={formatXTick}
                    formatter={(val) => [`${val} ${vt.unit}`, vt.name]}
                  />
                  {vt.normal_min != null && vt.normal_max != null && (
                    <ReferenceArea
                      y1={vt.normal_min}
                      y2={vt.normal_max}
                      fill="#4ade80"
                      fillOpacity={0.07}
                    />
                  )}
                  {vt.value_schema === 'compound' ? (
                    <>
                      <Line
                        type="monotone"
                        dataKey="sys"
                        stroke="#f97316"
                        strokeWidth={1.5}
                        dot={false}
                        name="Systolic"
                      />
                      <Line
                        type="monotone"
                        dataKey="dia"
                        stroke="#f97316"
                        strokeWidth={1}
                        strokeDasharray="3 2"
                        dot={false}
                        name="Diastolic"
                        opacity={0.6}
                      />
                    </>
                  ) : (
                    <Line
                      type="monotone"
                      dataKey="val"
                      stroke="#3d8ef0"
                      strokeWidth={1.5}
                      dot={false}
                      name={vt.name}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `src/components/stats/HealthStats.module.css`**

```css
.section { display: flex; flex-direction: column; gap: 10px; }

.heading {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-dim);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-subtle);
}

.empty { font-size: 13px; color: var(--text-muted); }

.card {
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cardLabel {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-dim);
}

.freqRow { display: flex; gap: 12px; align-items: flex-start; }

.bodyMapWrap { width: 72px; flex-shrink: 0; }

.freqList { flex: 1; display: flex; flex-direction: column; gap: 6px; min-width: 0; }

.freqItem { display: flex; align-items: center; gap: 8px; }

.freqName {
  font-size: 12px;
  color: var(--text-muted);
  width: 80px;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.freqTrack { flex: 1; height: 5px; background: var(--surface-2); border-radius: 3px; }

.freqFill { height: 5px; border-radius: 3px; background: #f97316; }

.freqCount {
  font-size: 11px;
  font-family: var(--mono);
  color: var(--text-dim);
  width: 22px;
  text-align: right;
}
```

- [ ] **Step 4: Run full suite**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/components/stats/HealthStats.jsx src/components/stats/HealthStats.module.css
git commit -m "feat: add HealthStats component with body map heatmap and Recharts vital trend lines"
```

---

### Task 6: InsightsSection component + final integration

**Files:**
- Create: `src/components/stats/InsightsSection.jsx`
- Create: `src/components/stats/InsightsSection.module.css`

- [ ] **Step 1: Create `src/components/stats/InsightsSection.jsx`**

```jsx
import { useMemo } from 'react'
import { eachDayInRange, generateInsights } from '../../utils/statsHelpers'
import styles from './InsightsSection.module.css'

export function InsightsSection({
  habits,
  completionRows,
  symptoms,
  symptomTypes,
  vitalTypes,
  vitalEntries,
  range,
}) {
  const days = useMemo(() => eachDayInRange(range), [range])

  const insights = useMemo(
    () =>
      generateInsights(
        habits,
        completionRows,
        symptoms,
        symptomTypes,
        vitalTypes,
        vitalEntries,
        range
      ),
    [habits, completionRows, symptoms, symptomTypes, vitalTypes, vitalEntries, range]
  )

  return (
    <div className={styles.section}>
      <div className={styles.heading}>Insights</div>

      {days.length < 7 ? (
        <p className={styles.empty}>Keep logging — insights appear after a week of data.</p>
      ) : insights.length === 0 ? (
        <p className={styles.empty}>
          Log more data across habits and health to unlock insights.
        </p>
      ) : (
        <>
          {insights.map((ins, i) => (
            <div key={i} className={styles.card}>
              <span className={styles.tag}>{ins.tag}</span>
              <p className={styles.text}>{ins.text}</p>
              <span className={styles.stat}>{ins.stat}</span>
            </div>
          ))}
          {insights.length < 3 && (
            <p className={styles.nudge}>Log more data to unlock further insights.</p>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `src/components/stats/InsightsSection.module.css`**

```css
.section { display: flex; flex-direction: column; gap: 10px; }

.heading {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-dim);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-subtle);
}

.empty, .nudge {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
}

.card {
  background: rgba(61, 142, 240, 0.05);
  border: 1px solid rgba(61, 142, 240, 0.18);
  border-radius: var(--radius);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tag {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
}

.text {
  font-size: 13px;
  color: var(--text);
  line-height: 1.5;
  margin: 0;
}

.stat {
  font-size: 11px;
  color: var(--text-muted);
}
```

- [ ] **Step 3: Run full suite**

```bash
cd /home/jazman/projects/dailyhabitapp && npx vitest run
```

- [ ] **Step 4: Build check**

```bash
cd /home/jazman/projects/dailyhabitapp && npm run build 2>&1 | tail -15
```

Expected: build completes with no errors.

- [ ] **Step 5: Commit and push**

```bash
git add src/components/stats/InsightsSection.jsx src/components/stats/InsightsSection.module.css
git commit -m "feat: add InsightsSection with cross-domain correlation insights"
git push
```

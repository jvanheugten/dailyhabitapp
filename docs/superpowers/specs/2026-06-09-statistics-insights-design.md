# Statistics & Insights — Design Spec (Phase 3)

## Overview

Adds a 5th tab **Stats** to the bottom nav. One scrollable page with three sections: **Habits**, **Health**, and **Insights**. A shared time-range selector at the top (7D / 30D / 90D chips + custom date picker) governs all three sections. All data comes from the existing local Dexie DB — no new tables required.

---

## Navigation

Bottom tab bar gains a 5th tab: **Stats** (📊 icon). Tab order: Today · Habits · Journal · Health · Stats.

---

## Time Range Selector

Sticky bar at the top of the Stats screen. State is local to the screen (not persisted).

| Control | Behaviour |
|---|---|
| `7D` chip | Last 7 days from today |
| `30D` chip | Last 30 days (default) |
| `90D` chip | Last 90 days |
| `Custom…` chip | Opens a native `<input type="date">` date-range picker (start + end). Chip label changes to `Jun 1 – Jun 9` while active. |

One chip is always active. Changing range rerenders all three sections.

---

## Section 1 — Habits

### Summary cards (2-col grid)

| Card | Value |
|---|---|
| Best streak | Longest current streak across all habits, with habit name below |
| Avg completion | `(completions in range ÷ scheduled slots in range) × 100`, rounded to nearest integer |

### Per-habit list

One row per habit, sorted by completion rate descending. Each row shows:
- Habit name
- Horizontal bar: fill width = completion rate in range, colour: ≥80% green `#4ade80`, 50–79% yellow `#facc15`, <50% orange `#f97316`
- Streak badge: 🔥 N days (current streak via existing `computeStreak`)

### Completion by day of week

7-column bar chart (Su–Sa), pure SVG. Bar height = % of scheduled occurrences completed on that day within the range. Bars use accent blue `#3d8ef0`.

### Daily completion heatmap

Grid of day cells, one per day in the selected range. Cell colour intensity based on fraction of habits completed that day: 0% = `rgba(255,255,255,0.05)`, 1–49% = level-1 green, 50–74% = level-2, 75–99% = level-3, 100% = level-4 `#4ade80`. No interaction required — display only.

**Empty state:** if no habits exist, show "Add habits to see stats."

---

## Section 2 — Health

### Symptom frequency + body map

Two-column layout:

**Left:** Mini read-only body map (the existing `BodyMap` component in display-only mode — `onRegionSelect` is a no-op, no toggle). Regions coloured by symptom count in range: 0 = default dark fill, 1–2 = `rgba(249,115,22,0.3)`, 3–5 = `rgba(249,115,22,0.55)`, 6+ = `#f97316`. Front view only.

**Right:** Ranked list of symptom types by frequency in range. Each row: type name, horizontal bar (fill = count / max count), count number. Bar colour = orange `#f97316`.

**Empty state:** "No symptoms logged in this period."

### Vital trend charts

One Recharts `LineChart` per vital type that has ≥2 entries in range. Rendered with:
- X axis: date labels (abbreviated, e.g. "Jun 1")
- Y axis: auto-scaled to data
- Normal range band: if `normal_min` and `normal_max` are set on the vital type, rendered as a `ReferenceArea` in green at 10% opacity
- Blood Pressure: two lines (systolic solid, diastolic dashed), same chart
- Tooltip showing exact value and date on hover/tap

Vital types with fewer than 2 entries in range are skipped entirely (not shown).

**Empty state:** "No vitals logged in this period."

---

## Section 3 — Insights

Algorithmically generated plain-language observations. Each insight is a card with a tag, a sentence, and a supporting stat. Up to 5 insights shown, ranked by confidence (highest sample size first). Cards are display-only.

### Insight types

**Habit → Symptom intensity**
For each symptom type with ≥5 logged instances in range:
- Split days into "high completion" (≥75% of habits done) and "low completion" (<75%)
- Compare average intensity on each group
- If the difference is ≥0.5 and each group has ≥3 data points, emit an insight
- Example: "On days you complete most habits, headache severity is 40% lower on average." (Based on 18 days)

**Day-of-week symptom pattern**
For each symptom type with ≥4 instances in range:
- Find the day of week with the highest count
- If that day accounts for ≥35% of total occurrences, emit an insight
- Example: "Headaches occur most often on Sundays — your lowest habit completion day."

**Vital trend (habit correlation)**
For each vital type with ≥4 entries in range:
- Split weeks into "active weeks" (habit completion ≥75%) and "less active weeks"
- Compare average vital value between groups
- If each group has ≥2 weeks and the difference is ≥5% of the normal range (or ≥5% of mean if no normal range), emit an insight
- Example: "Your resting heart rate trends lower on weeks where Morning run was completed 4+ days."

**No data:** If fewer than 3 insights can be generated, show those that exist plus a note: "Log more data to unlock further insights."

**Minimum data guard:** if the DB has fewer than 7 days of any data, show "Keep logging — insights appear after a week of data."

---

## Architecture

### New files

| File | Purpose |
|---|---|
| `src/screens/Stats.jsx` | Stats screen — time range state, renders all three sections |
| `src/screens/Stats.module.css` | Screen layout, section headings, range chips |
| `src/components/stats/HabitStats.jsx` | Summary cards + per-habit list + day-of-week chart + heatmap |
| `src/components/stats/HabitStats.module.css` | |
| `src/components/stats/HealthStats.jsx` | Body map heatmap display + symptom frequency list + vital trend charts |
| `src/components/stats/HealthStats.module.css` | |
| `src/components/stats/InsightsSection.jsx` | Correlation engine + insight card renderer |
| `src/components/stats/InsightsSection.module.css` | |
| `src/utils/statsHelpers.js` | Pure functions: `calcCompletionRate`, `calcDayOfWeekBreakdown`, `calcSymptomFrequency`, `generateInsights` |
| `src/utils/statsHelpers.test.js` | Unit tests for all pure stat functions |

### Modified files

| File | Change |
|---|---|
| `src/components/BottomNav.jsx` | Add 5th tab: `{ id: 'stats', label: 'Stats', icon: '📊' }` |
| `src/App.jsx` | Render `<Stats />` when active tab is `'stats'` |
| `src/components/health/BodyMap.jsx` | Accept optional `readOnly` prop — when true, disables click handlers and cursor |

### Dependencies

Add `recharts` to `package.json`. It is tree-shakeable; only `LineChart`, `Line`, `XAxis`, `YAxis`, `Tooltip`, `ReferenceArea`, `ResponsiveContainer` are imported.

### Data access

`Stats.jsx` reads directly from the three existing contexts:
- `useHabits()` — `habits`, `completions` (via DB queries in `statsHelpers`)
- `useHealth()` — `symptoms`
- `useVitals()` — `vitalTypes`, `vitalEntries`

No new context is needed. `statsHelpers.js` functions receive raw data arrays and a `{ start, end }` date range object, return derived values. All computation is synchronous and `useMemo`-memoised in the components.

---

## Chart implementation

| Chart | Implementation |
|---|---|
| Per-habit completion bars | Pure CSS (`width` as inline style) |
| Day-of-week bars | Inline SVG, 7 `<rect>` elements |
| Daily heatmap | CSS grid of `<div>` elements, colour via `className` |
| Symptom frequency bars | Pure CSS |
| Vital trend lines | Recharts `LineChart` + `ResponsiveContainer` |
| Body map display | Existing `BodyMap` component with `readOnly` prop |

---

## Pure stat functions (`src/utils/statsHelpers.js`)

### `calcCompletionRate(habits, completionRows, range)`
- `habits`: array of habit objects
- `completionRows`: array of `{ habitId, date }` from DB
- `range`: `{ start: Date, end: Date }`
- Returns: `number` 0–100

### `calcDayOfWeekBreakdown(habits, completionRows, range)`
- Returns: array of 7 objects `{ day: 0–6, rate: number 0–100 }`

### `calcHeatmapData(habits, completionRows, range)`
- Returns: array of `{ date: string, level: 0–4 }` for each day in range

### `calcSymptomFrequency(symptoms, range)`
- Returns: array of `{ name: string, count: number }` sorted descending by count

### `calcBodyMapIntensity(symptoms, range)`
- Returns: object `{ [regionId]: count }` — count of symptoms per region in range

### `generateInsights(habits, completionRows, symptoms, vitalTypes, vitalEntries, range)`
- Returns: array of `{ tag: string, text: string, stat: string }` up to 5 items, sorted by confidence

---

## Testing

All functions in `statsHelpers.js` are pure and fully unit-tested in `statsHelpers.test.js`. Component tests are not required — the logic lives in the helpers.

Test cases must cover:
- `calcCompletionRate`: 0%, 100%, partial, no habits, empty range
- `calcDayOfWeekBreakdown`: correct slot counting respecting habit `days` field
- `calcHeatmapData`: correct level assignment at boundaries (0%, 49%, 50%, 75%, 100%)
- `calcSymptomFrequency`: empty, single type, multiple types sorted correctly
- `calcBodyMapIntensity`: correct region count aggregation
- `generateInsights`: emits correct insight when threshold met, suppresses when not, minimum data guard

---

## Empty & loading states

- Each section independently shows its own empty state if data is absent
- No loading spinners — all data is synchronous from in-memory context state
- Recharts charts are only rendered when ≥2 data points exist for that vital type

---

## Responsive / mobile

- All charts and grids use `width: 100%` / `ResponsiveContainer`
- Day-of-week chart: SVG `viewBox` scales with container
- Heatmap cells: fixed size 18×18px with flex-wrap — overflows naturally for 90-day ranges
- Bottom safe area padding on the scrollable page (`env(safe-area-inset-bottom)`)

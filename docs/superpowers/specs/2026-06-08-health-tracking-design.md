# Health Tracking — Design Spec (Phase 2)

## Overview

Adds a Health tab to the Daily Habit App for logging symptoms with a body map, recording vitals, and importing data from Google Fit. All data is stored locally in IndexedDB (Dexie). No backend required.

---

## Navigation

Bottom tab bar gains a 4th tab: **Health** (🩺 icon). Tab order: Today · Habits · Journal · Health.

---

## Data Model

Four new Dexie tables added to the existing `db.version(2)` schema:

### `symptom_types`
| Field | Type | Notes |
|---|---|---|
| `id` | auto-increment | primary key |
| `name` | string | e.g. "Headache", "Nausea" |
| `createdAt` | ISO string | |

### `symptoms`
| Field | Type | Notes |
|---|---|---|
| `id` | auto-increment | primary key |
| `symptom_type_id` | number | FK → symptom_types.id |
| `region` | string | 'head' \| 'chest' \| 'abdomen' \| 'back' \| 'left_arm' \| 'right_arm' \| 'left_leg' \| 'right_leg' |
| `view` | string | 'front' \| 'back' \| 'left' \| 'right' |
| `svg_paths` | string | JSON array of SVG path `d` strings drawn by user |
| `intensity` | number | 1–5 (1=Minimal, 2=Mild, 3=Moderate, 4=Severe, 5=Extreme) |
| `pain_type` | string | JSON array of strings — e.g. `["throbbing","sharp"]` (multi-select) |
| `notes` | string | optional free text |
| `timestamp` | ISO string | when symptom was recorded |

Indexes: `symptom_type_id`, `timestamp`, `region`.

### `vital_types`
| Field | Type | Notes |
|---|---|---|
| `id` | auto-increment | primary key |
| `name` | string | e.g. "Blood Pressure", "Heart Rate" |
| `unit` | string | e.g. "mmHg", "bpm", "kg" |
| `value_schema` | string | 'single' \| 'compound' — compound for BP (systolic + diastolic) |
| `is_standard` | boolean | true = seeded at install, false = user-created |
| `normal_min` | number \| null | optional reference range |
| `normal_max` | number \| null | |
| `createdAt` | ISO string | |

**Seeded standard vital types:**

| Name | Unit | Schema |
|---|---|---|
| Blood Pressure | mmHg | compound (systolic + diastolic) |
| Blood Sugar | mmol/L | single |
| Heart Rate | bpm | single |
| Weight | kg | single |
| Temperature | °C | single |
| Oxygen Saturation | % | single |

### `vital_entries`
| Field | Type | Notes |
|---|---|---|
| `id` | auto-increment | primary key |
| `vital_type_id` | number | FK → vital_types.id |
| `value` | string | JSON — single: `"72"`, compound: `{"sys":120,"dia":80}` |
| `notes` | string | optional |
| `timestamp` | ISO string | |
| `source` | string | 'manual' \| 'google_fit' |

Indexes: `vital_type_id`, `timestamp`, `source`.

### `google_fit_sync`
| Field | Type | Notes |
|---|---|---|
| `id` | auto-increment | primary key |
| `data_type` | string | Google Fit data type name |
| `last_synced` | ISO string | |
| `access_token` | string | stored locally, expires in 1h |
| `refresh_token` | string | used to get new access tokens |

---

## Intensity Scale

| Value | Label | Body map colour |
|---|---|---|
| 1 | Minimal | Green `#4ade80` |
| 2 | Mild | Yellow-green `#a3e635` |
| 3 | Moderate | Yellow `#facc15` |
| 4 | Severe | Orange `#f97316` |
| 5 | Extreme | Red `#ef4444` |

---

## Screens

### Health Screen (root)

Segmented control at top: **Overview** / **History**.

**Overview tab:**
- Mini full-body SVG showing symptoms from the past 7 days as coloured dots (intensity colour, clustered per region).
- Recent vitals list: last recorded value per vital type with timestamp.
- Two action buttons: **Log Symptom** / **Log Vital**.
- **Google Fit Sync** button with last-synced timestamp.

**History tab:**
- Reverse-chronological list of all health events (symptoms + vitals interleaved).
- Each row shows: timestamp, type name, value/intensity label.
- Filter chips: All · Symptoms · Vitals · Google Fit.

---

### Log Symptom Flow (3-step bottom sheet)

**Step 1 — Body Map**
- Full-body SVG with front/back toggle.
- Detailed anatomical outline with 8 tappable regions (head, chest, abdomen, back, left arm, right arm, left leg, right leg).
- Existing symptoms shown as coloured dots.
- Tap a region → advances to Step 2.

**Step 2 — Draw**
- Region-specific detailed SVG with 4-view selector (Front / Back / Left / Right; anatomically irrelevant views hidden per region).
- Touch events recorded as SVG `<path>` elements using Bézier smoothing (cubic bezier via Catmull-Rom conversion).
- Brush colour corresponds to currently selected intensity.
- Draw/erase toggle. Clear button resets paths for current view.
- Intensity picker (1–5 with name labels) displayed below the drawing area.
- Advances to Step 3 via "Next" button.

**Step 3 — Details**
- Symptom type picker: scrollable list of existing types + "Add new" inline.
- Pain quality selector: Throbbing / Sharp / Dull / Burning / Aching (multi-select allowed).
- Optional notes field.
- Timestamp defaults to now; tappable to edit.
- **Save** button — writes to `symptoms` table.

---

### Log Vital Sheet (single-step bottom sheet)

- Vital type picker (standard 6 + user-created custom types).
- Value input: single number field for most; two fields (systolic/diastolic) for Blood Pressure.
- Normal range indicator shown if `normal_min`/`normal_max` set.
- Optional notes field.
- Timestamp defaults to now; tappable to edit.
- **Manage types** link → opens `VitalTypeForm` to add/edit custom types.

---

### VitalTypeForm

- Name input, unit input, single/compound toggle, optional normal range (min/max).
- Delete button for user-created types (standard types cannot be deleted).

---

### Google Fit Sync

- "Connect Google Fit" button triggers OAuth popup via Google Identity Services.
- On success, fetches all available data types:
  - Steps (→ stored as custom vital "Steps")
  - Active minutes (→ "Active Minutes")
  - Calories burned (→ "Calories")
  - Heart rate (→ Heart Rate vital_entries)
  - Sleep duration (→ "Sleep Duration")
  - Weight (→ Weight vital_entries)
  - Blood pressure (→ Blood Pressure vital_entries, if available)
  - Blood glucose (→ Blood Sugar vital_entries, if available)
  - Oxygen saturation (→ Oxygen Saturation vital_entries, if available)
- Entries marked `source: 'google_fit'`.
- Subsequent syncs are incremental (only fetches data since `last_synced`).
- Tokens stored in `google_fit_sync` table locally.

---

## SVG Body Assets

Static SVG files in `src/assets/body/` — one per region × applicable views:

```
src/assets/body/
  full-front.svg
  full-back.svg
  head-front.svg   head-back.svg   head-left.svg   head-right.svg
  chest-front.svg  chest-back.svg  chest-left.svg  chest-right.svg
  abdomen-front.svg  abdomen-back.svg
  back-front.svg   back-back.svg   back-left.svg   back-right.svg
  left_arm-front.svg  left_arm-back.svg  left_arm-left.svg  left_arm-right.svg
  right_arm-front.svg right_arm-back.svg right_arm-left.svg right_arm-right.svg
  left_leg-front.svg  left_leg-back.svg  left_leg-left.svg  left_leg-right.svg
  right_leg-front.svg right_leg-back.svg right_leg-left.svg right_leg-right.svg
```

SVG outlines are swappable without touching logic. Placeholder outlines ship with the implementation; anatomically refined versions can be dropped in later.

---

## Architecture

```
src/
  contexts/
    HealthContext.jsx        # symptom_types + symptoms CRUD
    VitalsContext.jsx        # vital_types + vital_entries CRUD
  services/
    googleFit.js             # OAuth + REST API, maps responses to vital_entries
  screens/
    Health.jsx               # 4th tab root, segmented Overview/History
  components/health/
    BodyMap.jsx              # full-body SVG, front/back toggle, region tap
    BodyRegion.jsx           # drill-down SVG per region, 4-view selector
    DrawingCanvas.jsx        # SVG path recording from touch events + Bézier smoothing
    IntensityPicker.jsx      # 1–5 named scale with colour coding
    LogSymptomSheet.jsx      # 3-step bottom sheet orchestrator
    LogVitalSheet.jsx        # vital entry form
    VitalTypeForm.jsx        # create/edit custom vital types
    GoogleFitSync.jsx        # OAuth button + sync status display
  assets/body/               # static SVG region outlines (swappable)
```

State flows: screens read from `HealthContext` / `VitalsContext` → contexts call Dexie → screens never touch DB directly.

---

## Tech Notes

- **SVG path smoothing:** Catmull-Rom spline → cubic Bézier conversion for natural-feeling drawn lines. Input: array of `{x, y}` touch points. Output: SVG `d` string.
- **Google Identity Services:** `accounts.google.com/gsi/client` script. Scopes: `fitness.activity.read`, `fitness.body.read`, `fitness.sleep.read`, `fitness.blood_pressure.read`, `fitness.blood_glucose.read`, `fitness.oxygen_saturation.read`.
- **Dexie migration:** Existing DB is version 1. Health tables added in `db.version(2)`. Seeded vital types inserted in version 2 upgrade hook.

---

## Out of Scope (Phase 2)

- Correlation/statistics analysis (Phase 3)
- Symptom export (Phase 4)
- LLM health queries (Phase 5)
- Medication tracking
- Doctor visit logs

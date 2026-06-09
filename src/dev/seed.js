import { db, ensureVitalTypesSeeded } from '../db/db'

function pad(n) {
  return String(n).padStart(2, '0')
}

function isoDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function daysAgo(n, hour = 12) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, 0, 0, 0)
  return d
}

function rnd(min, max) {
  return min + Math.random() * (max - min)
}

function rndInt(min, max) {
  return Math.floor(rnd(min, max + 1))
}

export async function seedDevData() {
  console.log('[seed] Clearing existing data...')
  await db.habits.clear()
  await db.completions.clear()
  await db.symptom_types.clear()
  await db.symptoms.clear()
  await db.vital_entries.clear()
  await ensureVitalTypesSeeded()

  // ── HABITS ────────────────────────────────────────────────────────────────
  const HABIT_DEFS = [
    { name: 'Morning run', days: [1, 2, 3, 4, 5] },
    { name: 'Read 20 min', days: [0, 1, 2, 3, 4, 5, 6] },
    { name: 'Meditate', days: [1, 2, 3, 4, 5, 6] },
    { name: 'Drink 2L water', days: [0, 1, 2, 3, 4, 5, 6] },
  ]

  const habitIds = []
  for (const h of HABIT_DEFS) {
    const id = await db.habits.add({ ...h, createdAt: daysAgo(60).toISOString() })
    habitIds.push(id)
  }

  // ── COMPLETIONS (45 days, weekdays ~85%, weekends ~35%) ───────────────────
  const completions = []
  for (let i = 0; i <= 44; i++) {
    const date = daysAgo(i)
    const dow = date.getDay()
    const isWeekend = dow === 0 || dow === 6
    const rate = isWeekend ? 0.35 : 0.85

    HABIT_DEFS.forEach((h, hi) => {
      if (!h.days.includes(dow)) return
      if (Math.random() < rate) {
        const d = new Date(date)
        d.setHours(rndInt(6, 9), rndInt(0, 59), 0, 0)
        completions.push({
          habitId: habitIds[hi],
          date: isoDate(date),
          completedAt: d.toISOString(),
        })
      }
    })
  }
  await db.completions.bulkAdd(completions)

  // ── SYMPTOM TYPES ─────────────────────────────────────────────────────────
  const now = new Date().toISOString()
  const [headacheId, backPainId, fatigueId, kneePainId] = await Promise.all([
    db.symptom_types.add({ name: 'Headache', createdAt: now }),
    db.symptom_types.add({ name: 'Back pain', createdAt: now }),
    db.symptom_types.add({ name: 'Fatigue', createdAt: now }),
    db.symptom_types.add({ name: 'Knee pain', createdAt: now }),
  ])

  // ── SYMPTOMS ──────────────────────────────────────────────────────────────
  const symptoms = []

  // Headaches: Sundays (intensity 4) + a few weekday ones (intensity 2).
  // Pattern triggers both the day-of-week and habit→symptom insights.
  for (let i = 0; i <= 44; i++) {
    const d = daysAgo(i, 14)
    const dow = d.getDay()
    if (dow === 0) {
      // Sunday headache — high intensity (low habit completion day)
      symptoms.push({
        symptom_type_id: headacheId,
        region: 'head',
        view: 'front',
        svg_paths: JSON.stringify([]),
        intensity: 4,
        pain_type: JSON.stringify(['Throbbing']),
        notes: '',
        timestamp: d.toISOString(),
      })
    } else if ([3, 10, 17, 24].includes(i) && dow !== 6) {
      // Occasional weekday headache — low intensity (high habit completion day)
      symptoms.push({
        symptom_type_id: headacheId,
        region: 'head',
        view: 'front',
        svg_paths: JSON.stringify([]),
        intensity: 2,
        pain_type: JSON.stringify(['Dull']),
        notes: '',
        timestamp: d.toISOString(),
      })
    }
  }

  // Back pain: scattered, region = back
  for (const i of [2, 6, 13, 20, 27, 35, 42]) {
    symptoms.push({
      symptom_type_id: backPainId,
      region: 'back',
      view: 'back',
      svg_paths: JSON.stringify([]),
      intensity: rndInt(2, 4),
      pain_type: JSON.stringify(['Aching', 'Dull']),
      notes: '',
      timestamp: daysAgo(i, 16).toISOString(),
    })
  }

  // Fatigue: Mondays (after weekends)
  for (let i = 0; i <= 44; i++) {
    const d = daysAgo(i, 10)
    if (d.getDay() === 1 && Math.random() < 0.6) {
      symptoms.push({
        symptom_type_id: fatigueId,
        region: 'chest',
        view: 'front',
        svg_paths: JSON.stringify([]),
        intensity: rndInt(2, 3),
        pain_type: JSON.stringify([]),
        notes: '',
        timestamp: d.toISOString(),
      })
    }
  }

  // Knee pain: after run days
  for (const i of [5, 12, 19, 26, 38]) {
    symptoms.push({
      symptom_type_id: kneePainId,
      region: 'left_leg',
      view: 'front',
      svg_paths: JSON.stringify([]),
      intensity: rndInt(2, 4),
      pain_type: JSON.stringify(['Sharp']),
      notes: '',
      timestamp: daysAgo(i, 18).toISOString(),
    })
  }

  await db.symptoms.bulkAdd(symptoms)

  // ── VITALS ────────────────────────────────────────────────────────────────
  const vitalTypes = await db.vital_types.toArray()
  const hrType = vitalTypes.find((t) => t.name === 'Heart Rate')
  const weightType = vitalTypes.find((t) => t.name === 'Weight')
  const bpType = vitalTypes.find((t) => t.name === 'Blood Pressure')

  const vitals = []

  // Heart rate: every other day. Lower (~66) on weekdays (high completion),
  // higher (~78) on weekends. This triggers the Habit→Vital insight.
  for (let i = 0; i <= 44; i += 2) {
    const d = daysAgo(i, 8)
    const isWeekend = d.getDay() === 0 || d.getDay() === 6
    const hr = isWeekend ? rndInt(74, 82) : rndInt(63, 70)
    vitals.push({
      vital_type_id: hrType.id,
      value: JSON.stringify(hr),
      notes: '',
      timestamp: d.toISOString(),
      source: 'manual',
    })
  }

  // Weight: every 3 days, slight downward trend from 75.4 → ~73.2
  let weight = 75.4
  for (let i = 0; i <= 44; i += 3) {
    weight -= rnd(0.04, 0.12)
    vitals.push({
      vital_type_id: weightType.id,
      value: JSON.stringify(Math.round(weight * 10) / 10),
      notes: '',
      timestamp: daysAgo(i, 7).toISOString(),
      source: 'manual',
    })
  }

  // Blood pressure: once a week
  for (let i = 0; i <= 44; i += 7) {
    vitals.push({
      vital_type_id: bpType.id,
      value: JSON.stringify({ sys: rndInt(112, 126), dia: rndInt(72, 82) }),
      notes: '',
      timestamp: daysAgo(i, 9).toISOString(),
      source: 'manual',
    })
  }

  await db.vital_entries.bulkAdd(vitals)

  console.log(
    `[seed] Done. Habits: ${habitIds.length} · Completions: ${completions.length} · Symptoms: ${symptoms.length} · Vitals: ${vitals.length}`
  )
  console.log('[seed] Reloading page to refresh contexts...')
  setTimeout(() => window.location.reload(), 500)
}

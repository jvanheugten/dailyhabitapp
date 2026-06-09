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
  let scheduled = 0,
    done = 0
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
  let scheduled = 0,
    done = 0
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

// Returns { [dateStr]: { count, maxIntensity } } for one symptom type in range
export function calcSymptomHeatmapData(symptoms, symptomTypeId, range) {
  const out = {}
  for (const s of symptoms) {
    if (s.symptom_type_id !== symptomTypeId) continue
    const d = new Date(s.timestamp)
    if (d < range.start || d > range.end) continue
    const key = s.timestamp.slice(0, 10)
    if (!out[key]) out[key] = { count: 0, maxIntensity: 0 }
    out[key].count++
    out[key].maxIntensity = Math.max(out[key].maxIntensity, s.intensity ?? 1)
  }
  return out
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

// Returns { [regionName]: { count, maxIntensity } } for symptoms in range
export function calcRegionStats(symptoms, range) {
  const stats = {}
  for (const s of symptoms) {
    if (range && !inRange(s.timestamp, range)) continue
    const r = s.region
    if (!r) continue
    if (!stats[r]) stats[r] = { count: 0, maxIntensity: 0 }
    stats[r].count++
    stats[r].maxIntensity = Math.max(stats[r].maxIntensity, s.intensity ?? 1)
  }
  return stats
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
    if (!scheduled.length) {
      dailyRate[dateStr] = null
      continue
    }
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
    const high = [],
      low = []
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
      } catch {
        /* skip */
      }
    }

    const activeVals = [],
      inactiveVals = []
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

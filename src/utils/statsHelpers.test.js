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
function mkHabit(id, days) {
  return { id, name: `Habit ${id}`, days }
}
function mkCompletion(habitId, date) {
  return { habitId, date }
}
function mkSymptom(id, typeId, region, intensity, timestamp) {
  return { id, symptom_type_id: typeId, region, intensity, timestamp }
}
function mkSymptomType(id, name) {
  return { id, name }
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
    // Mon-only habit (day=1), range is Mon Jun 1 only
    const habit = mkHabit(1, [1])
    const comp = mkCompletion(1, '2026-06-01')
    expect(calcCompletionRate([habit], [comp], mkRange('2026-06-01', '2026-06-01'))).toBe(100)
  })
  it('returns 0 when nothing completed', () => {
    const habit = mkHabit(1, [1])
    expect(calcCompletionRate([habit], [], mkRange('2026-06-01', '2026-06-01'))).toBe(0)
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
    const comps = [
      mkCompletion(1, '2026-06-01'),
      mkCompletion(1, '2026-06-02'),
      mkCompletion(2, '2026-06-03'),
    ]
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
    expect(result.find((r) => r.day === 0).rate).toBe(0) // Sunday unscheduled
  })
  it('gives 100 rate for a day where all completions done', () => {
    const habit = mkHabit(1, [1]) // Mon only, Jun 1 is Monday
    const comps = [mkCompletion(1, '2026-06-01')]
    const result = calcDayOfWeekBreakdown([habit], comps, mkRange('2026-06-01', '2026-06-01'))
    expect(result.find((r) => r.day === 1).rate).toBe(100)
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
    const habit = mkHabit(1, [1]) // Jun 1 is Monday
    const comps = [mkCompletion(1, '2026-06-01')]
    const result = calcHeatmapData([habit], comps, mkRange('2026-06-01', '2026-06-01'))
    expect(result[0].level).toBe(4)
  })
  it('level 2 for exactly 50%', () => {
    const h1 = mkHabit(1, [1]),
      h2 = mkHabit(2, [1]) // both Monday
    const comps = [mkCompletion(1, '2026-06-01')] // only h1 done = 50%
    const result = calcHeatmapData([h1, h2], comps, mkRange('2026-06-01', '2026-06-01'))
    expect(result[0].level).toBe(2) // 50% = level 2
  })
  it('level 1 for 1–49%', () => {
    const habits = [mkHabit(1, [1]), mkHabit(2, [1]), mkHabit(3, [1]), mkHabit(4, [1])]
    const comps = [mkCompletion(1, '2026-06-01')] // 1/4 = 25%
    const result = calcHeatmapData(habits, comps, mkRange('2026-06-01', '2026-06-01'))
    expect(result[0].level).toBe(1)
  })
  it('level 3 for 75–99%', () => {
    const habits = [mkHabit(1, [1]), mkHabit(2, [1]), mkHabit(3, [1]), mkHabit(4, [1])]
    const comps = [
      mkCompletion(1, '2026-06-01'),
      mkCompletion(2, '2026-06-01'),
      mkCompletion(3, '2026-06-01'),
    ]
    // 3/4 = 75% → level 3
    const result = calcHeatmapData(habits, comps, mkRange('2026-06-01', '2026-06-01'))
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
    const habit = mkHabit(1, [0, 1, 2, 3, 4, 5, 6])
    const comps = []
    for (const d of ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05']) {
      comps.push(mkCompletion(1, d))
    }
    const symptomTypes = [mkSymptomType(1, 'Headache')]
    const symptoms = [
      mkSymptom(1, 1, 'head', 1, '2026-06-01T10:00:00.000Z'),
      mkSymptom(2, 1, 'head', 1, '2026-06-02T10:00:00.000Z'),
      mkSymptom(3, 1, 'head', 1, '2026-06-03T10:00:00.000Z'),
      mkSymptom(4, 1, 'head', 4, '2026-06-06T10:00:00.000Z'),
      mkSymptom(5, 1, 'head', 4, '2026-06-07T10:00:00.000Z'),
      mkSymptom(6, 1, 'head', 4, '2026-06-08T10:00:00.000Z'),
    ]
    const result = generateInsights(
      [habit],
      comps,
      symptoms,
      symptomTypes,
      [],
      [],
      mkRange('2026-06-01', '2026-06-14')
    )
    const insight = result.find((i) => i.tag === 'Habit → Symptom')
    expect(insight).toBeDefined()
    expect(insight.text).toContain('headache')
  })

  it('emits day-of-week insight when ≥35% on one day', () => {
    const symptomTypes = [mkSymptomType(1, 'Headache')]
    const symptoms = [
      mkSymptom(1, 1, 'head', 2, '2026-06-07T10:00:00.000Z'), // Sun
      mkSymptom(2, 1, 'head', 2, '2026-06-14T10:00:00.000Z'), // Sun
      mkSymptom(3, 1, 'head', 2, '2026-06-21T10:00:00.000Z'), // Sun
      mkSymptom(4, 1, 'head', 2, '2026-06-01T10:00:00.000Z'), // Mon
      mkSymptom(5, 1, 'head', 2, '2026-06-02T10:00:00.000Z'), // Tue
      mkSymptom(6, 1, 'head', 2, '2026-06-03T10:00:00.000Z'), // Wed
    ]
    const result = generateInsights(
      [],
      [],
      symptoms,
      symptomTypes,
      [],
      [],
      mkRange('2026-06-01', '2026-06-30')
    )
    const insight = result.find((i) => i.tag === 'Symptom pattern')
    expect(insight).toBeDefined()
    expect(insight.text).toContain('Headache')
    expect(insight.text).toContain('Sunday')
  })

  it('returns at most 5 insights', () => {
    const result = generateInsights([], [], [], [], [], [], mkRange('2026-06-01', '2026-06-30'))
    expect(result.length).toBeLessThanOrEqual(5)
  })
})

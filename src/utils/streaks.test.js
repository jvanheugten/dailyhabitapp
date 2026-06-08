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

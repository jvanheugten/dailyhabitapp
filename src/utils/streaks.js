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

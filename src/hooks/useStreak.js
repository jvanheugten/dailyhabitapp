import { useState, useEffect } from 'react'
import { useHabits } from '../contexts/HabitsContext'
import { computeStreak } from '../utils/streaks'

export function useStreak(habit) {
  const { getCompletedDates, completions } = useHabits()
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    if (!habit?.id) return
    getCompletedDates(habit.id).then((dates) => {
      setStreak(computeStreak(habit, dates))
    })
  }, [habit, getCompletedDates, completions])

  return streak
}

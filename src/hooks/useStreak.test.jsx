import { renderHook, act } from '@testing-library/react'
import { HabitsProvider, useHabits } from '../contexts/HabitsContext'
import { useStreak } from './useStreak'
import { db } from '../db/db'
import { formatDate } from '../utils/dates'

beforeEach(async () => {
  await db.habits.clear()
  await db.completions.clear()
})

const wrapper = ({ children }) => <HabitsProvider>{children}</HabitsProvider>

test('streak is 0 for a habit with no completions', async () => {
  const { result } = renderHook(() => {
    const { addHabit } = useHabits()
    return { addHabit }
  }, { wrapper })

  let habit
  await act(async () => {
    habit = await result.current.addHabit({ name: 'Run', days: [0,1,2,3,4,5,6], time: null, notifyEnabled: false })
  })

  const { result: streakResult } = renderHook(() => useStreak(habit), { wrapper })
  await act(async () => {})
  expect(streakResult.current).toBe(0)
})

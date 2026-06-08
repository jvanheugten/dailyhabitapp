import { renderHook, act } from '@testing-library/react'
import { HabitsProvider, useHabits } from './HabitsContext'
import { db } from '../db/db'

beforeEach(async () => {
  await db.habits.clear()
  await db.completions.clear()
  await db.notification_prefs.clear()
})

const wrapper = ({ children }) => <HabitsProvider>{children}</HabitsProvider>

test('habits starts empty', async () => {
  const { result } = renderHook(() => useHabits(), { wrapper })
  // Wait for initial load
  await act(async () => {})
  expect(result.current.habits).toEqual([])
})

test('addHabit adds to db and updates state', async () => {
  const { result } = renderHook(() => useHabits(), { wrapper })
  await act(async () => {
    await result.current.addHabit({
      name: 'Meditate',
      days: [1, 2, 3],
      time: null,
      notifyEnabled: false,
    })
  })
  expect(result.current.habits).toHaveLength(1)
  expect(result.current.habits[0].name).toBe('Meditate')
})

test('updateHabit updates name in state and db', async () => {
  const { result } = renderHook(() => useHabits(), { wrapper })
  let habit
  await act(async () => {
    habit = await result.current.addHabit({
      name: 'Run',
      days: [1],
      time: null,
      notifyEnabled: false,
    })
  })
  await act(async () => {
    await result.current.updateHabit(habit.id, { name: 'Morning Run' })
  })
  expect(result.current.habits[0].name).toBe('Morning Run')
})

test('deleteHabit removes from state and db', async () => {
  const { result } = renderHook(() => useHabits(), { wrapper })
  let habit
  await act(async () => {
    habit = await result.current.addHabit({
      name: 'Vitamins',
      days: [0, 1, 2, 3, 4, 5, 6],
      time: null,
      notifyEnabled: false,
    })
  })
  await act(async () => {
    await result.current.deleteHabit(habit.id)
  })
  expect(result.current.habits).toHaveLength(0)
})

test('toggleCompletion adds then removes a completion', async () => {
  const { result } = renderHook(() => useHabits(), { wrapper })
  let habit
  await act(async () => {
    habit = await result.current.addHabit({
      name: 'Run',
      days: [0, 1, 2, 3, 4, 5, 6],
      time: null,
      notifyEnabled: false,
    })
  })
  await act(async () => {
    await result.current.toggleCompletion(habit.id)
  })
  expect(result.current.completions[habit.id]).toBe(true)

  await act(async () => {
    await result.current.toggleCompletion(habit.id)
  })
  expect(result.current.completions[habit.id]).toBeUndefined()
})

test('getCompletedDates returns Set of dates for a habit', async () => {
  const { result } = renderHook(() => useHabits(), { wrapper })
  let habit
  await act(async () => {
    habit = await result.current.addHabit({
      name: 'Run',
      days: [0, 1, 2, 3, 4, 5, 6],
      time: null,
      notifyEnabled: false,
    })
    await result.current.toggleCompletion(habit.id)
  })
  const dates = await result.current.getCompletedDates(habit.id)
  expect(dates.size).toBe(1)
})

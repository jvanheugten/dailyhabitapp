import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { db } from '../db/db'
import { today } from '../utils/dates'

const HabitsContext = createContext(null)

export function HabitsProvider({ children }) {
  const [habits, setHabits] = useState([])
  const [selectedDate, setSelectedDate] = useState(today())
  const [completions, setCompletions] = useState({}) // { [habitId]: true }

  useEffect(() => {
    db.habits.orderBy('createdAt').toArray().then(setHabits)
  }, [])

  useEffect(() => {
    db.completions
      .where('date').equals(selectedDate)
      .toArray()
      .then(rows => {
        const map = {}
        rows.forEach(r => { map[r.habitId] = true })
        setCompletions(map)
      })
  }, [selectedDate])

  const addHabit = useCallback(async (data) => {
    const id = await db.habits.add({ ...data, createdAt: new Date().toISOString() })
    const habit = await db.habits.get(id)
    setHabits(prev => [...prev, habit])
    return habit
  }, [])

  const updateHabit = useCallback(async (id, data) => {
    await db.habits.update(id, data)
    setHabits(prev => prev.map(h => h.id === id ? { ...h, ...data } : h))
  }, [])

  const deleteHabit = useCallback(async (id) => {
    await db.transaction('rw', db.habits, db.completions, db.notification_prefs, async () => {
      await db.habits.delete(id)
      await db.completions.where('habitId').equals(id).delete()
      await db.notification_prefs.delete(id)
    })
    setHabits(prev => prev.filter(h => h.id !== id))
    setCompletions(prev => { const next = { ...prev }; delete next[id]; return next })
  }, [])

  const toggleCompletion = useCallback(async (habitId) => {
    if (completions[habitId]) {
      await db.completions.where('[habitId+date]').equals([habitId, selectedDate]).delete()
      setCompletions(prev => { const next = { ...prev }; delete next[habitId]; return next })
    } else {
      await db.completions.add({ habitId, date: selectedDate, completedAt: new Date().toISOString() })
      setCompletions(prev => ({ ...prev, [habitId]: true }))
    }
  }, [completions, selectedDate])

  const getCompletedDates = useCallback(async (habitId) => {
    const rows = await db.completions.where('habitId').equals(habitId).toArray()
    return new Set(rows.map(r => r.date))
  }, [])

  return (
    <HabitsContext.Provider value={{
      habits, selectedDate, completions,
      setSelectedDate, addHabit, updateHabit, deleteHabit, toggleCompletion, getCompletedDates,
    }}>
      {children}
    </HabitsContext.Provider>
  )
}

export function useHabits() {
  const ctx = useContext(HabitsContext)
  if (!ctx) throw new Error('useHabits must be used within HabitsProvider')
  return ctx
}

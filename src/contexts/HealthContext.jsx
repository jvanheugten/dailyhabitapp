import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { db } from '../db/db'

const HealthContext = createContext(null)

export function HealthProvider({ children }) {
  const [symptomTypes, setSymptomTypes] = useState([])
  const [symptoms, setSymptoms] = useState([])

  useEffect(() => {
    db.symptom_types.orderBy('name').toArray().then(setSymptomTypes)
    db.symptoms.orderBy('timestamp').reverse().toArray().then(setSymptoms)
  }, [])

  const addSymptomType = useCallback(async (name) => {
    const id = await db.symptom_types.add({ name, createdAt: new Date().toISOString() })
    const type = await db.symptom_types.get(id)
    setSymptomTypes((prev) => [...prev, type].sort((a, b) => a.name.localeCompare(b.name)))
    return type
  }, [])

  const deleteSymptomType = useCallback(async (id) => {
    await db.transaction('rw', db.symptom_types, db.symptoms, async () => {
      await db.symptom_types.delete(id)
      await db.symptoms.where('symptom_type_id').equals(id).delete()
    })
    setSymptomTypes((prev) => prev.filter((t) => t.id !== id))
    setSymptoms((prev) => prev.filter((s) => s.symptom_type_id !== id))
  }, [])

  const addSymptom = useCallback(async (data) => {
    const row = { ...data, timestamp: data.timestamp ?? new Date().toISOString() }
    const id = await db.symptoms.add(row)
    const saved = await db.symptoms.get(id)
    setSymptoms((prev) => [saved, ...prev])
    return saved
  }, [])

  const deleteSymptom = useCallback(async (id) => {
    await db.symptoms.delete(id)
    setSymptoms((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const getRecentSymptoms = useCallback(async (days = 7) => {
    const since = new Date()
    since.setDate(since.getDate() - days)
    return db.symptoms.where('timestamp').above(since.toISOString()).toArray()
  }, [])

  return (
    <HealthContext.Provider
      value={{
        symptomTypes,
        symptoms,
        addSymptomType,
        deleteSymptomType,
        addSymptom,
        deleteSymptom,
        getRecentSymptoms,
      }}
    >
      {children}
    </HealthContext.Provider>
  )
}

export function useHealth() {
  const ctx = useContext(HealthContext)
  if (!ctx) throw new Error('useHealth must be used within HealthProvider')
  return ctx
}

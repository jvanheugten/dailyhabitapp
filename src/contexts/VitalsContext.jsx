import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { db } from '../db/db'

const VitalsContext = createContext(null)

export function VitalsProvider({ children }) {
  const [vitalTypes, setVitalTypes] = useState([])
  const [vitalEntries, setVitalEntries] = useState([])

  useEffect(() => {
    db.vital_types.orderBy('name').toArray().then(setVitalTypes)
    db.vital_entries.orderBy('timestamp').reverse().limit(200).toArray().then(setVitalEntries)
  }, [])

  const addVitalType = useCallback(async (data) => {
    const id = await db.vital_types.add({
      ...data,
      is_standard: false,
      createdAt: new Date().toISOString(),
    })
    const type = await db.vital_types.get(id)
    setVitalTypes((prev) => [...prev, type].sort((a, b) => a.name.localeCompare(b.name)))
    return type
  }, [])

  const updateVitalType = useCallback(async (id, data) => {
    await db.vital_types.update(id, data)
    setVitalTypes((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)))
  }, [])

  const deleteVitalType = useCallback(async (id) => {
    const type = await db.vital_types.get(id)
    if (!type || type.is_standard) return
    await db.transaction('rw', db.vital_types, db.vital_entries, async () => {
      await db.vital_types.delete(id)
      await db.vital_entries.where('vital_type_id').equals(id).delete()
    })
    setVitalTypes((prev) => prev.filter((t) => t.id !== id))
    setVitalEntries((prev) => prev.filter((e) => e.vital_type_id !== id))
  }, [])

  const addVitalEntry = useCallback(async (data) => {
    const entry = {
      ...data,
      source: data.source ?? 'manual',
      timestamp: data.timestamp ?? new Date().toISOString(),
    }
    const id = await db.vital_entries.add(entry)
    const saved = await db.vital_entries.get(id)
    setVitalEntries((prev) => [saved, ...prev])
    return saved
  }, [])

  const getEntriesForType = useCallback(async (vitalTypeId, limit = 50) => {
    return db.vital_entries
      .where('vital_type_id')
      .equals(vitalTypeId)
      .reverse()
      .limit(limit)
      .toArray()
  }, [])

  return (
    <VitalsContext.Provider
      value={{
        vitalTypes,
        vitalEntries,
        addVitalType,
        updateVitalType,
        deleteVitalType,
        addVitalEntry,
        getEntriesForType,
      }}
    >
      {children}
    </VitalsContext.Provider>
  )
}

export function useVitals() {
  const ctx = useContext(VitalsContext)
  if (!ctx) throw new Error('useVitals must be used within VitalsProvider')
  return ctx
}

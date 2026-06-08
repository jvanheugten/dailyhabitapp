import { createContext, useContext, useState, useCallback } from 'react'
import { db } from '../db/db'

const JournalContext = createContext(null)

export function JournalProvider({ children }) {
  const [entries, setEntries] = useState({}) // { [date]: entry | null }

  const loadEntry = useCallback(async (date) => {
    if (entries[date] !== undefined) return entries[date]
    const entry = (await db.journal_entries.where('date').equals(date).first()) ?? null
    setEntries(prev => ({ ...prev, [date]: entry }))
    return entry
  }, [entries])

  const saveEntry = useCallback(async (date, text) => {
    const existing = await db.journal_entries.where('date').equals(date).first()
    const now = new Date().toISOString()
    if (existing) {
      await db.journal_entries.update(existing.id, { text, updatedAt: now })
      setEntries(prev => ({ ...prev, [date]: { ...existing, text, updatedAt: now } }))
    } else {
      const id = await db.journal_entries.add({ date, text, createdAt: now, updatedAt: now })
      setEntries(prev => ({ ...prev, [date]: { id, date, text, createdAt: now, updatedAt: now } }))
    }
  }, [])

  const getAllEntries = useCallback(async () => {
    return db.journal_entries.orderBy('date').reverse().toArray()
  }, [])

  return (
    <JournalContext.Provider value={{ entries, loadEntry, saveEntry, getAllEntries }}>
      {children}
    </JournalContext.Provider>
  )
}

export function useJournal() {
  const ctx = useContext(JournalContext)
  if (!ctx) throw new Error('useJournal must be used within JournalProvider')
  return ctx
}

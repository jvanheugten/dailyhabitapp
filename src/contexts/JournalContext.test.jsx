import { renderHook, act } from '@testing-library/react'
import { JournalProvider, useJournal } from './JournalContext'
import { db } from '../db/db'

beforeEach(async () => { await db.journal_entries.clear() })

const wrapper = ({ children }) => <JournalProvider>{children}</JournalProvider>

test('loadEntry returns null for a date with no entry', async () => {
  const { result } = renderHook(() => useJournal(), { wrapper })
  let entry
  await act(async () => { entry = await result.current.loadEntry('2026-06-08') })
  expect(entry).toBeNull()
})

test('saveEntry creates a new entry', async () => {
  const { result } = renderHook(() => useJournal(), { wrapper })
  await act(async () => { await result.current.saveEntry('2026-06-08', 'Good day') })
  let entry
  await act(async () => { entry = await result.current.loadEntry('2026-06-08') })
  expect(entry.text).toBe('Good day')
})

test('saveEntry updates existing entry (upsert)', async () => {
  const { result } = renderHook(() => useJournal(), { wrapper })
  await act(async () => { await result.current.saveEntry('2026-06-08', 'First') })
  await act(async () => { await result.current.saveEntry('2026-06-08', 'Updated') })
  const rows = await db.journal_entries.toArray()
  expect(rows).toHaveLength(1)
  expect(rows[0].text).toBe('Updated')
})

test('getAllEntries returns entries newest first', async () => {
  const { result } = renderHook(() => useJournal(), { wrapper })
  await act(async () => {
    await result.current.saveEntry('2026-06-06', 'Day 1')
    await result.current.saveEntry('2026-06-08', 'Day 3')
    await result.current.saveEntry('2026-06-07', 'Day 2')
  })
  let entries
  await act(async () => { entries = await result.current.getAllEntries() })
  expect(entries[0].date).toBe('2026-06-08')
  expect(entries[2].date).toBe('2026-06-06')
})

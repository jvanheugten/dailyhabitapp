import { describe, it, expect } from 'vitest'
import { csvQuote, toCsv, buildBackupJSON } from './exportService'
import Dexie from 'dexie'

// ── csvQuote ──────────────────────────────────────────────────────────────────

describe('csvQuote', () => {
  it('returns plain string unchanged', () => {
    expect(csvQuote('hello')).toBe('hello')
  })

  it('wraps string with comma in quotes', () => {
    expect(csvQuote('a,b')).toBe('"a,b"')
  })

  it('wraps string with double-quote and escapes it', () => {
    expect(csvQuote('say "hi"')).toBe('"say ""hi"""')
  })

  it('wraps string with newline in quotes', () => {
    expect(csvQuote('line1\nline2')).toBe('"line1\nline2"')
  })

  it('returns empty string for null', () => {
    expect(csvQuote(null)).toBe('')
  })

  it('converts numbers to string', () => {
    expect(csvQuote(42)).toBe('42')
  })
})

// ── toCsv ─────────────────────────────────────────────────────────────────────

describe('toCsv', () => {
  it('produces header row + data rows', () => {
    const out = toCsv(
      ['id', 'name'],
      [
        [1, 'Alice'],
        [2, 'Bob'],
      ]
    )
    expect(out).toBe('id,name\n1,Alice\n2,Bob')
  })

  it('quotes fields that need it', () => {
    const out = toCsv(['text'], [['hello, world']])
    expect(out).toBe('text\n"hello, world"')
  })
})

// ── buildBackupJSON ───────────────────────────────────────────────────────────

describe('buildBackupJSON', () => {
  it('returns version 1 with all required keys', async () => {
    const { IDBFactory } = await import('fake-indexeddb')
    const testDb = new Dexie('test_backup', { indexedDB: new IDBFactory() })
    testDb.version(1).stores({
      habits: '++id',
      completions: '++id',
      journal_entries: '++id',
      notification_prefs: 'habitId',
      symptom_types: '++id',
      symptoms: '++id',
      vital_types: '++id',
      vital_entries: '++id',
      google_fit_sync: '++id',
    })

    await testDb.habits.add({ name: 'Run', days: [1], time: '07:00' })
    await testDb.vital_types.add({ name: 'Heart Rate', unit: 'bpm' })

    const backup = await buildBackupJSON(testDb)

    expect(backup.version).toBe(1)
    expect(backup.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}/)
    expect(backup.habits).toHaveLength(1)
    expect(backup.habits[0].name).toBe('Run')
    expect(backup.vital_types).toHaveLength(1)
    expect(backup.completions).toEqual([])
    expect(backup.symptoms).toEqual([])
    expect(backup.notification_prefs).toEqual([])

    await testDb.close()
  })
})

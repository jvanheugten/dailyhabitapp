import { describe, it, expect, vi } from 'vitest'
import { csvQuote, toCsv, buildBackupJSON, exportAllData } from './exportService'
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

// ── exportAllData ─────────────────────────────────────────────────────────────

describe('exportAllData', () => {
  it('triggers a zip download with correct filename and cleans up', async () => {
    const { IDBFactory } = await import('fake-indexeddb')
    const testDb = new Dexie('test_export', { indexedDB: new IDBFactory() })
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
    await testDb.habits.add({ name: 'Run', days: [1, 2], time: '07:00', streak: 3 })

    const revokeObjectURL = vi.fn()
    const createObjectURL = vi.fn(() => 'blob:fake')
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    const mockAnchor = { href: '', download: '', click: vi.fn(), style: {} }
    const realCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag) =>
      tag === 'a' ? mockAnchor : realCreateElement(tag)
    )
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => {})
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => {})

    try {
      await exportAllData(testDb)

      expect(createObjectURL).toHaveBeenCalled()
      expect(mockAnchor.click).toHaveBeenCalled()
      expect(mockAnchor.download).toMatch(/^dailyhabitapp-export-\d{4}-\d{2}-\d{2}\.zip$/)
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake')

      // Verify zip contents
      const blob = createObjectURL.mock.calls[0][0]
      const JSZip = (await import('jszip')).default
      const zip = await JSZip.loadAsync(blob)
      const fileNames = Object.keys(zip.files)
      expect(fileNames).toContain('habits.csv')
      expect(fileNames).toContain('completions.csv')
      expect(fileNames).toContain('journal_entries.csv')
      expect(fileNames).toContain('symptom_types.csv')
      expect(fileNames).toContain('symptoms.csv')
      expect(fileNames).toContain('vital_types.csv')
      expect(fileNames).toContain('vital_entries.csv')
      expect(fileNames).toContain('backup.json')
      const habitsCsv = await zip.files['habits.csv'].async('string')
      expect(habitsCsv).toContain('Run')
    } finally {
      vi.restoreAllMocks()
      vi.unstubAllGlobals()
      await testDb.close()
    }
  })
})

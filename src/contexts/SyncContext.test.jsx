import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { SyncProvider, useSync } from './SyncContext'

// Mock googleDrive service
vi.mock('../services/googleDrive', () => ({
  isConnected: vi.fn(() => false),
  requestAccessToken: vi.fn(async () => 'tok'),
  loadToken: vi.fn(() => 'tok'),
  loadFileId: vi.fn(() => 'fid'),
  disconnect: vi.fn(),
  getBackupInfo: vi.fn(async () => ({ modifiedTime: '2026-06-08T10:00:00Z', size: 1234 })),
  uploadBackup: vi.fn(async () => 'fid'),
  downloadBackup: vi.fn(async () => ({
    version: 1,
    exportedAt: '2026-06-08T10:00:00Z',
    habits: [{ id: 1, name: 'Run', days: [1], time: '07:00' }],
    completions: [],
    journal_entries: [],
    notification_prefs: [],
    symptom_types: [],
    symptoms: [],
    vital_types: [],
    vital_entries: [],
    google_fit_sync: [],
  })),
  findBackupFile: vi.fn(async () => 'fid'),
  saveFileId: vi.fn(),
  clearToken: vi.fn(),
  clearFileId: vi.fn(),
  saveToken: vi.fn(),
}))

// Mock exportService
vi.mock('../services/exportService', () => ({
  buildBackupJSON: vi.fn(async () => ({ version: 1, exportedAt: 'now', habits: [] })),
  exportAllData: vi.fn(async () => {}),
}))

// Mock db
vi.mock('../db/db', () => ({
  db: {
    habits: { clear: vi.fn(async () => {}), bulkAdd: vi.fn(async () => {}) },
    completions: { clear: vi.fn(async () => {}), bulkAdd: vi.fn(async () => {}) },
    journal_entries: { clear: vi.fn(async () => {}), bulkAdd: vi.fn(async () => {}) },
    notification_prefs: { clear: vi.fn(async () => {}), bulkAdd: vi.fn(async () => {}) },
    symptom_types: { clear: vi.fn(async () => {}), bulkAdd: vi.fn(async () => {}) },
    symptoms: { clear: vi.fn(async () => {}), bulkAdd: vi.fn(async () => {}) },
    vital_types: { clear: vi.fn(async () => {}), bulkAdd: vi.fn(async () => {}) },
    vital_entries: { clear: vi.fn(async () => {}), bulkAdd: vi.fn(async () => {}) },
    google_fit_sync: { clear: vi.fn(async () => {}), bulkAdd: vi.fn(async () => {}) },
    transaction: vi.fn(async (_mode, _tables, fn) => fn()),
  },
}))

const wrapper = ({ children }) => <SyncProvider>{children}</SyncProvider>

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('auto-sync on mount', () => {
  it('does NOT auto-sync when last sync was recent', async () => {
    const { isConnected } = await import('../services/googleDrive')
    const { uploadBackup } = await import('../services/googleDrive')
    isConnected.mockReturnValue(true)
    localStorage.setItem('drive_last_synced', String(Date.now() - 1000))

    renderHook(() => useSync(), { wrapper })
    await new Promise((r) => setTimeout(r, 50))

    expect(uploadBackup).not.toHaveBeenCalled()
  })

  it('auto-syncs when last sync was >24h ago', async () => {
    const { uploadBackup, isConnected } = await import('../services/googleDrive')
    isConnected.mockReturnValue(true)
    localStorage.setItem('drive_last_synced', String(Date.now() - 90_000_000))

    renderHook(() => useSync(), { wrapper })
    await new Promise((r) => setTimeout(r, 100))

    expect(uploadBackup).toHaveBeenCalled()
  })
})

describe('connect', () => {
  it('sets isConnected to true on success', async () => {
    const { result } = renderHook(() => useSync(), { wrapper })
    await act(async () => {
      await result.current.connect()
    })
    expect(result.current.isConnected).toBe(true)
  })

  it('sets syncError on failure', async () => {
    const { requestAccessToken } = await import('../services/googleDrive')
    requestAccessToken.mockRejectedValueOnce(new Error('popup_closed'))
    const { result } = renderHook(() => useSync(), { wrapper })
    await act(async () => {
      await result.current.connect()
    })
    expect(result.current.syncError).toBe('popup_closed')
  })
})

describe('syncNow', () => {
  it('updates lastSyncedAt after successful upload', async () => {
    const before = Date.now()
    const { result } = renderHook(() => useSync(), { wrapper })
    await act(async () => {
      await result.current.syncNow()
    })
    expect(result.current.lastSyncedAt).toBeGreaterThanOrEqual(before)
    expect(localStorage.getItem('drive_last_synced')).toBeTruthy()
  })

  it('sets isConnected=false on drive_token_expired error', async () => {
    const { uploadBackup } = await import('../services/googleDrive')
    uploadBackup.mockRejectedValueOnce(new Error('drive_token_expired'))
    const { result } = renderHook(() => useSync(), { wrapper })
    await act(async () => {
      await result.current.syncNow()
    })
    expect(result.current.isConnected).toBe(false)
  })
})

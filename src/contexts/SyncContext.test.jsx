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
vi.mock('../db/db', () => {
  const createTable = () => ({ clear: vi.fn(async () => {}), bulkAdd: vi.fn(async () => {}) })
  return {
    db: {
      habits: createTable(),
      completions: createTable(),
      journal_entries: createTable(),
      notification_prefs: createTable(),
      symptom_types: createTable(),
      symptoms: createTable(),
      vital_types: createTable(),
      vital_entries: createTable(),
      google_fit_sync: createTable(),
      transaction: vi.fn(async (_mode, ...args) => {
        // Last argument is the function, all others are tables
        const fn = args[args.length - 1]
        return await fn()
      }),
    },
  }
})

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

  it('does NOT call requestAccessToken when silent and token is expired', async () => {
    const { isConnected, requestAccessToken, loadToken } = await import('../services/googleDrive')
    isConnected.mockReturnValue(true)
    loadToken.mockReturnValue(null) // simulate expired token
    localStorage.setItem('drive_last_synced', String(Date.now() - 90_000_000))

    renderHook(() => useSync(), { wrapper })
    await new Promise((r) => setTimeout(r, 100))

    expect(requestAccessToken).not.toHaveBeenCalled()
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

describe('initiateRestore', () => {
  it('sets pendingRestore with downloaded backup', async () => {
    const { loadToken, loadFileId } = await import('../services/googleDrive')
    loadToken.mockReturnValue('tok')
    loadFileId.mockReturnValue('fid')
    const { result } = renderHook(() => useSync(), { wrapper })
    await act(async () => {
      await result.current.initiateRestore()
    })
    expect(result.current.pendingRestore).not.toBeNull()
    expect(result.current.pendingRestore.version).toBe(1)
    expect(result.current.pendingRestore.habits).toHaveLength(1)
  })

  it('sets syncError when no backup file found', async () => {
    const { loadToken, loadFileId, findBackupFile } = await import('../services/googleDrive')
    loadToken.mockReturnValue('tok')
    loadFileId.mockReturnValue(null)
    findBackupFile.mockResolvedValueOnce(null)
    const { result } = renderHook(() => useSync(), { wrapper })
    await act(async () => {
      await result.current.initiateRestore()
    })
    expect(result.current.syncError).toBe('No backup found in Google Drive')
    expect(result.current.pendingRestore).toBeNull()
  })
})

describe('cancelRestore', () => {
  it('clears pendingRestore', async () => {
    const { loadToken, loadFileId } = await import('../services/googleDrive')
    loadToken.mockReturnValue('tok')
    loadFileId.mockReturnValue('fid')
    const { result } = renderHook(() => useSync(), { wrapper })
    await act(async () => {
      await result.current.initiateRestore()
    })
    expect(result.current.pendingRestore).not.toBeNull()
    act(() => {
      result.current.cancelRestore()
    })
    expect(result.current.pendingRestore).toBeNull()
  })
})

describe('confirmRestore', () => {
  it('clears all tables and calls location.reload', async () => {
    const { loadToken, loadFileId } = await import('../services/googleDrive')
    const { db } = await import('../db/db')
    loadToken.mockReturnValue('tok')
    loadFileId.mockReturnValue('fid')

    // Mock window.location.reload by replacing the entire location object
    const reloadMock = vi.fn()
    const originalLocation = window.location
    // @ts-ignore
    delete window.location
    // @ts-ignore
    window.location = { reload: reloadMock }

    const { result } = renderHook(() => useSync(), { wrapper })
    await act(async () => {
      await result.current.initiateRestore()
    })

    await act(async () => {
      await result.current.confirmRestore()
    })

    expect(db.habits.clear).toHaveBeenCalled()
    expect(db.vital_entries.clear).toHaveBeenCalled()
    expect(reloadMock).toHaveBeenCalled()

    // Restore
    window.location = originalLocation
  })
})

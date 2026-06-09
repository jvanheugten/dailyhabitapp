import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  saveToken,
  loadToken,
  clearToken,
  isConnected,
  saveFileId,
  loadFileId,
  clearFileId,
  disconnect,
  findBackupFile,
  getBackupInfo,
  uploadBackup,
  downloadBackup,
} from './googleDrive'

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

describe('token helpers', () => {
  it('loadToken returns null when nothing stored', () => {
    expect(loadToken()).toBeNull()
  })

  it('saveToken + loadToken round-trips', () => {
    saveToken('abc123')
    expect(loadToken()).toBe('abc123')
  })

  it('loadToken returns null after clearToken', () => {
    saveToken('abc123')
    clearToken()
    expect(loadToken()).toBeNull()
  })

  it('isConnected is false when no token', () => {
    expect(isConnected()).toBe(false)
  })

  it('isConnected is true after saveToken', () => {
    saveToken('abc123')
    expect(isConnected()).toBe(true)
  })
})

describe('file ID helpers', () => {
  it('loadFileId returns null when nothing stored', () => {
    expect(loadFileId()).toBeNull()
  })

  it('saveFileId + loadFileId round-trips', () => {
    saveFileId('file_xyz')
    expect(loadFileId()).toBe('file_xyz')
  })

  it('loadFileId returns null after clearFileId', () => {
    saveFileId('file_xyz')
    clearFileId()
    expect(loadFileId()).toBeNull()
  })
})

describe('disconnect', () => {
  it('clears token and file ID', () => {
    saveToken('tok')
    saveFileId('fid')
    disconnect(null)
    expect(loadToken()).toBeNull()
    expect(loadFileId()).toBeNull()
  })
})

describe('findBackupFile', () => {
  it('returns file ID when file exists', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ files: [{ id: 'file_abc' }] }),
    })
    const id = await findBackupFile('mytoken')
    expect(id).toBe('file_abc')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('spaces=appDataFolder'),
      expect.objectContaining({ headers: { Authorization: 'Bearer mytoken' } })
    )
  })

  it('returns null when no files found', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ files: [] }),
    })
    expect(await findBackupFile('tok')).toBeNull()
  })
})

describe('getBackupInfo', () => {
  it('returns modifiedTime and size', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ modifiedTime: '2026-06-08T10:00:00Z', size: '12345' }),
    })
    const info = await getBackupInfo('tok', 'fid')
    expect(info).toEqual({ modifiedTime: '2026-06-08T10:00:00Z', size: 12345 })
  })

  it('returns null on error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    expect(await getBackupInfo('tok', 'fid')).toBeNull()
  })
})

describe('uploadBackup', () => {
  it('creates new file when no fileId stored', async () => {
    localStorage.clear()
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ files: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'new_file_id' }),
      })
    const id = await uploadBackup('tok', { version: 1, exportedAt: 'now', habits: [] })
    expect(id).toBe('new_file_id')
    expect(loadFileId()).toBe('new_file_id')
  })

  it('updates existing file when fileId is stored', async () => {
    saveFileId('existing_id')
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    })
    const id = await uploadBackup('tok', { version: 1, exportedAt: 'now', habits: [] })
    expect(id).toBe('existing_id')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('existing_id'),
      expect.objectContaining({ method: 'PATCH' })
    )
  })
})

describe('downloadBackup', () => {
  it('returns parsed JSON for valid backup', async () => {
    const backup = { version: 1, exportedAt: 'now', habits: [] }
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => backup,
    })
    expect(await downloadBackup('tok', 'fid')).toEqual(backup)
  })

  it('throws on incompatible version', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ version: 99 }),
    })
    await expect(downloadBackup('tok', 'fid')).rejects.toThrow('Incompatible backup format')
  })

  it('throws drive_token_expired on 401', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 })
    await expect(downloadBackup('tok', 'fid')).rejects.toThrow('drive_token_expired')
  })
})

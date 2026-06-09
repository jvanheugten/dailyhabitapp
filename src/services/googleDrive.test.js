import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveToken,
  loadToken,
  clearToken,
  isConnected,
  saveFileId,
  loadFileId,
  clearFileId,
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

// eslint-disable-next-line no-unused-vars
const CLIENT_ID = import.meta.env?.VITE_GOOGLE_CLIENT_ID ?? ''
// eslint-disable-next-line no-unused-vars
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
// eslint-disable-next-line no-unused-vars
const BACKUP_FILENAME = 'dailyhabitapp-backup.json'

const TOKEN_KEY = 'drive_token'
const EXPIRY_KEY = 'drive_expiry'
const FILE_ID_KEY = 'drive_backup_file_id'

// ─── Token helpers ────────────────────────────────────────────────────────────

export function saveToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(EXPIRY_KEY, String(Date.now() + 55 * 60 * 1000))
}

export function loadToken() {
  const token = sessionStorage.getItem(TOKEN_KEY)
  const expiry = Number(sessionStorage.getItem(EXPIRY_KEY) ?? 0)
  if (!token || Date.now() > expiry) return null
  return token
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(EXPIRY_KEY)
}

export function isConnected() {
  return Boolean(loadToken())
}

// ─── File ID helpers (persisted across sessions) ─────────────────────────────

export function saveFileId(id) {
  localStorage.setItem(FILE_ID_KEY, id)
}

export function loadFileId() {
  return localStorage.getItem(FILE_ID_KEY)
}

export function clearFileId() {
  localStorage.removeItem(FILE_ID_KEY)
}

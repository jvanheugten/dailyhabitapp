const CLIENT_ID = import.meta.env?.VITE_GOOGLE_CLIENT_ID ?? ''
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
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

// ─── Internal fetch wrapper ───────────────────────────────────────────────────

async function driveRequest(url, options) {
  const res = await fetch(url, options)
  if (res.status === 401) {
    clearToken()
    throw new Error('drive_token_expired')
  }
  if (!res.ok) throw new Error(`Drive API error: ${res.status}`)
  return res
}

// ─── OAuth ────────────────────────────────────────────────────────────────────

export function requestAccessToken() {
  return new Promise((resolve, reject) => {
    if (!window.google) {
      reject(new Error('Google Identity Services not loaded'))
      return
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description ?? response.error))
          return
        }
        saveToken(response.access_token)
        resolve(response.access_token)
      },
    })
    client.requestAccessToken()
  })
}

export function disconnect(token) {
  if (token && window.google) {
    window.google.accounts.oauth2.revoke(token, () => {})
  }
  clearToken()
  clearFileId()
}

// ─── Drive API ────────────────────────────────────────────────────────────────

export async function findBackupFile(token) {
  const res = await driveRequest(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name%3D'${BACKUP_FILENAME}'&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const data = await res.json()
  return data.files?.[0]?.id ?? null
}

export async function getBackupInfo(token, fileId) {
  try {
    const res = await driveRequest(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=modifiedTime%2Csize`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await res.json()
    return { modifiedTime: data.modifiedTime, size: Number(data.size) }
  } catch (e) {
    if (e.message === 'drive_token_expired') throw e
    return null
  }
}

export async function uploadBackup(token, data) {
  const json = JSON.stringify(data)

  let fileId = loadFileId()
  if (!fileId) {
    fileId = await findBackupFile(token)
    if (fileId) saveFileId(fileId)
  }

  if (fileId) {
    await driveRequest(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: json,
      }
    )
    return fileId
  }

  const boundary = 'dailyhabit_boundary'
  const metadata = JSON.stringify({ name: BACKUP_FILENAME, parents: ['appDataFolder'] })
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    metadata,
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    json,
    `--${boundary}--`,
  ].join('\r\n')

  const res = await driveRequest(
    `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  )
  const result = await res.json()
  saveFileId(result.id)
  return result.id
}

export async function downloadBackup(token, fileId) {
  const res = await driveRequest(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const backup = await res.json()
  if (backup.version !== 1) throw new Error('Incompatible backup format')
  return backup
}

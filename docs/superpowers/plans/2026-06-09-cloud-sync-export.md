# Cloud Sync & Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect user data with automatic Google Drive backup and provide full data export as a zip of CSV + JSON files.

**Architecture:** A pure JS Drive service handles GIS OAuth and Drive REST API calls; a pure JS export service reads Dexie and produces a JSZip download; a React SyncContext orchestrates auto-sync and restore; a CloudSyncPanel UI card lives in a new Settings tab.

**Tech Stack:** React 18 + Vite PWA, Dexie.js v3, Google Identity Services (GIS) implicit flow, Google Drive REST API v3, JSZip, Vitest + jsdom

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| Create | `src/services/googleDrive.js` | Token helpers, Drive API calls |
| Create | `src/services/exportService.js` | buildBackupJSON, CSV helpers, exportAllData |
| Create | `src/contexts/SyncContext.jsx` | Auth state, auto-sync, restore orchestration |
| Create | `src/components/sync/CloudSyncPanel.jsx` | Settings UI card |
| Create | `src/components/sync/CloudSyncPanel.module.css` | Panel styles |
| Create | `src/screens/Settings.jsx` | New Settings screen |
| Create | `src/screens/Settings.module.css` | Settings screen styles |
| Modify | `src/components/BottomNav.jsx` | Add Settings tab |
| Modify | `src/App.jsx` | Add SyncProvider, Settings screen, settings tab render |
| Test | `src/services/googleDrive.test.js` | Token helpers + Drive API mocks |
| Test | `src/services/exportService.test.js` | CSV quoting + buildBackupJSON + exportAllData |
| Test | `src/contexts/SyncContext.test.jsx` | Auto-sync logic + restore flow |

---

### Task 1: Install JSZip

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the dependency**

```bash
npm install jszip
```

Expected output: `added 1 package` (or similar). No peer-dep warnings.

- [ ] **Step 2: Verify it resolves**

```bash
node -e "require('./node_modules/jszip/dist/jszip.js'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add jszip dependency"
```

---

### Task 2: Drive Service — Token & File ID Helpers

**Files:**
- Create: `src/services/googleDrive.js`
- Create: `src/services/googleDrive.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/services/googleDrive.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveToken, loadToken, clearToken, isConnected,
  saveFileId, loadFileId, clearFileId,
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/services/googleDrive.test.js
```

Expected: FAIL with "Cannot find module './googleDrive'"

- [ ] **Step 3: Implement the helpers**

Create `src/services/googleDrive.js`:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/services/googleDrive.test.js
```

Expected: all 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/googleDrive.js src/services/googleDrive.test.js
git commit -m "feat: drive service token and file ID helpers"
```

---

### Task 3: Drive Service — OAuth & Drive API Operations

**Files:**
- Modify: `src/services/googleDrive.js`
- Modify: `src/services/googleDrive.test.js`

- [ ] **Step 1: Write the failing tests**

Append to `src/services/googleDrive.test.js`:

```js
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  saveToken, loadToken, clearToken, isConnected,
  saveFileId, loadFileId, clearFileId,
  disconnect, findBackupFile, getBackupInfo, uploadBackup, downloadBackup,
} from './googleDrive'

// (keep existing tests above, add these below)

describe('disconnect', () => {
  it('clears token and file ID', () => {
    saveToken('tok')
    saveFileId('fid')
    // mock window.google as absent
    disconnect(null)
    expect(loadToken()).toBeNull()
    expect(loadFileId()).toBeNull()
  })
})

describe('findBackupFile', () => {
  it('returns file ID when file exists', async () => {
    global.fetch = vi.fn().mockResolvedValue({
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
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ files: [] }),
    })
    expect(await findBackupFile('tok')).toBeNull()
  })
})

describe('getBackupInfo', () => {
  it('returns modifiedTime and size', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ modifiedTime: '2026-06-08T10:00:00Z', size: '12345' }),
    })
    const info = await getBackupInfo('tok', 'fid')
    expect(info).toEqual({ modifiedTime: '2026-06-08T10:00:00Z', size: 12345 })
  })

  it('returns null on error', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    expect(await getBackupInfo('tok', 'fid')).toBeNull()
  })
})

describe('uploadBackup', () => {
  beforeEach(() => localStorage.clear())

  it('creates new file when no fileId stored', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'new_file_id' }),
    })
    // no fileId in localStorage, findBackupFile returns null
    global.fetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ files: [] }),
    })
    global.fetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ id: 'new_file_id' }),
    })
    const id = await uploadBackup('tok', { version: 1, exportedAt: 'now', habits: [] })
    expect(id).toBe('new_file_id')
    expect(loadFileId()).toBe('new_file_id')
  })

  it('updates existing file when fileId is stored', async () => {
    saveFileId('existing_id')
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
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
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => backup,
    })
    expect(await downloadBackup('tok', 'fid')).toEqual(backup)
  })

  it('throws on incompatible version', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ version: 99 }),
    })
    await expect(downloadBackup('tok', 'fid')).rejects.toThrow('Incompatible backup format')
  })

  it('throws drive_token_expired on 401', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 })
    await expect(downloadBackup('tok', 'fid')).rejects.toThrow('drive_token_expired')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/services/googleDrive.test.js
```

Expected: FAIL — new functions not exported yet

- [ ] **Step 3: Implement the operations**

Append to `src/services/googleDrive.js` (after the file ID helpers):

```js
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
  } catch {
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
  const res = await driveRequest(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const backup = await res.json()
  if (backup.version !== 1) throw new Error('Incompatible backup format')
  return backup
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/services/googleDrive.test.js
```

Expected: all tests PASS

- [ ] **Step 5: Run full suite**

```bash
npx vitest run
```

Expected: all pre-existing tests still PASS

- [ ] **Step 6: Commit**

```bash
git add src/services/googleDrive.js src/services/googleDrive.test.js
git commit -m "feat: drive service OAuth and API operations"
```

---

### Task 4: Export Service — buildBackupJSON & CSV Helpers

**Files:**
- Create: `src/services/exportService.js`
- Create: `src/services/exportService.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/services/exportService.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { csvQuote, toCsv, buildBackupJSON } from './exportService'
import Dexie from 'dexie'
import { populate } from 'fake-indexeddb/auto'

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
    const out = toCsv(['id', 'name'], [[1, 'Alice'], [2, 'Bob']])
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
    // Create a minimal in-memory Dexie DB
    const testDb = new Dexie('test_backup', { indexedDB: new (await import('fake-indexeddb')).default() })
    testDb.version(1).stores({
      habits: '++id',
      completions: '++id',
      journal_entries: '++id',
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

    await testDb.close()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/services/exportService.test.js
```

Expected: FAIL — "Cannot find module './exportService'"

- [ ] **Step 3: Implement csvQuote, toCsv, buildBackupJSON**

Create `src/services/exportService.js`:

```js
import JSZip from 'jszip'
import { db as defaultDb } from '../db/db'

// ─── CSV helpers ──────────────────────────────────────────────────────────────

export function csvQuote(value) {
  if (value == null) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function toCsv(headers, rows) {
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(row.map(csvQuote).join(','))
  }
  return lines.join('\n')
}

// ─── Backup JSON ──────────────────────────────────────────────────────────────

export async function buildBackupJSON(db) {
  const [
    habits,
    completions,
    journal_entries,
    symptom_types,
    symptoms,
    vital_types,
    vital_entries,
    google_fit_sync,
  ] = await Promise.all([
    db.habits.toArray(),
    db.completions.toArray(),
    db.journal_entries.toArray(),
    db.symptom_types.toArray(),
    db.symptoms.toArray(),
    db.vital_types.toArray(),
    db.vital_entries.toArray(),
    db.google_fit_sync.toArray(),
  ])
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    habits,
    completions,
    journal_entries,
    symptom_types,
    symptoms,
    vital_types,
    vital_entries,
    google_fit_sync,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/services/exportService.test.js
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/exportService.js src/services/exportService.test.js
git commit -m "feat: export service CSV helpers and buildBackupJSON"
```

---

### Task 5: Export Service — exportAllData (Zip + Download)

**Files:**
- Modify: `src/services/exportService.js`
- Modify: `src/services/exportService.test.js`

- [ ] **Step 1: Write the failing tests**

Append to `src/services/exportService.test.js`:

```js
import { vi } from 'vitest'
import { exportAllData } from './exportService'

describe('exportAllData', () => {
  it('triggers a zip download with expected filenames', async () => {
    const testDb = new Dexie('test_export', { indexedDB: new (await import('fake-indexeddb')).default() })
    testDb.version(1).stores({
      habits: '++id', completions: '++id', journal_entries: '++id',
      symptom_types: '++id', symptoms: '++id',
      vital_types: '++id', vital_entries: '++id', google_fit_sync: '++id',
    })
    await testDb.habits.add({ name: 'Run', days: [1, 2], time: '07:00', streak: 3 })

    // Mock URL and DOM for download trigger
    const revokeObjectURL = vi.fn()
    const createObjectURL = vi.fn(() => 'blob:fake')
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    const clickFn = vi.fn()
    vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: clickFn,
      style: {},
    })
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => {})
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => {})

    await exportAllData(testDb)

    expect(createObjectURL).toHaveBeenCalled()
    expect(clickFn).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake')

    vi.restoreAllMocks()
    await testDb.close()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/services/exportService.test.js -t "exportAllData"
```

Expected: FAIL — exportAllData not exported

- [ ] **Step 3: Implement exportAllData**

Append to `src/services/exportService.js`:

```js
// ─── Zip export ───────────────────────────────────────────────────────────────

export async function exportAllData(db = defaultDb) {
  const backup = await buildBackupJSON(db)
  const zip = new JSZip()

  zip.file(
    'habits.csv',
    toCsv(
      ['id', 'name', 'days', 'time', 'streak'],
      backup.habits.map((h) => [h.id, h.name, (h.days ?? []).join(';'), h.time ?? '', h.streak ?? 0])
    )
  )

  zip.file(
    'completions.csv',
    toCsv(
      ['id', 'habitId', 'date'],
      backup.completions.map((c) => [c.id, c.habitId, c.date])
    )
  )

  zip.file(
    'journal_entries.csv',
    toCsv(
      ['id', 'date', 'text', 'createdAt', 'updatedAt'],
      backup.journal_entries.map((j) => [j.id, j.date, j.text ?? '', j.createdAt ?? '', j.updatedAt ?? ''])
    )
  )

  zip.file(
    'symptom_types.csv',
    toCsv(
      ['id', 'name', 'createdAt'],
      backup.symptom_types.map((t) => [t.id, t.name, t.createdAt ?? ''])
    )
  )

  zip.file(
    'symptoms.csv',
    toCsv(
      ['id', 'symptom_type_id', 'region', 'view', 'intensity', 'pain_type', 'notes', 'timestamp'],
      backup.symptoms.map((s) => [
        s.id, s.symptom_type_id, s.region ?? '', s.view ?? '',
        s.intensity ?? '', s.pain_type ?? '', s.notes ?? '', s.timestamp,
      ])
    )
  )

  zip.file(
    'vital_types.csv',
    toCsv(
      ['id', 'name', 'unit', 'value_schema', 'normal_min', 'normal_max', 'is_standard'],
      backup.vital_types.map((t) => [
        t.id, t.name, t.unit, t.value_schema,
        t.normal_min ?? '', t.normal_max ?? '', t.is_standard ? '1' : '0',
      ])
    )
  )

  zip.file(
    'vital_entries.csv',
    toCsv(
      ['id', 'vital_type_id', 'value', 'notes', 'timestamp', 'source'],
      backup.vital_entries.map((e) => [
        e.id, e.vital_type_id, e.value, e.notes ?? '', e.timestamp, e.source ?? '',
      ])
    )
  )

  zip.file('backup.json', JSON.stringify(backup, null, 2))

  const blob = await zip.generateAsync({ type: 'blob' })
  const today = new Date().toISOString().slice(0, 10)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dailyhabitapp-export-${today}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 4: Run all export service tests**

```bash
npx vitest run src/services/exportService.test.js
```

Expected: all tests PASS

- [ ] **Step 5: Run full suite**

```bash
npx vitest run
```

Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/services/exportService.js src/services/exportService.test.js
git commit -m "feat: export service zip download"
```

---

### Task 6: SyncContext — Connect, Sync, Auto-sync

**Files:**
- Create: `src/contexts/SyncContext.jsx`
- Create: `src/contexts/SyncContext.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `src/contexts/SyncContext.test.jsx`:

```jsx
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
    transaction: vi.fn(async (mode, tables, fn) => fn()),
  },
}))

const wrapper = ({ children }) => <SyncProvider>{children}</SyncProvider>

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('auto-sync on mount', () => {
  it('does NOT auto-sync when last sync was recent', async () => {
    const { uploadBackup } = await import('../services/googleDrive')
    const { isConnected } = await import('../services/googleDrive')
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
    await act(async () => { await result.current.connect() })
    expect(result.current.isConnected).toBe(true)
  })

  it('sets syncError on failure', async () => {
    const { requestAccessToken } = await import('../services/googleDrive')
    requestAccessToken.mockRejectedValueOnce(new Error('popup_closed'))
    const { result } = renderHook(() => useSync(), { wrapper })
    await act(async () => { await result.current.connect() })
    expect(result.current.syncError).toBe('popup_closed')
  })
})

describe('syncNow', () => {
  it('updates lastSyncedAt after successful upload', async () => {
    const before = Date.now()
    const { result } = renderHook(() => useSync(), { wrapper })
    await act(async () => { await result.current.syncNow() })
    expect(result.current.lastSyncedAt).toBeGreaterThanOrEqual(before)
    expect(localStorage.getItem('drive_last_synced')).toBeTruthy()
  })

  it('sets isConnected=false on drive_token_expired error', async () => {
    const { uploadBackup } = await import('../services/googleDrive')
    uploadBackup.mockRejectedValueOnce(new Error('drive_token_expired'))
    const { result } = renderHook(() => useSync(), { wrapper })
    await act(async () => { await result.current.syncNow() })
    expect(result.current.isConnected).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/contexts/SyncContext.test.jsx
```

Expected: FAIL — "Cannot find module './SyncContext'"

- [ ] **Step 3: Implement SyncContext (connect, disconnect, syncNow, auto-sync)**

Create `src/contexts/SyncContext.jsx`:

```jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { db } from '../db/db'
import {
  isConnected as driveIsConnected,
  requestAccessToken,
  loadToken,
  disconnect as driveDisconnect,
  getBackupInfo,
  uploadBackup,
  downloadBackup,
  findBackupFile,
  loadFileId,
} from '../services/googleDrive'
import { buildBackupJSON, exportAllData } from '../services/exportService'

const AUTO_SYNC_MS = 86_400_000
const LAST_SYNCED_KEY = 'drive_last_synced'

const SyncContext = createContext(null)

export function SyncProvider({ children }) {
  const [isConnected, setIsConnected] = useState(() => driveIsConnected())
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState(
    () => Number(localStorage.getItem(LAST_SYNCED_KEY) ?? 0)
  )
  const [syncError, setSyncError] = useState(null)
  const [backupInfo, setBackupInfo] = useState(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [pendingRestore, setPendingRestore] = useState(null)

  useEffect(() => {
    if (!isConnected) return
    const token = loadToken()
    const fileId = loadFileId()
    if (token && fileId) getBackupInfo(token, fileId).then(setBackupInfo)
  }, [isConnected, lastSyncedAt])

  const syncNow = useCallback(async (silent = false) => {
    let token = loadToken()
    if (!token) {
      try {
        token = await requestAccessToken()
        setIsConnected(true)
      } catch (e) {
        if (!silent) setSyncError(e.message)
        return
      }
    }
    setIsSyncing(true)
    if (!silent) setSyncError(null)
    try {
      const data = await buildBackupJSON(db)
      await uploadBackup(token, data)
      const now = Date.now()
      localStorage.setItem(LAST_SYNCED_KEY, String(now))
      setLastSyncedAt(now)
    } catch (e) {
      if (e.message === 'drive_token_expired') {
        setIsConnected(false)
        if (!silent) setSyncError('Drive session expired — reconnect to sync')
      } else {
        if (!silent) setSyncError(e.message)
      }
    } finally {
      setIsSyncing(false)
    }
  }, [])

  useEffect(() => {
    if (isConnected && Date.now() - lastSyncedAt > AUTO_SYNC_MS) {
      syncNow(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const connect = useCallback(async () => {
    setSyncError(null)
    try {
      await requestAccessToken()
      setIsConnected(true)
    } catch (e) {
      setSyncError(e.message)
    }
  }, [])

  const disconnect = useCallback(() => {
    const token = loadToken()
    driveDisconnect(token)
    setIsConnected(false)
    setBackupInfo(null)
    setSyncError(null)
  }, [])

  const initiateRestore = useCallback(async () => {
    setSyncError(null)
    const token = loadToken()
    if (!token) { setSyncError('Not connected to Google Drive'); return }
    let fileId = loadFileId()
    if (!fileId) {
      fileId = await findBackupFile(token).catch(() => null)
    }
    if (!fileId) { setSyncError('No backup found in Google Drive'); return }
    setIsRestoring(true)
    try {
      const backup = await downloadBackup(token, fileId)
      setPendingRestore(backup)
    } catch (e) {
      setSyncError(e.message)
    } finally {
      setIsRestoring(false)
    }
  }, [])

  const confirmRestore = useCallback(async () => {
    if (!pendingRestore) return
    setIsRestoring(true)
    try {
      await db.transaction(
        'rw',
        db.habits, db.completions, db.journal_entries, db.notification_prefs,
        db.symptom_types, db.symptoms, db.vital_types, db.vital_entries, db.google_fit_sync,
        async () => {
          await db.google_fit_sync.clear()
          await db.vital_entries.clear()
          await db.vital_types.clear()
          await db.symptoms.clear()
          await db.symptom_types.clear()
          await db.completions.clear()
          await db.journal_entries.clear()
          await db.notification_prefs.clear()
          await db.habits.clear()
          if (pendingRestore.habits?.length) await db.habits.bulkAdd(pendingRestore.habits)
          if (pendingRestore.completions?.length) await db.completions.bulkAdd(pendingRestore.completions)
          if (pendingRestore.journal_entries?.length) await db.journal_entries.bulkAdd(pendingRestore.journal_entries)
          if (pendingRestore.symptom_types?.length) await db.symptom_types.bulkAdd(pendingRestore.symptom_types)
          if (pendingRestore.symptoms?.length) await db.symptoms.bulkAdd(pendingRestore.symptoms)
          if (pendingRestore.vital_types?.length) await db.vital_types.bulkAdd(pendingRestore.vital_types)
          if (pendingRestore.vital_entries?.length) await db.vital_entries.bulkAdd(pendingRestore.vital_entries)
          if (pendingRestore.google_fit_sync?.length) await db.google_fit_sync.bulkAdd(pendingRestore.google_fit_sync)
        }
      )
      window.location.reload()
    } catch (e) {
      setSyncError(e.message)
      setIsRestoring(false)
    }
  }, [pendingRestore])

  const cancelRestore = useCallback(() => setPendingRestore(null), [])

  const exportZip = useCallback(async () => { await exportAllData(db) }, [])

  return (
    <SyncContext.Provider
      value={{
        isConnected, isSyncing, lastSyncedAt, syncError, backupInfo,
        isRestoring, pendingRestore,
        connect, disconnect, syncNow, initiateRestore, confirmRestore, cancelRestore, exportZip,
      }}
    >
      {children}
    </SyncContext.Provider>
  )
}

export function useSync() {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSync must be used within SyncProvider')
  return ctx
}
```

- [ ] **Step 4: Run the SyncContext tests**

```bash
npx vitest run src/contexts/SyncContext.test.jsx
```

Expected: all tests PASS

- [ ] **Step 5: Run full suite**

```bash
npx vitest run
```

Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/contexts/SyncContext.jsx src/contexts/SyncContext.test.jsx
git commit -m "feat: SyncContext with connect, syncNow, auto-sync"
```

---

### Task 7: SyncContext — Restore Flow Tests

**Files:**
- Modify: `src/contexts/SyncContext.test.jsx`

- [ ] **Step 1: Write the restore tests**

Append to `src/contexts/SyncContext.test.jsx`:

```jsx
describe('initiateRestore', () => {
  it('sets pendingRestore with downloaded backup', async () => {
    const { result } = renderHook(() => useSync(), { wrapper })
    await act(async () => { await result.current.initiateRestore() })
    expect(result.current.pendingRestore).not.toBeNull()
    expect(result.current.pendingRestore.version).toBe(1)
    expect(result.current.pendingRestore.habits).toHaveLength(1)
  })

  it('sets syncError when no backup file found', async () => {
    const { loadFileId, findBackupFile } = await import('../services/googleDrive')
    loadFileId.mockReturnValueOnce(null)
    findBackupFile.mockResolvedValueOnce(null)
    const { result } = renderHook(() => useSync(), { wrapper })
    await act(async () => { await result.current.initiateRestore() })
    expect(result.current.syncError).toBe('No backup found in Google Drive')
    expect(result.current.pendingRestore).toBeNull()
  })
})

describe('cancelRestore', () => {
  it('clears pendingRestore', async () => {
    const { result } = renderHook(() => useSync(), { wrapper })
    await act(async () => { await result.current.initiateRestore() })
    expect(result.current.pendingRestore).not.toBeNull()
    act(() => { result.current.cancelRestore() })
    expect(result.current.pendingRestore).toBeNull()
  })
})

describe('confirmRestore', () => {
  it('clears all tables and calls location.reload', async () => {
    const { db } = await import('../db/db')
    const reloadMock = vi.fn()
    vi.stubGlobal('location', { reload: reloadMock })

    const { result } = renderHook(() => useSync(), { wrapper })
    await act(async () => { await result.current.initiateRestore() })
    await act(async () => { await result.current.confirmRestore() })

    expect(db.habits.clear).toHaveBeenCalled()
    expect(db.vital_entries.clear).toHaveBeenCalled()
    expect(reloadMock).toHaveBeenCalled()

    vi.unstubAllGlobals()
  })
})
```

- [ ] **Step 2: Run restore tests**

```bash
npx vitest run src/contexts/SyncContext.test.jsx
```

Expected: all tests PASS

- [ ] **Step 3: Run full suite**

```bash
npx vitest run
```

Expected: all tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/contexts/SyncContext.test.jsx
git commit -m "test: add restore flow tests for SyncContext"
```

---

### Task 8: CloudSyncPanel UI Component

**Files:**
- Create: `src/components/sync/CloudSyncPanel.jsx`
- Create: `src/components/sync/CloudSyncPanel.module.css`

- [ ] **Step 1: Create the CSS**

Create `src/components/sync/CloudSyncPanel.module.css`:

```css
/* ── Shared card shell ─────────────────────────────────────────────────── */
.card {
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cardHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cardTitle {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-dim);
}

.cardDesc {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.45;
}

/* ── Connection status ─────────────────────────────────────────────────── */
.connectedBadge {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--green);
}

.connectedDot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--green);
  box-shadow: 0 0 5px var(--green);
  flex-shrink: 0;
}

.syncInfo {
  font-size: 12px;
  color: var(--text-muted);
}

/* ── Buttons ───────────────────────────────────────────────────────────── */
.connectBtn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  transition: border-color 0.15s, color 0.15s;
}
.connectBtn:hover { border-color: var(--accent); color: var(--text); }
.connectBtn:disabled { opacity: 0.5; cursor: not-allowed; }

.actionRow {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.syncBtn {
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  background: var(--accent-dim);
  border: 1px solid rgba(61,142,240,0.3);
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
  transition: background 0.15s;
  white-space: nowrap;
}
.syncBtn:hover:not(:disabled) { background: rgba(61,142,240,0.2); }
.syncBtn:disabled { opacity: 0.5; cursor: not-allowed; }

.restoreBtn {
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
  transition: border-color 0.15s;
}
.restoreBtn:hover:not(:disabled) { border-color: var(--border); color: var(--text); }
.restoreBtn:disabled { opacity: 0.5; cursor: not-allowed; }

.disconnectBtn {
  font-size: 11px;
  color: var(--text-dim);
  transition: color 0.15s;
}
.disconnectBtn:hover { color: #ef4444; }

.exportBtn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  transition: border-color 0.15s, color 0.15s;
}
.exportBtn:hover:not(:disabled) { border-color: var(--accent); color: var(--text); }
.exportBtn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Error ─────────────────────────────────────────────────────────────── */
.error {
  font-size: 12px;
  color: #ef4444;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  margin: 0;
}

/* ── Restore confirmation ───────────────────────────────────────────────── */
.restoreConfirm {
  background: rgba(239,68,68,0.06);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: var(--radius-sm);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.restoreWarning {
  font-size: 12px;
  color: var(--text);
  font-weight: 600;
}

.restoreMeta {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.5;
}

.restoreDestructive {
  font-size: 11px;
  color: #ef4444;
}

.restoreActions {
  display: flex;
  gap: 8px;
}

.confirmBtn {
  padding: 7px 14px;
  border-radius: var(--radius-sm);
  background: #ef4444;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  transition: opacity 0.15s;
}
.confirmBtn:hover { opacity: 0.88; }
.confirmBtn:disabled { opacity: 0.5; }

.cancelBtn {
  padding: 7px 14px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  font-size: 12px;
}

/* ── Overlay spinner ────────────────────────────────────────────────────── */
.restoring {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 0;
  font-size: 13px;
  color: var(--text-muted);
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

- [ ] **Step 2: Create the component**

Create `src/components/sync/CloudSyncPanel.jsx`:

```jsx
import { useState, useCallback } from 'react'
import { useSync } from '../../contexts/SyncContext'
import styles from './CloudSyncPanel.module.css'

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function formatDate(isoStr) {
  if (!isoStr) return 'Never'
  return new Date(isoStr).toLocaleDateString('en', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function countSummary(backup) {
  if (!backup) return ''
  const parts = [
    backup.habits?.length && `${backup.habits.length} habits`,
    backup.completions?.length && `${backup.completions.length} completions`,
    backup.journal_entries?.length && `${backup.journal_entries.length} journal entries`,
    backup.symptoms?.length && `${backup.symptoms.length} symptoms`,
    backup.vital_entries?.length && `${backup.vital_entries.length} vitals`,
  ].filter(Boolean)
  return parts.join(', ')
}

export function CloudSyncPanel() {
  const {
    isConnected, isSyncing, lastSyncedAt, syncError, backupInfo,
    isRestoring, pendingRestore,
    connect, disconnect, syncNow, initiateRestore, confirmRestore, cancelRestore,
  } = useSync()

  const [connecting, setConnecting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const { exportZip } = useSync()

  const handleConnect = useCallback(async () => {
    setConnecting(true)
    await connect()
    setConnecting(false)
  }, [connect])

  const handleExport = useCallback(async () => {
    setExporting(true)
    try { await exportZip() } finally { setExporting(false) }
  }, [exportZip])

  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    return (
      <>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Cloud Backup</span>
          </div>
          <p className={styles.cardDesc} style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            Set VITE_GOOGLE_CLIENT_ID to enable Google Drive backup.
          </p>
        </div>
        <ExportCard exporting={exporting} onExport={handleExport} />
      </>
    )
  }

  return (
    <>
      {/* ── Cloud Backup card ─────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Cloud Backup</span>
          {isConnected && (
            <div className={styles.connectedBadge}>
              <span className={styles.connectedDot} />
              Connected
            </div>
          )}
        </div>

        {syncError && <p className={styles.error}>{syncError}</p>}

        {isRestoring && !pendingRestore && (
          <div className={styles.restoring}>
            <span className={styles.spinner} />
            Downloading backup…
          </div>
        )}

        {pendingRestore && (
          <div className={styles.restoreConfirm}>
            <span className={styles.restoreWarning}>Restore from backup?</span>
            <span className={styles.restoreMeta}>
              {formatDate(pendingRestore.exportedAt)}{' '}
              — {countSummary(pendingRestore)}
            </span>
            <span className={styles.restoreDestructive}>
              This will replace ALL current data.
            </span>
            <div className={styles.restoreActions}>
              <button className={styles.cancelBtn} onClick={cancelRestore}>
                Cancel
              </button>
              <button
                className={styles.confirmBtn}
                onClick={confirmRestore}
                disabled={isRestoring}
              >
                {isRestoring ? 'Restoring…' : 'Restore'}
              </button>
            </div>
          </div>
        )}

        {!isConnected && !pendingRestore && (
          <>
            <p className={styles.cardDesc}>
              Connect Google Drive to automatically back up your data.
            </p>
            <button
              className={styles.connectBtn}
              onClick={handleConnect}
              disabled={connecting}
            >
              <span>☁️</span>
              <span>{connecting ? 'Connecting…' : 'Connect Google Drive'}</span>
            </button>
          </>
        )}

        {isConnected && !pendingRestore && (
          <>
            <span className={styles.syncInfo}>
              {backupInfo
                ? `Last backup: ${formatDate(backupInfo.modifiedTime)} · ${formatSize(backupInfo.size)}`
                : lastSyncedAt
                  ? `Last backup: ${formatDate(new Date(lastSyncedAt).toISOString())}`
                  : 'Never backed up'}
            </span>
            <div className={styles.actionRow}>
              <button
                className={styles.syncBtn}
                onClick={() => syncNow(false)}
                disabled={isSyncing}
              >
                {isSyncing ? 'Syncing…' : 'Sync Now'}
              </button>
              <button
                className={styles.restoreBtn}
                onClick={initiateRestore}
                disabled={isSyncing || isRestoring}
              >
                Restore…
              </button>
              <button
                className={styles.disconnectBtn}
                onClick={disconnect}
                disabled={isSyncing}
              >
                Disconnect
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Export Data card ──────────────────────────────────── */}
      <ExportCard exporting={exporting} onExport={handleExport} />
    </>
  )
}

function ExportCard({ exporting, onExport }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>Export Data</span>
      </div>
      <p className={styles.cardDesc}>Download all your data as CSV + JSON files.</p>
      <button className={styles.exportBtn} onClick={onExport} disabled={exporting}>
        <span>📦</span>
        <span>{exporting ? 'Building zip…' : 'Export Zip'}</span>
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Run full test suite to confirm no regressions**

```bash
npx vitest run
```

Expected: all tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/sync/CloudSyncPanel.jsx src/components/sync/CloudSyncPanel.module.css
git commit -m "feat: CloudSyncPanel UI component"
```

---

### Task 9: Settings Screen

**Files:**
- Create: `src/screens/Settings.jsx`
- Create: `src/screens/Settings.module.css`

- [ ] **Step 1: Create the CSS**

Create `src/screens/Settings.module.css`:

```css
.screen {
  height: 100%;
  overflow-y: auto;
  background: var(--bg);
  padding: 20px 16px 40px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.heading {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-dim);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-subtle);
}

.section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
```

- [ ] **Step 2: Create the screen**

Create `src/screens/Settings.jsx`:

```jsx
import { CloudSyncPanel } from '../components/sync/CloudSyncPanel'
import styles from './Settings.module.css'

export function Settings() {
  return (
    <div className={styles.screen}>
      <div className={styles.section}>
        <span className={styles.heading}>Data</span>
        <CloudSyncPanel />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run full suite**

```bash
npx vitest run
```

Expected: all tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/screens/Settings.jsx src/screens/Settings.module.css
git commit -m "feat: Settings screen with cloud sync and export"
```

---

### Task 10: Wire into App & BottomNav

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/BottomNav.jsx`

- [ ] **Step 1: Add Settings tab to BottomNav**

In `src/components/BottomNav.jsx`, update the TABS array:

```js
const TABS = [
  { id: 'today', label: 'Today', icon: '✅' },
  { id: 'habits', label: 'Habits', icon: '⚙️' },
  { id: 'journal', label: 'Journal', icon: '📓' },
  { id: 'health', label: 'Health', icon: '🩺' },
  { id: 'stats', label: 'Stats', icon: '📊' },
  { id: 'settings', label: 'Settings', icon: '🔧' },
]
```

- [ ] **Step 2: Add SyncProvider and Settings screen to App.jsx**

Replace the full contents of `src/App.jsx`:

```jsx
import { useState } from 'react'
import { HabitsProvider } from './contexts/HabitsContext'
import { JournalProvider } from './contexts/JournalContext'
import { HealthProvider } from './contexts/HealthContext'
import { VitalsProvider } from './contexts/VitalsContext'
import { SyncProvider } from './contexts/SyncContext'
import { Today } from './screens/Today'
import { Habits } from './screens/Habits'
import { Journal } from './screens/Journal'
import { Health } from './screens/Health'
import { Stats } from './screens/Stats'
import { Settings } from './screens/Settings'
import { BottomNav } from './components/BottomNav'
import styles from './App.module.css'

export default function App() {
  const [activeTab, setActiveTab] = useState('today')
  return (
    <HabitsProvider>
      <JournalProvider>
        <HealthProvider>
          <VitalsProvider>
            <SyncProvider>
              <div className={styles.app}>
                <main className={styles.main}>
                  {activeTab === 'today' && <Today />}
                  {activeTab === 'habits' && <Habits />}
                  {activeTab === 'journal' && <Journal />}
                  {activeTab === 'health' && <Health />}
                  {activeTab === 'stats' && <Stats />}
                  {activeTab === 'settings' && <Settings />}
                </main>
                <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
              </div>
            </SyncProvider>
          </VitalsProvider>
        </HealthProvider>
      </JournalProvider>
    </HabitsProvider>
  )
}
```

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: all tests PASS

- [ ] **Step 4: Build to confirm no compile errors**

```bash
npx vite build 2>&1 | tail -6
```

Expected: `✓ built in ...ms`

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/components/BottomNav.jsx
git commit -m "feat: add Settings tab and wire SyncProvider into App"
```

---

## Post-implementation

After all tasks are complete, run the full suite one final time:

```bash
npx vitest run
```

Then push:

```bash
git push
```

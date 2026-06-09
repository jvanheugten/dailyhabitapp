# Cloud Sync & Export — Design Spec

## Goal

Protect user data against accidental loss (browser clear, new device) via automatic Google Drive backup, and provide full data portability via a downloadable zip of CSV + JSON files.

## Architecture

Four new units:

| Unit | File | Responsibility |
|---|---|---|
| Drive service | `src/services/googleDrive.js` | GIS OAuth (`drive.appdata` scope), upload/download/metadata for backup JSON |
| Export service | `src/services/exportService.js` | Reads all Dexie tables, builds CSVs + full JSON, zips with JSZip, triggers download |
| Sync context | `src/contexts/SyncContext.jsx` | Drive auth state, last-sync timestamp, auto-sync on mount, restore orchestration |
| Sync panel UI | `src/components/sync/CloudSyncPanel.jsx` | Connect, Sync Now, Restore, Disconnect, Export Zip — card-based, matches GoogleFitSync style |

One new dependency: **JSZip** (`npm install jszip`).

The panel lives in a new **Settings tab** (6th tab, ⚙ icon). `GoogleFitSync` stays in the Health screen — Fit and Drive are independent OAuth scopes.

## Drive Sync Service (`googleDrive.js`)

**Auth:** GIS implicit token flow, scope `https://www.googleapis.com/auth/drive.appdata`. Token stored in `sessionStorage` under key `drive_token`. Separate `initTokenClient()` from the Fit token client. Same 55-min expiry pattern.

**Backup file:** `dailyhabitapp-backup.json` in Drive `appDataFolder`. On first backup, create the file and store the returned Drive file ID in `localStorage` (`drive_backup_file_id`). On subsequent backups, update the same file ID to avoid duplicates. If the stored ID is missing or stale, search for the file by name before creating.

**Operations:**

- `saveToken(token)` / `loadToken()` / `clearToken()` / `isConnected()` — sessionStorage helpers
- `requestAccessToken()` — GIS popup, returns token
- `disconnect(token)` — revoke token, clear sessionStorage + localStorage file ID
- `getBackupInfo(token)` — GET file metadata (modifiedTime, size); returns `{ modifiedTime, size }` or `null`
- `uploadBackup(token, data)` — multipart MIME upload to `appDataFolder`; returns Drive file ID
- `downloadBackup(token, fileId)` — GET file content; returns parsed JSON
- `findBackupFile(token)` — list `appDataFolder` filtered by name, returns file ID or null

## Export Service (`exportService.js`)

Pure async function, no React dependency.

**`exportAllData(db)`** — reads all 8 Dexie tables, serialises to CSV and full JSON, zips with JSZip, triggers browser download via temporary `<a>` + object URL.

**Zip filename:** `dailyhabitapp-export-YYYY-MM-DD.zip`

**Zip contents:**

| File | Fields |
|---|---|
| `habits.csv` | id, name, days (semicolon-separated dow integers), time, streak |
| `completions.csv` | id, habitId, date |
| `journal_entries.csv` | id, date, text, createdAt, updatedAt |
| `symptom_types.csv` | id, name, createdAt |
| `symptoms.csv` | id, symptom_type_id, region, view, intensity, pain_type, notes, timestamp |
| `vital_types.csv` | id, name, unit, value_schema, normal_min, normal_max, is_standard |
| `vital_entries.csv` | id, vital_type_id, value, notes, timestamp, source |
| `backup.json` | Full dump — same format as Drive backup, for re-import |

CSV quoting: wrap any field containing `,`, `"`, or newlines in double-quotes; escape internal `"` as `""`.

**`buildBackupJSON(db)`** — shared helper used by both `exportAllData` and the Drive upload. Returns:
```json
{
  "version": 1,
  "exportedAt": "<ISO>",
  "habits": [...],
  "completions": [...],
  "journal_entries": [...],
  "symptom_types": [...],
  "symptoms": [...],
  "vital_types": [...],
  "vital_entries": [...],
  "google_fit_sync": [...]
}
```

## Sync Context (`SyncContext.jsx`)

Wraps the app (added to `main.jsx` provider chain).

**State:** `isConnected`, `isSyncing`, `lastSyncedAt` (ms epoch, from `localStorage`), `syncError`, `backupInfo` (`{ modifiedTime, size }`), `isRestoring`, `pendingRestore` (parsed backup JSON awaiting confirmation).

**Auto-sync on mount:** if `isConnected && Date.now() - lastSyncedAt > 86_400_000`, call `syncNow()` silently (no error surfaced to user on background sync failure — just updates `syncError` state).

**`syncNow()`** — calls `buildBackupJSON(db)`, then `uploadBackup(token, data)`, updates `lastSyncedAt` in `localStorage` and state.

**`initiateRestore()`** — calls `downloadBackup`, sets `pendingRestore` (triggers confirmation UI in panel).

**`confirmRestore()`** — clears all Dexie tables in dependency order, bulk-adds records from `pendingRestore`, reloads the page (simplest way to re-initialise all contexts from fresh DB state).

**`cancelRestore()`** — clears `pendingRestore`.

**Exposed via context:** `{ isConnected, isSyncing, lastSyncedAt, syncError, backupInfo, isRestoring, pendingRestore, connect, disconnect, syncNow, initiateRestore, confirmRestore, cancelRestore, exportZip }`

## UI (`CloudSyncPanel.jsx` + Settings screen)

### New Settings Tab

6th tab in `App.jsx` tab bar, label **Settings**, icon ⚙. Single scrollable page with two cards.

### Cloud Backup Card

States:

**Not connected:**
```
Cloud Backup
Connect Google Drive to automatically back up your data.
[Connect Google Drive]
```

**Connecting:** button shows spinner.

**Connected, idle:**
```
Cloud Backup                              ✓ Connected
Last backup: Jun 8, 2026 · 14 KB
[Sync Now]  [Restore…]  [Disconnect]
```

**Syncing:** "Sync Now" shows spinner + "Syncing…", other buttons disabled.

**Error:** red inline message below buttons: `"Sync failed — tap Sync Now to retry"`

**Restore confirmation (inline, replaces button row):**
```
Restore from backup?
Jun 8 2026 — 142 habits, 1,840 completions,
23 journal entries, 56 symptoms, 312 vitals
This will replace ALL current data.
[Cancel]  [Restore]
```

**Restoring:** full-card overlay spinner "Restoring…"

### Export Data Card

```
Export Data
Download all your data as CSV + JSON files.
[Export Zip]
```

No state beyond button active/loading. On tap: build zip, trigger download, done.

## Error Handling

- Drive token expired mid-session: catch 401, clear token, set `isConnected = false`, surface "Reconnect Google Drive" message.
- Upload/download network failure: set `syncError`, do not update `lastSyncedAt`.
- Restore with incompatible backup version: check `backup.version` field; if not `1`, show "Incompatible backup format" and abort.
- JSZip failure: catch and show inline error on Export card.

## Testing

- `googleDrive.js`: unit-test token helpers; mock `fetch` for upload/download/metadata calls.
- `exportService.js`: unit-test CSV quoting logic and `buildBackupJSON` output shape.
- `SyncContext`: test auto-sync threshold logic with mocked `Date.now()`; test `confirmRestore` table-clearing sequence.
- Integration: seed DB, export zip, verify file list and CSV row counts.

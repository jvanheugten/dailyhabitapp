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
  const [lastSyncedAt, setLastSyncedAt] = useState(() =>
    Number(localStorage.getItem(LAST_SYNCED_KEY) ?? 0)
  )
  const [syncError, setSyncError] = useState(null)
  const [backupInfo, setBackupInfo] = useState(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [pendingRestore, setPendingRestore] = useState(null)

  useEffect(() => {
    if (!isConnected) return
    const token = loadToken()
    const fileId = loadFileId()
    if (token && fileId) {
      getBackupInfo(token, fileId)
        .then(setBackupInfo)
        .catch((e) => {
          if (e.message === 'drive_token_expired') setIsConnected(false)
        })
    }
  }, [isConnected, lastSyncedAt])

  const syncNow = useCallback(async (silent = false) => {
    let token = loadToken()
    if (!token && silent) return // silent auto-sync must NOT trigger OAuth popup
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

  // Intentional mount-only snapshot — adding isConnected/lastSyncedAt as deps would
  // re-trigger after every sync, creating an infinite loop.
  useEffect(() => {
    if (isConnected && Date.now() - lastSyncedAt > AUTO_SYNC_MS) {
      setTimeout(() => syncNow(true), 0)
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
    if (!token) {
      setIsConnected(false)
      setSyncError('Not connected to Google Drive')
      return
    }
    let fileId = loadFileId()
    if (!fileId) {
      fileId = await findBackupFile(token).catch(() => null)
    }
    if (!fileId) {
      setSyncError('No backup found in Google Drive')
      return
    }
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
        db.habits,
        db.completions,
        db.journal_entries,
        db.notification_prefs,
        db.symptom_types,
        db.symptoms,
        db.vital_types,
        db.vital_entries,
        db.google_fit_sync,
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
          if (pendingRestore.completions?.length)
            await db.completions.bulkAdd(pendingRestore.completions)
          if (pendingRestore.journal_entries?.length)
            await db.journal_entries.bulkPut(pendingRestore.journal_entries)
          if (pendingRestore.notification_prefs?.length)
            await db.notification_prefs.bulkAdd(pendingRestore.notification_prefs)
          if (pendingRestore.symptom_types?.length)
            await db.symptom_types.bulkAdd(pendingRestore.symptom_types)
          if (pendingRestore.symptoms?.length) await db.symptoms.bulkAdd(pendingRestore.symptoms)
          if (pendingRestore.vital_types?.length)
            await db.vital_types.bulkAdd(pendingRestore.vital_types)
          if (pendingRestore.vital_entries?.length)
            await db.vital_entries.bulkAdd(pendingRestore.vital_entries)
          if (pendingRestore.google_fit_sync?.length)
            await db.google_fit_sync.bulkAdd(pendingRestore.google_fit_sync)
        }
      )
      window.location.reload()
    } catch (e) {
      setSyncError(e.message)
      setIsRestoring(false)
    }
  }, [pendingRestore])

  const cancelRestore = useCallback(() => setPendingRestore(null), [])

  const exportZip = useCallback(async () => {
    await exportAllData(db)
  }, [])

  return (
    <SyncContext.Provider
      value={{
        isConnected,
        isSyncing,
        lastSyncedAt,
        syncError,
        backupInfo,
        isRestoring,
        pendingRestore,
        connect,
        disconnect,
        syncNow,
        initiateRestore,
        confirmRestore,
        cancelRestore,
        exportZip,
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

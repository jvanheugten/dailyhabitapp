import { useState, useEffect, useCallback } from 'react'
import { useVitals } from '../../contexts/VitalsContext'
import { db } from '../../db/db'
import {
  isConnected,
  requestAccessToken,
  loadToken,
  disconnect as gDisconnect,
  fetchAllFitnessData,
} from '../../services/googleFit'
import styles from './GoogleFitSync.module.css'

export function GoogleFitSync() {
  const { getVitalTypeMap, bulkImportGoogleFitEntries } = useVitals()
  const [connected, setConnected] = useState(() => isConnected())
  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    db.google_fit_sync
      .orderBy('id')
      .last()
      .then((row) => {
        if (row?.last_synced) setLastSynced(row.last_synced)
      })
  }, [])

  const handleConnect = useCallback(async () => {
    setError(null)
    try {
      await requestAccessToken()
      setConnected(true)
    } catch (e) {
      setError(e.message)
    }
  }, [])

  const handleSync = useCallback(async () => {
    setError(null)
    setSyncing(true)
    try {
      let token = loadToken()
      if (!token) {
        token = await requestAccessToken()
        setConnected(true)
      }
      const typeMap = getVitalTypeMap()
      const entries = await fetchAllFitnessData(token, typeMap, lastSynced)
      await bulkImportGoogleFitEntries(entries)
      const now = new Date().toISOString()
      await db.google_fit_sync.put({ data_type: 'all', last_synced: now, access_token: '' })
      setLastSynced(now)
    } catch (e) {
      setError(e.message)
    } finally {
      setSyncing(false)
    }
  }, [getVitalTypeMap, bulkImportGoogleFitEntries, lastSynced])

  const handleDisconnect = useCallback(async () => {
    gDisconnect()
    await db.google_fit_sync.clear()
    setConnected(false)
    setLastSynced(null)
    setError(null)
  }, [])

  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    return (
      <div className={styles.wrap}>
        <span className={styles.noConfig}>Google Fit: set VITE_GOOGLE_CLIENT_ID to enable</span>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.label}>Google Fit</span>
        {connected && (
          <button className={styles.disconnectBtn} onClick={handleDisconnect}>
            Disconnect
          </button>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {!connected ? (
        <button className={styles.connectBtn} onClick={handleConnect}>
          <span>🔗</span>
          <span>Connect Google Fit</span>
        </button>
      ) : (
        <div className={styles.connectedRow}>
          <div className={styles.syncInfo}>
            <span className={styles.connectedDot} />
            <span className={styles.syncTime}>
              {lastSynced
                ? `Last synced ${new Date(lastSynced).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                : 'Never synced'}
            </span>
          </div>
          <button className={styles.syncBtn} onClick={handleSync} disabled={syncing}>
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>
      )}
    </div>
  )
}

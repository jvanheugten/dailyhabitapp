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
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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
  } = useSync()

  const [connecting, setConnecting] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleConnect = useCallback(async () => {
    setConnecting(true)
    try {
      await connect()
    } finally {
      setConnecting(false)
    }
  }, [connect])

  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      await exportZip()
    } finally {
      setExporting(false)
    }
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
              {formatDate(pendingRestore.exportedAt)} — {countSummary(pendingRestore)}
            </span>
            <span className={styles.restoreDestructive}>This will replace ALL current data.</span>
            <div className={styles.restoreActions}>
              <button className={styles.cancelBtn} onClick={cancelRestore}>
                Cancel
              </button>
              <button className={styles.confirmBtn} onClick={confirmRestore} disabled={isRestoring}>
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
            <button className={styles.connectBtn} onClick={handleConnect} disabled={connecting}>
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
              <button className={styles.disconnectBtn} onClick={disconnect} disabled={isSyncing}>
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

export function ExportCard({ exporting, onExport }) {
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

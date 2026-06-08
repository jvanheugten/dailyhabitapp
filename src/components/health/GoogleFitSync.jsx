import styles from './GoogleFitSync.module.css'

// Placeholder — wired up with real OAuth in Plan 2b (Google Fit Integration)
export function GoogleFitSync() {
  return (
    <button className={styles.btn} disabled aria-label="Sync with Google Fit (coming soon)">
      <span>🔗</span>
      <span>Google Fit — coming soon</span>
    </button>
  )
}

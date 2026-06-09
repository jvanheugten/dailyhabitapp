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

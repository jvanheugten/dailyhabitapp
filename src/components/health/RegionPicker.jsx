import { REGIONS } from './regions-ui'
import styles from './RegionPicker.module.css'

export { REGIONS }

export function RegionPicker({ onSelect }) {
  return (
    <div className={styles.wrap}>
      <p className={styles.hint}>Where is the pain?</p>
      <div className={styles.grid}>
        {REGIONS.map((r) => (
          <button key={r} className={styles.chip} onClick={() => onSelect(r)}>
            {r}
          </button>
        ))}
      </div>
    </div>
  )
}

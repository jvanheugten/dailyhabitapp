import { INTENSITY_LEVELS } from '../../utils/intensity'
import styles from './IntensityPicker.module.css'

export function IntensityPicker({ value, onChange }) {
  return (
    <div className={styles.picker}>
      {INTENSITY_LEVELS.map((level) => (
        <button
          key={level.value}
          type="button"
          className={`${styles.level} ${value === level.value ? styles.selected : ''}`}
          style={{ '--color': level.color }}
          onClick={() => onChange(level.value)}
          aria-pressed={value === level.value}
        >
          <span className={styles.dot} />
          <span className={styles.label}>{level.label}</span>
        </button>
      ))}
    </div>
  )
}

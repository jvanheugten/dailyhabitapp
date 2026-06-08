import { intensityColor } from '../../utils/intensity'
import { DrawingCanvas } from './DrawingCanvas'
import styles from './BodyRegion.module.css'

// Regions that only have front/back (no left/right view)
const FRONT_BACK_ONLY = ['abdomen', 'back']

const REGION_LABELS = {
  head: 'Head',
  chest: 'Chest',
  abdomen: 'Abdomen',
  back: 'Back',
  left_arm: 'Left Arm',
  right_arm: 'Right Arm',
  left_hand: 'Left Hand',
  right_hand: 'Right Hand',
  left_leg: 'Left Leg',
  right_leg: 'Right Leg',
  left_foot: 'Left Foot',
  right_foot: 'Right Foot',
}

const ALL_VIEWS = ['front', 'back', 'left', 'right']

export function BodyRegion({ region, view, onViewChange, paths, onPathsChange, intensity }) {
  const color = intensityColor(intensity)
  const availableViews = FRONT_BACK_ONLY.includes(region) ? ['front', 'back'] : ALL_VIEWS
  const baseUrl = `${import.meta.env.BASE_URL}body/${region}-${view}.svg`

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.regionLabel}>{REGION_LABELS[region]}</span>
      </div>

      <div className={styles.viewSelector}>
        {availableViews.map((v) => (
          <button
            key={v}
            type="button"
            className={`${styles.viewBtn} ${view === v ? styles.activeView : ''}`}
            onClick={() => onViewChange(v)}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      <div className={styles.drawArea}>
        <img
          src={baseUrl}
          alt={`${REGION_LABELS[region]} ${view} view`}
          className={styles.regionImg}
        />
        <svg viewBox="0 0 200 300" className={styles.pathLayer} aria-hidden="true">
          {paths.map((p, i) => (
            <path
              key={i}
              d={p.d}
              stroke={p.color}
              strokeWidth={p.strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.75}
            />
          ))}
        </svg>
        <DrawingCanvas paths={paths} onPathsChange={onPathsChange} color={color} strokeWidth={10} />
      </div>
    </div>
  )
}

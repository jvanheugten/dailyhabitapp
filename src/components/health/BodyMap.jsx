import { useState } from 'react'
import { intensityColor } from '../../utils/intensity'
import { REGIONS } from './regions'
import styles from './BodyMap.module.css'

const FRONT_REGIONS = [
  'head',
  'chest',
  'abdomen',
  'left_arm',
  'right_arm',
  'left_hand',
  'right_hand',
  'left_leg',
  'right_leg',
  'left_foot',
  'right_foot',
]
const BACK_REGIONS = [
  'head',
  'back',
  'left_arm',
  'right_arm',
  'left_hand',
  'right_hand',
  'left_leg',
  'right_leg',
  'left_foot',
  'right_foot',
]

export function BodyMap({ onRegionSelect, symptoms = [] }) {
  const [view, setView] = useState('front')
  const activeRegions = view === 'front' ? FRONT_REGIONS : BACK_REGIONS
  const baseUrl = `${import.meta.env.BASE_URL}body/full-${view}.svg`

  // Map region → most severe recent symptom intensity for dot colouring
  const regionIntensity = {}
  symptoms.forEach((s) => {
    const current = regionIntensity[s.region] ?? 0
    if (s.intensity > current) regionIntensity[s.region] = s.intensity
  })

  return (
    <div className={styles.container}>
      <div className={styles.toggle}>
        <button className={view === 'front' ? styles.active : ''} onClick={() => setView('front')}>
          Front
        </button>
        <button className={view === 'back' ? styles.active : ''} onClick={() => setView('back')}>
          Back
        </button>
      </div>
      <div className={styles.svgWrapper}>
        <img src={baseUrl} alt={`Body ${view} view`} className={styles.bodyImg} />
        <svg viewBox="0 0 200 440" className={styles.overlay} aria-hidden="false">
          {REGIONS.filter((r) => activeRegions.includes(r.id)).map((region) => (
            <g key={region.id}>
              <circle
                cx={region.cx}
                cy={region.cy}
                r={region.r}
                fill="transparent"
                stroke="transparent"
                className={styles.hitArea}
                role="button"
                tabIndex={0}
                aria-label={`Tap ${region.label}`}
                onClick={() => onRegionSelect(region.id)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onRegionSelect(region.id)}
                style={{ cursor: 'pointer' }}
              />
              {regionIntensity[region.id] && (
                <circle
                  cx={region.cx}
                  cy={region.cy}
                  r={7}
                  fill={intensityColor(regionIntensity[region.id])}
                  opacity={0.8}
                  style={{ pointerEvents: 'none' }}
                />
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

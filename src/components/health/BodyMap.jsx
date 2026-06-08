import { useState } from 'react'
import { intensityColor } from '../../utils/intensity'
import styles from './BodyMap.module.css'

// Regions and their approximate hit-area centers in the 0-200 × 0-440 viewBox
const REGIONS = [
  { id: 'head', cx: 100, cy: 38, r: 28, label: 'Head' },
  { id: 'chest', cx: 100, cy: 110, r: 30, label: 'Chest' },
  { id: 'abdomen', cx: 100, cy: 165, r: 25, label: 'Abdomen' },
  { id: 'back', cx: 100, cy: 165, r: 25, label: 'Back' },
  { id: 'left_arm', cx: 38, cy: 140, r: 18, label: 'Left Arm' },
  { id: 'right_arm', cx: 162, cy: 140, r: 18, label: 'Right Arm' },
  { id: 'left_hand', cx: 28, cy: 195, r: 13, label: 'Left Hand' },
  { id: 'right_hand', cx: 172, cy: 195, r: 13, label: 'Right Hand' },
  { id: 'left_leg', cx: 72, cy: 290, r: 20, label: 'Left Leg' },
  { id: 'right_leg', cx: 128, cy: 290, r: 20, label: 'Right Leg' },
  { id: 'left_foot', cx: 68, cy: 395, r: 15, label: 'Left Foot' },
  { id: 'right_foot', cx: 132, cy: 395, r: 15, label: 'Right Foot' },
]

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
                aria-label={`Tap ${region.label}`}
                onClick={() => onRegionSelect(region.id)}
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

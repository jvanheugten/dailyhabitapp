import { useState } from 'react'
import { intensityColor } from '../../utils/intensity'
import styles from './BodyMap.module.css'

// All region shapes use a shared 100×218 coordinate space.
// Each shape is the actual anatomical region — click accuracy is exact.

const LEFT_ARM_D = 'M20,36 C15,39 8,50 7,65 L7,104 C9,105 14,106 20,104 L20,36 Z'
const RIGHT_ARM_D = 'M80,36 C85,39 92,50 93,65 L93,104 C91,105 86,106 80,104 L80,36 Z'
const LEFT_LEG_D = 'M24,117 L44,117 C44,135 43,158 42,180 L40,195 L22,195 C21,178 21,155 24,117 Z'
const RIGHT_LEG_D = 'M56,117 L76,117 C79,155 79,178 78,195 L60,195 L58,180 C57,158 56,135 56,117 Z'
const LEFT_FOOT_D = 'M18,193 L42,193 L44,205 C38,213 14,211 11,202 Z'
const RIGHT_FOOT_D = 'M58,193 L82,193 L89,202 C86,211 62,213 56,205 Z'

const FRONT_REGIONS = [
  { id: 'head', label: 'Head', type: 'ellipse', cx: 50, cy: 14, rx: 12, ry: 13 },
  {
    id: 'chest',
    label: 'Chest',
    type: 'path',
    d: 'M46,26 L54,26 C62,27 76,32 80,40 L80,76 L20,76 C20,32 38,27 46,26 Z',
  },
  {
    id: 'abdomen',
    label: 'Abdomen',
    type: 'path',
    d: 'M20,76 L80,76 L78,101 C76,112 68,118 60,118 L40,118 C32,118 24,112 22,101 Z',
  },
  { id: 'left_arm', label: 'Left Arm', type: 'path', d: LEFT_ARM_D },
  { id: 'right_arm', label: 'Right Arm', type: 'path', d: RIGHT_ARM_D },
  { id: 'left_hand', label: 'Left Hand', type: 'ellipse', cx: 13, cy: 110, rx: 7, ry: 8 },
  { id: 'right_hand', label: 'Right Hand', type: 'ellipse', cx: 87, cy: 110, rx: 7, ry: 8 },
  { id: 'left_leg', label: 'Left Leg', type: 'path', d: LEFT_LEG_D },
  { id: 'right_leg', label: 'Right Leg', type: 'path', d: RIGHT_LEG_D },
  { id: 'left_foot', label: 'Left Foot', type: 'path', d: LEFT_FOOT_D },
  { id: 'right_foot', label: 'Right Foot', type: 'path', d: RIGHT_FOOT_D },
]

const BACK_REGIONS = [
  { id: 'head', label: 'Head', type: 'ellipse', cx: 50, cy: 14, rx: 12, ry: 13 },
  {
    id: 'back',
    label: 'Back',
    type: 'path',
    d: 'M46,26 L54,26 C62,27 76,32 80,40 L80,118 C76,126 68,130 60,130 L40,130 C32,130 24,126 20,118 L20,40 C24,32 38,27 46,26 Z',
  },
  { id: 'left_arm', label: 'Left Arm', type: 'path', d: LEFT_ARM_D },
  { id: 'right_arm', label: 'Right Arm', type: 'path', d: RIGHT_ARM_D },
  { id: 'left_hand', label: 'Left Hand', type: 'ellipse', cx: 13, cy: 110, rx: 7, ry: 8 },
  { id: 'right_hand', label: 'Right Hand', type: 'ellipse', cx: 87, cy: 110, rx: 7, ry: 8 },
  { id: 'left_leg', label: 'Left Leg', type: 'path', d: LEFT_LEG_D },
  { id: 'right_leg', label: 'Right Leg', type: 'path', d: RIGHT_LEG_D },
  { id: 'left_foot', label: 'Left Foot', type: 'path', d: LEFT_FOOT_D },
  { id: 'right_foot', label: 'Right Foot', type: 'path', d: RIGHT_FOOT_D },
]

function Shape({ region, fill, fillOpacity, stroke, strokeWidth, ...rest }) {
  const shared = { fill, fillOpacity, stroke, strokeWidth, ...rest }
  if (region.type === 'ellipse')
    return <ellipse cx={region.cx} cy={region.cy} rx={region.rx} ry={region.ry} {...shared} />
  return <path d={region.d} {...shared} />
}

export function BodyMap({ onRegionSelect, symptoms = [] }) {
  const [view, setView] = useState('front')
  const [hovered, setHovered] = useState(null)

  const regions = view === 'front' ? FRONT_REGIONS : BACK_REGIONS

  const regionIntensity = {}
  symptoms.forEach((s) => {
    const cur = regionIntensity[s.region] ?? 0
    if (s.intensity > cur) regionIntensity[s.region] = s.intensity
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

      <div className={styles.mapWrap}>
        <svg viewBox="0 0 100 218" className={styles.svg} aria-label="Body map">
          {/* Base fill layer — gives the body its dark shape */}
          {regions.map((r) => (
            <Shape
              key={`base-${r.id}`}
              region={r}
              fill="#0b1624"
              fillOpacity={1}
              stroke="#1a2d42"
              strokeWidth={0.6}
            />
          ))}

          {/* Interactive layer */}
          {regions.map((r) => {
            const intensity = regionIntensity[r.id]
            const isHovered = hovered === r.id
            const icolor = intensity ? intensityColor(intensity) : null

            return (
              <Shape
                key={`hit-${r.id}`}
                region={r}
                fill={icolor ?? (isHovered ? 'rgba(61,142,240,0.22)' : 'transparent')}
                fillOpacity={intensity ? 0.45 : 1}
                stroke={icolor ? icolor : isHovered ? 'rgba(61,142,240,0.7)' : 'transparent'}
                strokeWidth={isHovered || intensity ? 1 : 0}
                role="button"
                tabIndex={0}
                aria-label={`Tap ${r.label}`}
                style={{ cursor: 'pointer', outline: 'none' }}
                onClick={() => onRegionSelect(r.id)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onRegionSelect(r.id)}
                onMouseEnter={() => setHovered(r.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(r.id)}
                onBlur={() => setHovered(null)}
              />
            )
          })}

          {/* Symptom intensity dots on top for visibility */}
          {regions.map((r) => {
            const intensity = regionIntensity[r.id]
            if (!intensity) return null
            // approximate center for dot
            const cx = r.type === 'ellipse' ? r.cx : 50
            const cy = r.type === 'ellipse' ? r.cy : undefined
            if (!cy) return null
            return (
              <circle
                key={`dot-${r.id}`}
                cx={cx}
                cy={cy}
                r={3}
                fill={intensityColor(intensity)}
                style={{ pointerEvents: 'none' }}
              />
            )
          })}
        </svg>

        {/* Hover label */}
        {hovered && (
          <div className={styles.hoverLabel}>{regions.find((r) => r.id === hovered)?.label}</div>
        )}
      </div>
    </div>
  )
}

import { useState, useMemo } from 'react'
import { calcSymptomHeatmapData, eachDayInRange } from '../../utils/statsHelpers'
import styles from './SymptomHeatmap.module.css'

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const CELL = 13
const GAP = 2
const COL_W = CELL + GAP
const ROW_H = CELL + GAP

function countToFill(count) {
  if (!count) return null
  if (count === 1) return 'rgba(249,115,22,0.35)'
  if (count <= 3) return 'rgba(249,115,22,0.62)'
  return '#f97316'
}

export function SymptomHeatmap({ symptoms, symptomTypes, range }) {
  const typesInRange = useMemo(() => {
    const ids = new Set(
      symptoms
        .filter((s) => {
          const d = new Date(s.timestamp)
          return d >= range.start && d <= range.end
        })
        .map((s) => s.symptom_type_id)
    )
    return symptomTypes.filter((t) => ids.has(t.id))
  }, [symptoms, symptomTypes, range])

  const [selectedId, setSelectedId] = useState(null)

  const activeId = typesInRange.find((t) => t.id === selectedId)?.id ?? typesInRange[0]?.id ?? null

  const heatData = useMemo(
    () => (activeId ? calcSymptomHeatmapData(symptoms, activeId, range) : {}),
    [symptoms, activeId, range]
  )

  const days = useMemo(() => eachDayInRange(range), [range])

  // Group days into week columns (Sunday = 0 starts a new column)
  const weeks = useMemo(() => {
    const cols = []
    let col = null
    for (const dateStr of days) {
      const dow = new Date(dateStr + 'T12:00:00').getDay()
      if (!col || dow === 0) {
        col = Array(7).fill(null)
        cols.push(col)
      }
      col[dow] = dateStr
    }
    return cols
  }, [days])

  const monthLabels = useMemo(() => {
    const seen = new Set()
    return weeks
      .map((col, i) => {
        const first = col.find(Boolean)
        if (!first) return null
        const month = first.slice(0, 7)
        if (seen.has(month)) return null
        seen.add(month)
        return {
          col: i,
          label: new Date(first + 'T12:00:00').toLocaleDateString('en', { month: 'short' }),
        }
      })
      .filter(Boolean)
  }, [weeks])

  if (!typesInRange.length) return null

  const svgW = weeks.length * COL_W + 18
  const svgH = 7 * ROW_H + 16

  return (
    <div className={styles.card}>
      <span className={styles.cardLabel}>Symptom heatmap</span>

      {typesInRange.length > 1 && (
        <div className={styles.chips}>
          {typesInRange.map((t) => (
            <button
              key={t.id}
              className={`${styles.chip} ${activeId === t.id ? styles.activeChip : ''}`}
              onClick={() => setSelectedId(t.id)}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      <div className={styles.gridWrap}>
        <svg width={svgW} height={svgH} style={{ display: 'block', overflow: 'visible' }}>
          {/* Day-of-week labels (Mon, Wed, Fri) */}
          {[1, 3, 5].map((dow) => (
            <text
              key={dow}
              x={2}
              y={dow * ROW_H + 14 + CELL / 2}
              fontSize={9}
              dominantBaseline="middle"
              fill="rgba(255,255,255,0.25)"
            >
              {DAY_LABELS[dow]}
            </text>
          ))}

          <g transform="translate(18,0)">
            {/* Month labels */}
            {monthLabels.map(({ col, label }) => (
              <text key={col} x={col * COL_W} y={9} fontSize={9} fill="rgba(255,255,255,0.3)">
                {label}
              </text>
            ))}

            {/* Cells */}
            {weeks.map((col, ci) =>
              col.map((dateStr, dow) => {
                if (!dateStr) return null
                const data = heatData[dateStr]
                const fill = countToFill(data?.count) ?? 'var(--surface-2)'
                return (
                  <rect
                    key={dateStr}
                    x={ci * COL_W}
                    y={dow * ROW_H + 12}
                    width={CELL}
                    height={CELL}
                    rx={2}
                    fill={fill}
                  />
                )
              })
            )}
          </g>
        </svg>
      </div>

      <div className={styles.legend}>
        <span className={styles.legendLabel}>Less</span>
        {[null, 1, 2, 4].map((n, i) => (
          <div
            key={i}
            className={styles.legendCell}
            style={{ background: countToFill(n) ?? 'var(--surface-2)' }}
          />
        ))}
        <span className={styles.legendLabel}>More</span>
      </div>
    </div>
  )
}

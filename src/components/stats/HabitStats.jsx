import { useMemo, useEffect, useState } from 'react'
import { db } from '../../db/db'
import { computeStreak } from '../../utils/streaks'
import {
  calcCompletionRate,
  calcPerHabitRate,
  calcDayOfWeekBreakdown,
  calcHeatmapData,
} from '../../utils/statsHelpers'
import { SHORT_DAYS } from '../../utils/dates'
import styles from './HabitStats.module.css'

function rateColor(rate) {
  if (rate >= 80) return '#4ade80'
  if (rate >= 50) return '#facc15'
  return '#f97316'
}

export function HabitStats({ habits, completionRows, range }) {
  const [streaks, setStreaks] = useState({})

  useEffect(() => {
    if (!habits.length) return
    Promise.all(
      habits.map(async (h) => {
        const rows = await db.completions.where('habitId').equals(h.id).toArray()
        const dates = new Set(rows.map((r) => r.date))
        return [h.id, computeStreak(h, dates)]
      })
    ).then((pairs) => setStreaks(Object.fromEntries(pairs)))
  }, [habits])

  const overallRate = useMemo(
    () => calcCompletionRate(habits, completionRows, range),
    [habits, completionRows, range]
  )

  const bestStreakHabit = useMemo(() => {
    if (!habits.length) return null
    return habits.reduce(
      (best, h) => (!best || (streaks[h.id] ?? 0) > (streaks[best.id] ?? 0) ? h : best),
      null
    )
  }, [habits, streaks])

  const perHabit = useMemo(
    () =>
      habits
        .map((h) => ({ habit: h, rate: calcPerHabitRate(h, completionRows, range) }))
        .sort((a, b) => b.rate - a.rate),
    [habits, completionRows, range]
  )

  const dowBreakdown = useMemo(
    () => calcDayOfWeekBreakdown(habits, completionRows, range),
    [habits, completionRows, range]
  )

  const heatmap = useMemo(
    () => calcHeatmapData(habits, completionRows, range),
    [habits, completionRows, range]
  )

  if (!habits.length) {
    return (
      <div className={styles.section}>
        <div className={styles.heading}>Habits</div>
        <p className={styles.empty}>Add habits to see stats.</p>
      </div>
    )
  }

  const maxDowRate = Math.max(...dowBreakdown.map((d) => d.rate), 1)

  return (
    <div className={styles.section}>
      <div className={styles.heading}>Habits</div>

      {/* Summary cards */}
      <div className={styles.cardRow}>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Best streak</span>
          <span className={styles.cardValue}>
            {bestStreakHabit ? `${streaks[bestStreakHabit.id] ?? 0}d` : '—'}
          </span>
          {bestStreakHabit && <span className={styles.cardSub}>{bestStreakHabit.name}</span>}
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Avg completion</span>
          <span className={styles.cardValue}>{overallRate}%</span>
          <span className={styles.cardSub}>in range</span>
        </div>
      </div>

      {/* Per-habit list */}
      <div className={styles.habitList}>
        {perHabit.map(({ habit, rate }) => (
          <div key={habit.id} className={styles.habitRow}>
            <span className={styles.habitName}>{habit.name}</span>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{ width: `${rate}%`, background: rateColor(rate) }}
              />
            </div>
            <span className={styles.streak} style={{ color: rateColor(rate) }}>
              🔥 {streaks[habit.id] ?? 0}d
            </span>
          </div>
        ))}
      </div>

      {/* Day-of-week breakdown */}
      <div className={styles.card} style={{ gridColumn: 'span 2' }}>
        <span className={styles.cardLabel}>Completion by day of week</span>
        <svg
          viewBox={`0 0 ${7 * 22} 52`}
          className={styles.dowChart}
          aria-label="Completion by day of week"
        >
          {dowBreakdown.map((d, i) => {
            const barH = maxDowRate > 0 ? Math.round((d.rate / maxDowRate) * 36) : 0
            return (
              <g key={d.day} transform={`translate(${i * 22}, 0)`}>
                <rect
                  x={3}
                  y={38 - barH}
                  width={16}
                  height={barH}
                  rx={2}
                  fill="#3d8ef0"
                  opacity={barH ? 0.85 : 0.15}
                />
                <text x={11} y={50} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.3)">
                  {SHORT_DAYS[d.day]}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Heatmap */}
      <div className={styles.card} style={{ gridColumn: 'span 2' }}>
        <span className={styles.cardLabel}>Daily completion heatmap</span>
        <div className={styles.heatmap}>
          {heatmap.map((cell) => (
            <div key={cell.date} className={`${styles.hmCell} ${styles[`lv${cell.level}`]}`} />
          ))}
        </div>
        <span className={styles.cardSub} style={{ marginTop: 6 }}>
          Green intensity = % of habits completed
        </span>
      </div>
    </div>
  )
}

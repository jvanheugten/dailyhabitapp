import { useMemo } from 'react'
import { eachDayInRange, generateInsights } from '../../utils/statsHelpers'
import styles from './InsightsSection.module.css'

export function InsightsSection({
  habits,
  completionRows,
  symptoms,
  symptomTypes,
  vitalTypes,
  vitalEntries,
  range,
}) {
  const days = useMemo(() => eachDayInRange(range), [range])

  const insights = useMemo(
    () =>
      generateInsights(
        habits,
        completionRows,
        symptoms,
        symptomTypes,
        vitalTypes,
        vitalEntries,
        range
      ),
    [habits, completionRows, symptoms, symptomTypes, vitalTypes, vitalEntries, range]
  )

  return (
    <div className={styles.section}>
      <div className={styles.heading}>Insights</div>

      {days.length < 7 ? (
        <p className={styles.empty}>Keep logging — insights appear after a week of data.</p>
      ) : insights.length === 0 ? (
        <p className={styles.empty}>Log more data across habits and health to unlock insights.</p>
      ) : (
        <>
          {insights.map((ins, i) => (
            <div key={i} className={styles.card}>
              <span className={styles.tag}>{ins.tag}</span>
              <p className={styles.text}>{ins.text}</p>
              <span className={styles.stat}>{ins.stat}</span>
            </div>
          ))}
          {insights.length < 3 && (
            <p className={styles.nudge}>Log more data to unlock further insights.</p>
          )}
        </>
      )}
    </div>
  )
}

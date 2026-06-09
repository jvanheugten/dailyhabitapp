import { useState, useEffect } from 'react'
import { useHabits } from '../contexts/HabitsContext'
import { useHealth } from '../contexts/HealthContext'
import { useVitals } from '../contexts/VitalsContext'
import { db } from '../db/db'
import { formatDate, today } from '../utils/dates'
import { HabitStats } from '../components/stats/HabitStats'
import { HealthStats } from '../components/stats/HealthStats'
import { InsightsSection } from '../components/stats/InsightsSection'
import styles from './Stats.module.css'

function makeRange(label, customStart, customEnd) {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  if (label === '7D') {
    const start = new Date()
    start.setDate(start.getDate() - 6)
    start.setHours(0, 0, 0, 0)
    return { start, end }
  }
  if (label === '90D') {
    const start = new Date()
    start.setDate(start.getDate() - 89)
    start.setHours(0, 0, 0, 0)
    return { start, end }
  }
  if (label === 'custom' && customStart && customEnd) {
    const s = new Date(customStart + 'T00:00:00')
    const e = new Date(customEnd + 'T23:59:59')
    return { start: s, end: e > end ? end : e }
  }
  // default 30D
  const start = new Date()
  start.setDate(start.getDate() - 29)
  start.setHours(0, 0, 0, 0)
  return { start, end }
}

export function Stats() {
  const { habits } = useHabits()
  const { symptoms, symptomTypes } = useHealth()
  const { vitalTypes, vitalEntries } = useVitals()

  const [activeChip, setActiveChip] = useState('30D')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState(today())
  const [completionRows, setCompletionRows] = useState([])

  const range = makeRange(activeChip, customStart, customEnd)

  useEffect(() => {
    const startStr = formatDate(range.start)
    const endStr = formatDate(range.end)
    db.completions
      .where('date')
      .between(startStr, endStr, true, true)
      .toArray()
      .then(setCompletionRows)
  }, [range.start.getTime(), range.end.getTime()])

  function selectChip(chip) {
    setActiveChip(chip)
  }

  return (
    <div className={styles.screen}>
      {/* Time range selector */}
      <div className={styles.rangeBar}>
        {['7D', '30D', '90D'].map((chip) => (
          <button
            key={chip}
            className={`${styles.chip} ${activeChip === chip ? styles.activeChip : ''}`}
            onClick={() => selectChip(chip)}
          >
            {chip}
          </button>
        ))}
        <button
          className={`${styles.chip} ${activeChip === 'custom' ? styles.activeChip : ''}`}
          onClick={() => selectChip('custom')}
        >
          {activeChip === 'custom' && customStart
            ? `${customStart.slice(5)} – ${customEnd.slice(5)}`
            : 'Custom…'}
        </button>
      </div>

      {activeChip === 'custom' && (
        <div className={styles.customPicker}>
          <input
            type="date"
            className={styles.dateInput}
            value={customStart}
            max={customEnd || today()}
            onChange={(e) => setCustomStart(e.target.value)}
          />
          <span className={styles.dateSep}>–</span>
          <input
            type="date"
            className={styles.dateInput}
            value={customEnd}
            max={today()}
            onChange={(e) => setCustomEnd(e.target.value)}
          />
        </div>
      )}

      <div className={styles.content}>
        <HabitStats habits={habits} completionRows={completionRows} range={range} />
        <HealthStats
          symptoms={symptoms}
          symptomTypes={symptomTypes}
          vitalTypes={vitalTypes}
          vitalEntries={vitalEntries}
          range={range}
        />
        <InsightsSection
          habits={habits}
          completionRows={completionRows}
          symptoms={symptoms}
          symptomTypes={symptomTypes}
          vitalTypes={vitalTypes}
          vitalEntries={vitalEntries}
          range={range}
        />
      </div>
    </div>
  )
}

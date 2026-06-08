import { useRef, useEffect } from 'react'
import { formatDate, DAY_LETTERS } from '../utils/dates'
import styles from './DayStrip.module.css'

// completionsByDate: { [YYYY-MM-DD]: { total: number, done: number } }
export function DayStrip({ selectedDate, onSelectDate, completionsByDate = {} }) {
  const todayStr = formatDate(new Date())
  const scrollRef = useRef(null)

  // 30 past days + today + 1 future day
  const days = []
  const base = new Date()
  for (let i = 30; i >= -1; i--) {
    const d = new Date(base)
    d.setDate(base.getDate() - i)
    days.push(d)
  }

  useEffect(() => {
    const el = scrollRef.current?.querySelector('[data-today="true"]')
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ inline: 'center', behavior: 'instant', block: 'nearest' })
    }
  }, [])

  return (
    <div className={styles.strip} ref={scrollRef}>
      {days.map((d) => {
        const dateStr = formatDate(d)
        const isFuture = dateStr > todayStr
        const isToday = dateStr === todayStr
        const isSelected = dateStr === selectedDate
        const comp = completionsByDate[dateStr]
        const dotStatus =
          !comp || comp.total === 0 ? 'none' : comp.done === comp.total ? 'full' : 'partial'

        return (
          <button
            key={dateStr}
            data-today={isToday || undefined}
            disabled={isFuture}
            className={[
              styles.tile,
              isSelected && styles.selected,
              isFuture && styles.future,
              isToday && styles.today,
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onSelectDate(dateStr)}
          >
            <span className={styles.dayLetter}>{DAY_LETTERS[d.getDay()]}</span>
            <span className={styles.dayNum}>{d.getDate()}</span>
            <span className={`${styles.dot} ${styles[dotStatus]}`} />
          </button>
        )
      })}
    </div>
  )
}

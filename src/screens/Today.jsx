import { useEffect, useState } from 'react'
import { useHabits } from '../contexts/HabitsContext'
import { useJournal } from '../contexts/JournalContext'
import { DayStrip } from '../components/DayStrip'
import { HabitRow } from '../components/HabitRow'
import { JournalEditor } from '../components/JournalEditor'
import { today } from '../utils/dates'
import styles from './Today.module.css'

export function Today() {
  const { habits, selectedDate, setSelectedDate, completions, toggleCompletion } = useHabits()
  const { loadEntry, saveEntry } = useJournal()
  const [journalText, setJournalText] = useState('')

  useEffect(() => {
    loadEntry(selectedDate).then(entry => setJournalText(entry?.text ?? ''))
  }, [selectedDate, loadEntry])

  const todayStr = today()
  const dayOfWeek = new Date(selectedDate + 'T12:00:00').getDay()
  const habitsDue = habits.filter(h => h.days.includes(dayOfWeek))
  const doneCount = habitsDue.filter(h => completions[h.id]).length

  const dateLabel = selectedDate === todayStr
    ? 'Today'
    : new Date(selectedDate + 'T12:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })

  function handleJournalBlur() {
    if (journalText.trim()) saveEntry(selectedDate, journalText)
  }

  return (
    <div className={styles.screen}>
      <DayStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      <div className={styles.header}>
        <span className={styles.dateLabel}>{dateLabel}</span>
        <span className={styles.progress}>{doneCount}/{habitsDue.length} done</span>
      </div>
      <div className={styles.habits}>
        {habitsDue.length === 0
          ? <p className={styles.empty}>No habits scheduled for this day.</p>
          : habitsDue.map(habit => (
              <HabitRow
                key={habit.id}
                habit={habit}
                completed={Boolean(completions[habit.id])}
                onToggle={() => toggleCompletion(habit.id)}
              />
            ))
        }
      </div>
      <div className={styles.journalSection}>
        <span className={styles.journalLabel}>Journal</span>
        <JournalEditor value={journalText} onChange={setJournalText} onBlur={handleJournalBlur} />
      </div>
    </div>
  )
}

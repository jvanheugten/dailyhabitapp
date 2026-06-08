import { useState } from 'react'
import { useHabits } from '../contexts/HabitsContext'
import { HabitForm } from '../components/HabitForm'
import { SHORT_DAYS } from '../utils/dates'
import styles from './Habits.module.css'

export function Habits() {
  const { habits, addHabit, updateHabit, deleteHabit } = useHabits()
  const [formHabit, setFormHabit] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  async function handleSave(data) {
    if (formHabit?.id) {
      await updateHabit(formHabit.id, data)
    } else {
      await addHabit(data)
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <h1>Habits</h1>
      </div>
      {habits.length === 0 && <p className={styles.empty}>No habits yet. Tap + to add one.</p>}
      <ul className={styles.list}>
        {habits.map((habit) => (
          <li key={habit.id} className={styles.item}>
            <button className={styles.itemContent} onClick={() => setFormHabit(habit)}>
              <span className={styles.habitName}>{habit.name}</span>
              <span className={styles.habitDays}>
                {habit.days.map((d) => SHORT_DAYS[d]).join(' · ')}
              </span>
            </button>
            {confirmDeleteId === habit.id ? (
              <div className={styles.confirmRow}>
                <button
                  onClick={() => {
                    deleteHabit(habit.id)
                    setConfirmDeleteId(null)
                  }}
                  className={styles.deleteConfirmBtn}
                >
                  Delete
                </button>
                <button onClick={() => setConfirmDeleteId(null)} className={styles.cancelBtn}>
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDeleteId(habit.id)}
                className={styles.deleteBtn}
                aria-label={`Delete ${habit.name}`}
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>
      <button className={styles.fab} onClick={() => setFormHabit({})} aria-label="Add habit">
        +
      </button>
      {formHabit !== null && (
        <HabitForm
          habit={formHabit?.id ? formHabit : null}
          onSave={handleSave}
          onClose={() => setFormHabit(null)}
        />
      )}
    </div>
  )
}

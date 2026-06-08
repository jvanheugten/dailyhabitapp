import { useStreak } from '../hooks/useStreak'
import styles from './HabitRow.module.css'

export function HabitRow({ habit, completed, onToggle }) {
  const streak = useStreak(habit)
  return (
    <div className={`${styles.row} ${completed ? styles.completed : styles.pending}`}>
      <button
        className={`${styles.checkbox} ${completed ? styles.checked : ''}`}
        onClick={onToggle}
        aria-label={completed ? `Unmark ${habit.name}` : `Mark ${habit.name} as done`}
      >
        {completed && <span>✓</span>}
      </button>
      <span className={styles.name}>{habit.name}</span>
      {streak > 0 && <span className={styles.streak}>🔥{streak}</span>}
    </div>
  )
}

import { useState } from 'react'
import { SHORT_DAYS } from '../utils/dates'
import styles from './HabitForm.module.css'

export function HabitForm({ habit, onSave, onClose }) {
  const [name, setName] = useState(habit?.name ?? '')
  const [days, setDays] = useState(habit?.days ?? [1, 2, 3, 4, 5])
  const [time, setTime] = useState(habit?.time ?? '')
  const [notifyEnabled, setNotifyEnabled] = useState(habit?.notifyEnabled ?? false)
  const [error, setError] = useState('')

  function toggleDay(d) {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort((a, b) => a - b))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    if (days.length === 0) { setError('Select at least one day'); return }
    await onSave({ name: name.trim(), days, time: time || null, notifyEnabled })
    onClose()
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={habit ? 'Edit Habit' : 'New Habit'}>
      <div className={styles.sheet}>
        <div className={styles.header}>
          <h2>{habit ? 'Edit Habit' : 'New Habit'}</h2>
          <button onClick={onClose} aria-label="Close form">✕</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            Name
            <input
              className={styles.input}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Morning run"
              autoFocus
            />
          </label>
          <div className={styles.label}>
            Days
            <div className={styles.dayPicker}>
              {SHORT_DAYS.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  className={`${styles.dayBtn} ${days.includes(i) ? styles.dayBtnActive : ''}`}
                  onClick={() => toggleDay(i)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <label className={styles.label}>
            Reminder time (optional)
            <input type="time" className={styles.input} value={time} onChange={e => setTime(e.target.value)} />
          </label>
          {time && (
            <label className={styles.toggleRow}>
              <span>Enable reminder notification</span>
              <input
                type="checkbox"
                checked={notifyEnabled}
                onChange={async (e) => {
                  if (e.target.checked) {
                    const { requestNotificationPermission } = await import('../notifications')
                    const granted = await requestNotificationPermission()
                    setNotifyEnabled(granted)
                  } else {
                    setNotifyEnabled(false)
                  }
                }}
              />
            </label>
          )}
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button type="submit" className={styles.saveBtn}>Save</button>
        </form>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useJournal } from '../contexts/JournalContext'
import styles from './Journal.module.css'

export function Journal() {
  const { getAllEntries, saveEntry } = useJournal()
  const [entries, setEntries] = useState([])
  const [selected, setSelected] = useState(null)
  const [editText, setEditText] = useState('')

  useEffect(() => {
    getAllEntries().then(setEntries)
  }, [getAllEntries])

  function openEntry(entry) {
    setSelected(entry)
    setEditText(entry.text)
  }

  async function handleBlur() {
    if (!selected) return
    await saveEntry(selected.date, editText)
    setEntries((prev) => prev.map((e) => (e.date === selected.date ? { ...e, text: editText } : e)))
  }

  if (selected) {
    const d = new Date(selected.date + 'T12:00:00')
    const label = d.toLocaleDateString('en', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    return (
      <div className={styles.screen}>
        <div className={styles.header}>
          <button onClick={() => setSelected(null)} className={styles.backBtn}>
            ← Back
          </button>
          <span className={styles.entryDateFull}>{label}</span>
        </div>
        <textarea
          className={styles.editArea}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleBlur}
          autoFocus
        />
      </div>
    )
  }

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <h1>Journal</h1>
      </div>
      {entries.length === 0 && (
        <p className={styles.empty}>No journal entries yet. Add one from Today.</p>
      )}
      <ul className={styles.list}>
        {entries.map((entry) => (
          <li key={entry.date}>
            <button className={styles.entryItem} onClick={() => openEntry(entry)}>
              <span className={styles.entryDate}>
                {new Date(entry.date + 'T12:00:00').toLocaleDateString('en', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span className={styles.entryPreview}>
                {entry.text.slice(0, 90)}
                {entry.text.length > 90 ? '…' : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

import { useState } from 'react'
import styles from './VitalTypeForm.module.css'

export function VitalTypeForm({ vitalType, onSave, onClose }) {
  const [name, setName] = useState(vitalType?.name ?? '')
  const [unit, setUnit] = useState(vitalType?.unit ?? '')
  const [schema, setSchema] = useState(vitalType?.value_schema ?? 'single')
  const [normalMin, setNormalMin] = useState(vitalType?.normal_min ?? '')
  const [normalMax, setNormalMax] = useState(vitalType?.normal_max ?? '')
  const [error, setError] = useState('')

  async function handleSave(e) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    await onSave({
      name: name.trim(),
      unit: unit.trim(),
      value_schema: schema,
      normal_min: normalMin !== '' ? Number(normalMin) : null,
      normal_max: normalMax !== '' ? Number(normalMax) : null,
    })
    onClose()
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Vital Type">
      <div className={styles.sheet}>
        <div className={styles.header}>
          <h2>{vitalType ? 'Edit Vital Type' : 'New Vital Type'}</h2>
          <button onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <form onSubmit={handleSave} className={styles.form}>
          <label className={styles.label}>
            Name
            <input
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Steps"
              autoFocus
            />
          </label>
          <label className={styles.label}>
            Unit
            <input
              className={styles.input}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g. steps/day"
            />
          </label>
          <div className={styles.label}>
            Value type
            <div className={styles.toggle}>
              <button
                type="button"
                className={schema === 'single' ? styles.active : ''}
                onClick={() => setSchema('single')}
              >
                Single
              </button>
              <button
                type="button"
                className={schema === 'compound' ? styles.active : ''}
                onClick={() => setSchema('compound')}
              >
                Compound (e.g. BP)
              </button>
            </div>
          </div>
          <div className={styles.rangeRow}>
            <label className={styles.label}>
              Normal min
              <input
                type="number"
                className={styles.input}
                value={normalMin}
                onChange={(e) => setNormalMin(e.target.value)}
                placeholder="optional"
              />
            </label>
            <label className={styles.label}>
              Normal max
              <input
                type="number"
                className={styles.input}
                value={normalMax}
                onChange={(e) => setNormalMax(e.target.value)}
                placeholder="optional"
              />
            </label>
          </div>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <button type="submit" className={styles.saveBtn}>
            Save
          </button>
        </form>
      </div>
    </div>
  )
}

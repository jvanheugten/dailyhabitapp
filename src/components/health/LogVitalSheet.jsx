import { useState } from 'react'
import { useVitals } from '../../contexts/VitalsContext'
import { VitalTypeForm } from './VitalTypeForm'
import styles from './LogVitalSheet.module.css'

export function LogVitalSheet({ onClose }) {
  const { vitalTypes, addVitalType, addVitalEntry } = useVitals()
  const [selectedType, setSelectedType] = useState(null)
  const [singleValue, setSingleValue] = useState('')
  const [sys, setSys] = useState('')
  const [dia, setDia] = useState('')
  const [notes, setNotes] = useState('')
  const [showTypeForm, setShowTypeForm] = useState(false)

  async function handleSave() {
    if (!selectedType) return
    let value
    if (selectedType.value_schema === 'compound') {
      value = JSON.stringify({ sys: Number(sys), dia: Number(dia) })
    } else {
      value = JSON.stringify(singleValue)
    }
    await addVitalEntry({ vital_type_id: selectedType.id, value, notes })
    onClose()
  }

  const canSave =
    selectedType && (selectedType.value_schema === 'compound' ? sys && dia : singleValue)

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Log Vital">
      <div className={styles.sheet}>
        <div className={styles.header}>
          <h2>Log Vital</h2>
          <button onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className={styles.section}>
          <span className={styles.sectionLabel}>Select vital</span>
          <div className={styles.typeList}>
            {vitalTypes.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`${styles.typeChip} ${selectedType?.id === t.id ? styles.selected : ''}`}
                onClick={() => setSelectedType(t)}
              >
                {t.name}
              </button>
            ))}
            <button
              type="button"
              className={styles.addTypeBtn}
              onClick={() => setShowTypeForm(true)}
            >
              + Add type
            </button>
          </div>
        </div>

        {selectedType && (
          <div className={styles.section}>
            <span className={styles.sectionLabel}>
              {selectedType.name} ({selectedType.unit})
              {selectedType.normal_min != null && selectedType.normal_max != null && (
                <span className={styles.normalRange}>
                  {' '}
                  · normal {selectedType.normal_min}–{selectedType.normal_max}
                </span>
              )}
            </span>
            {selectedType.value_schema === 'compound' ? (
              <div className={styles.compoundRow}>
                <input
                  type="number"
                  className={styles.input}
                  placeholder="Systolic"
                  value={sys}
                  onChange={(e) => setSys(e.target.value)}
                />
                <span className={styles.slash}>/</span>
                <input
                  type="number"
                  className={styles.input}
                  placeholder="Diastolic"
                  value={dia}
                  onChange={(e) => setDia(e.target.value)}
                />
              </div>
            ) : (
              <input
                type="number"
                className={styles.input}
                placeholder="Value"
                value={singleValue}
                onChange={(e) => setSingleValue(e.target.value)}
              />
            )}
          </div>
        )}

        <div className={styles.section}>
          <span className={styles.sectionLabel}>Notes (optional)</span>
          <textarea
            className={styles.textarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        <button className={styles.saveBtn} onClick={handleSave} disabled={!canSave}>
          Save
        </button>

        {showTypeForm && (
          <VitalTypeForm
            onSave={async (data) => {
              await addVitalType(data)
              setShowTypeForm(false)
            }}
            onClose={() => setShowTypeForm(false)}
          />
        )}
      </div>
    </div>
  )
}

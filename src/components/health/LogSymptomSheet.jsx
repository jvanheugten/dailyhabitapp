import { useState } from 'react'
import { useHealth } from '../../contexts/HealthContext'
import { BodyMap } from './BodyMap'
import { BodyRegion } from './BodyRegion'
import { IntensityPicker } from './IntensityPicker'
import styles from './LogSymptomSheet.module.css'

const PAIN_TYPES = ['Throbbing', 'Sharp', 'Dull', 'Burning', 'Aching']

function toDateTimeLocal(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function LogSymptomSheet({ onClose }) {
  const { symptomTypes, addSymptomType, addSymptom, symptoms } = useHealth()
  const [step, setStep] = useState(1)
  const [region, setRegion] = useState(null)
  const [view, setView] = useState('front')
  const [pathsByView, setPathsByView] = useState({})
  const [intensity, setIntensity] = useState(3)
  const [selectedType, setSelectedType] = useState(null)
  const [newTypeName, setNewTypeName] = useState('')
  const [painTypes, setPainTypes] = useState([])
  const [notes, setNotes] = useState('')
  const [timestamp, setTimestamp] = useState(() => toDateTimeLocal(new Date()))

  function handleRegionSelect(r) {
    setRegion(r)
    setStep(2)
  }

  function handlePathsChange(newPaths) {
    setPathsByView((prev) => ({ ...prev, [view]: newPaths }))
  }

  async function handleSave() {
    let typeId = selectedType
    if (!typeId && newTypeName.trim()) {
      const type = await addSymptomType(newTypeName.trim())
      typeId = type.id
    }
    if (!typeId) return

    const allPaths = Object.entries(pathsByView).flatMap(([v, paths]) =>
      paths.map((p) => ({ ...p, view: v }))
    )

    await addSymptom({
      symptom_type_id: typeId,
      region,
      view,
      svg_paths: JSON.stringify(allPaths),
      intensity,
      pain_type: JSON.stringify(painTypes),
      notes,
      timestamp: new Date(timestamp).toISOString(),
    })
    onClose()
  }

  function togglePainType(pt) {
    setPainTypes((prev) => (prev.includes(pt) ? prev.filter((x) => x !== pt) : [...prev, pt]))
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Log Symptom">
      <div className={styles.sheet}>
        <div className={styles.header}>
          <h2>Log Symptom</h2>
          <button onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className={styles.steps}>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`${styles.step} ${step === s ? styles.activeStep : step > s ? styles.doneStep : ''}`}
            >
              {s}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className={styles.body}>
            <p className={styles.hint}>Tap a body region to locate the symptom</p>
            <BodyMap onRegionSelect={handleRegionSelect} symptoms={symptoms} />
          </div>
        )}

        {step === 2 && (
          <div className={styles.body}>
            <BodyRegion
              region={region}
              view={view}
              onViewChange={setView}
              paths={pathsByView[view] ?? []}
              onPathsChange={handlePathsChange}
              intensity={intensity}
            />
            <div className={styles.section}>
              <span className={styles.sectionLabel}>Intensity</span>
              <IntensityPicker value={intensity} onChange={setIntensity} />
            </div>
            <button className={styles.nextBtn} onClick={() => setStep(3)}>
              Next
            </button>
          </div>
        )}

        {step === 3 && (
          <div className={styles.body}>
            <div className={styles.section}>
              <span className={styles.sectionLabel}>Symptom type</span>
              <div className={styles.typeList}>
                {symptomTypes.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`${styles.typeChip} ${selectedType === t.id ? styles.selectedChip : ''}`}
                    onClick={() => {
                      setSelectedType(t.id)
                      setNewTypeName('')
                    }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
              <input
                className={styles.input}
                placeholder="New symptom type..."
                value={newTypeName}
                onChange={(e) => {
                  setNewTypeName(e.target.value)
                  setSelectedType(null)
                }}
              />
            </div>
            <div className={styles.section}>
              <span className={styles.sectionLabel}>Pain quality</span>
              <div className={styles.typeList}>
                {PAIN_TYPES.map((pt) => (
                  <button
                    key={pt}
                    type="button"
                    className={`${styles.typeChip} ${painTypes.includes(pt) ? styles.selectedChip : ''}`}
                    onClick={() => togglePainType(pt)}
                  >
                    {pt}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.section}>
              <span className={styles.sectionLabel}>Notes</span>
              <textarea
                className={styles.textarea}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Optional note..."
              />
            </div>
            <div className={styles.section}>
              <span className={styles.sectionLabel}>Date & time</span>
              <input
                type="datetime-local"
                className={styles.input}
                value={timestamp}
                max={toDateTimeLocal(new Date())}
                onChange={(e) => setTimestamp(e.target.value)}
              />
            </div>
            <button
              className={styles.saveBtn}
              onClick={handleSave}
              disabled={!selectedType && !newTypeName.trim()}
            >
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

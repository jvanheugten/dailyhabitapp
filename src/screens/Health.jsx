import { useState, useMemo } from 'react'
import { useHealth } from '../contexts/HealthContext'
import { useVitals } from '../contexts/VitalsContext'
import { BodyMap } from '../components/health/BodyMap'
import { LogSymptomSheet } from '../components/health/LogSymptomSheet'
import { LogVitalSheet } from '../components/health/LogVitalSheet'
import { GoogleFitSync } from '../components/health/GoogleFitSync'
import { intensityLabel, intensityColor } from '../utils/intensity'
import styles from './Health.module.css'

export function Health() {
  const { symptoms } = useHealth()
  const { vitalTypes, vitalEntries } = useVitals()
  const [tab, setTab] = useState('overview')
  const [showSymptomSheet, setShowSymptomSheet] = useState(false)
  const [showVitalSheet, setShowVitalSheet] = useState(false)
  const [historyFilter, setHistoryFilter] = useState('all')

  const recentSymptoms = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    return symptoms.filter((s) => s.timestamp >= cutoff.toISOString())
  }, [symptoms])

  // Last entry per vital type for the overview
  const latestVitals = vitalTypes
    .map((vt) => {
      const entry = vitalEntries.find((e) => e.vital_type_id === vt.id)
      return entry ? { ...vt, entry } : null
    })
    .filter(Boolean)

  // Interleaved history (newest first)
  const history = [
    ...symptoms.map((s) => ({ ...s, kind: 'symptom' })),
    ...vitalEntries.map((e) => ({ ...e, kind: 'vital' })),
  ].sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  const filteredHistory = history.filter((item) => {
    if (historyFilter === 'all') return true
    if (historyFilter === 'google_fit') return item.kind === 'vital' && item.source === 'google_fit'
    return item.kind === historyFilter
  })

  function vitalValueDisplay(vt, entry) {
    try {
      const v = JSON.parse(entry.value)
      if (vt.value_schema === 'compound') return `${v.sys}/${v.dia} ${vt.unit}`
      return `${v} ${vt.unit}`
    } catch {
      return '—'
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.tabBar}>
        <button
          className={`${styles.tabBtn} ${tab === 'overview' ? styles.activeTab : ''}`}
          onClick={() => setTab('overview')}
        >
          Overview
        </button>
        <button
          className={`${styles.tabBtn} ${tab === 'history' ? styles.activeTab : ''}`}
          onClick={() => setTab('history')}
        >
          History
        </button>
      </div>

      {tab === 'overview' && (
        <div className={styles.overview}>
          <div className={styles.bodyMapSection}>
            <BodyMap onRegionSelect={() => setShowSymptomSheet(true)} symptoms={recentSymptoms} />
          </div>

          {latestVitals.length > 0 && (
            <div className={styles.section}>
              <span className={styles.sectionLabel}>Recent vitals</span>
              {latestVitals.map((vt) => (
                <div key={vt.id} className={styles.vitalRow}>
                  <span className={styles.vitalName}>{vt.name}</span>
                  <span className={styles.vitalValue}>{vitalValueDisplay(vt, vt.entry)}</span>
                </div>
              ))}
            </div>
          )}

          <div className={styles.actions}>
            <button className={styles.actionBtn} onClick={() => setShowSymptomSheet(true)}>
              Log Symptom
            </button>
            <button className={styles.actionBtnSecondary} onClick={() => setShowVitalSheet(true)}>
              Log Vital
            </button>
          </div>

          <GoogleFitSync />
        </div>
      )}

      {tab === 'history' && (
        <div className={styles.historyList}>
          <div className={styles.filterChips}>
            {['all', 'symptom', 'vital', 'google_fit'].map((f) => (
              <button
                key={f}
                className={`${styles.filterChip} ${historyFilter === f ? styles.activeChip : ''}`}
                onClick={() => setHistoryFilter(f)}
              >
                {f === 'all'
                  ? 'All'
                  : f === 'symptom'
                    ? 'Symptoms'
                    : f === 'vital'
                      ? 'Vitals'
                      : 'Google Fit'}
              </button>
            ))}
          </div>
          {filteredHistory.length === 0 && <p className={styles.empty}>No health events yet.</p>}
          {filteredHistory.map((item) => (
            <div key={`${item.kind}-${item.id}`} className={styles.historyRow}>
              <div className={styles.historyMeta}>
                <span className={styles.historyType}>
                  {item.kind === 'symptom' ? '🤕' : '📊'}
                  {item.kind === 'symptom'
                    ? ` ${item.region} · ${intensityLabel(item.intensity)}`
                    : ` Vital`}
                </span>
                <span className={styles.historyTime}>
                  {new Date(item.timestamp).toLocaleDateString('en', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              {item.kind === 'symptom' && item.intensity && (
                <span
                  className={styles.intensityDot}
                  style={{ background: intensityColor(item.intensity) }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {showSymptomSheet && <LogSymptomSheet onClose={() => setShowSymptomSheet(false)} />}
      {showVitalSheet && <LogVitalSheet onClose={() => setShowVitalSheet(false)} />}
    </div>
  )
}

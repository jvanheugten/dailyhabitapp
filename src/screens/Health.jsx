import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useHealth } from '../contexts/HealthContext'
import { useVitals } from '../contexts/VitalsContext'
import { BodyViewer3D } from '../components/health/BodyViewer3D'
import { LogSymptomSheet } from '../components/health/LogSymptomSheet'
import { LogVitalSheet } from '../components/health/LogVitalSheet'
import { GoogleFitSync } from '../components/health/GoogleFitSync'
import { intensityLabel } from '../utils/intensity'
import { calcRegionStats } from '../utils/statsHelpers'
import styles from './Health.module.css'

export function Health() {
  const { symptoms, deleteSymptom } = useHealth()
  const { vitalTypes, vitalEntries, deleteVitalEntry } = useVitals()
  const [tab, setTab] = useState('overview')
  const [showSymptomSheet, setShowSymptomSheet] = useState(false)
  const [showVitalSheet, setShowVitalSheet] = useState(false)
  const [historyFilter, setHistoryFilter] = useState('all')
  const [scrollDate, setScrollDate] = useState(null)
  const [isScrolling, setIsScrolling] = useState(false)
  const [exitingKey, setExitingKey] = useState(null)

  const screenRef = useRef(null)
  const listRef = useRef(null)
  const scrollTimerRef = useRef(null)

  useEffect(() => () => clearTimeout(scrollTimerRef.current), [])

  const recentSymptoms = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    return symptoms.filter((s) => s.timestamp >= cutoff.toISOString())
  }, [symptoms])

  const regionData = useMemo(() => calcRegionStats(recentSymptoms, null), [recentSymptoms])

  const vitalTypeMap = useMemo(
    () => Object.fromEntries(vitalTypes.map((vt) => [vt.id, vt])),
    [vitalTypes]
  )

  const latestVitals = vitalTypes
    .map((vt) => {
      const entry = vitalEntries.find((e) => e.vital_type_id === vt.id)
      return entry ? { ...vt, entry } : null
    })
    .filter(Boolean)

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

  function handleDeleteTap(e, key, item) {
    e.stopPropagation()
    setExitingKey(key)
    setTimeout(async () => {
      if (item.kind === 'symptom') await deleteSymptom(item.id)
      else await deleteVitalEntry(item.id)
      setExitingKey(null)
    }, 240)
  }

  const handleScroll = useCallback(() => {
    if (tab !== 'history' || !listRef.current || !screenRef.current) return

    const screenTop = screenRef.current.getBoundingClientRect().top
    const rows = listRef.current.querySelectorAll('[data-date]')
    for (const row of rows) {
      if (row.getBoundingClientRect().bottom > screenTop + 56) {
        setScrollDate(row.dataset.date)
        break
      }
    }

    setIsScrolling(true)
    clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(() => setIsScrolling(false), 1400)
  }, [tab])

  function formatScrollDate(iso) {
    return new Date(iso + 'T12:00:00').toLocaleDateString('en', {
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className={styles.screen} ref={screenRef} onScroll={handleScroll}>
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
          <div className={styles.mapCard}>
            <span className={styles.mapCardHeader}>Body Map</span>
            <div
              style={{
                height: 260,
                borderRadius: 'var(--radius)',
                overflow: 'hidden',
                cursor: 'pointer',
              }}
              onClick={() => setShowSymptomSheet(true)}
            >
              <BodyViewer3D
                mode="stats"
                region="Full Body"
                regionData={regionData}
                autoRotate={false}
              />
            </div>
          </div>

          {latestVitals.length > 0 && (
            <div className={styles.section}>
              <span className={styles.sectionLabel}>Recent vitals</span>
              <div className={styles.vitalGrid}>
                {latestVitals.map((vt) => (
                  <div key={vt.id} className={styles.vitalCard}>
                    <span className={styles.vitalName}>{vt.name}</span>
                    <span className={styles.vitalValue}>{vitalValueDisplay(vt, vt.entry)}</span>
                  </div>
                ))}
              </div>
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
        <div className={styles.historyList} ref={listRef}>
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
          {filteredHistory.map((item) => {
            const key = `${item.kind}-${item.id}`
            const vt = item.kind === 'vital' ? vitalTypeMap[item.vital_type_id] : null
            const isExiting = exitingKey === key
            return (
              <div
                key={key}
                className={`${styles.historyRow} ${isExiting ? styles.exitingRow : ''}`}
                data-date={item.timestamp.slice(0, 10)}
              >
                {item.kind === 'symptom' && (
                  <div
                    style={{
                      flexShrink: 0,
                      padding: '3px 8px',
                      borderRadius: 12,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: 10,
                      color: 'var(--text-dim)',
                      alignSelf: 'center',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.region ?? '—'}
                  </div>
                )}
                <div className={styles.historyMeta}>
                  <span className={styles.historyType}>
                    {item.kind === 'symptom' ? '🤕' : '📊'}
                    {item.kind === 'symptom'
                      ? ` ${item.region} · ${intensityLabel(item.intensity)}`
                      : vt
                        ? ` ${vt.name} · ${vitalValueDisplay(vt, item)}`
                        : ' Vital'}
                  </span>
                  <span className={styles.historyTime}>
                    {new Date(item.timestamp).toLocaleDateString('en', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {item.notes ? <span className={styles.historyNotes}>{item.notes}</span> : null}
                </div>
                <button
                  className={styles.deleteBtn}
                  onClick={(e) => handleDeleteTap(e, key, item)}
                  aria-label="Delete entry"
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'history' && isScrolling && scrollDate && (
        <div className={styles.dateIndicator}>{formatScrollDate(scrollDate)}</div>
      )}

      {showSymptomSheet && <LogSymptomSheet onClose={() => setShowSymptomSheet(false)} />}
      {showVitalSheet && <LogVitalSheet onClose={() => setShowVitalSheet(false)} />}
    </div>
  )
}

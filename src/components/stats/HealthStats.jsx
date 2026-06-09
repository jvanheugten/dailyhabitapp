import { useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
} from 'recharts'
import { BodyViewer3D } from '../health/BodyViewer3D'
import { calcSymptomFrequency, calcRegionStats } from '../../utils/statsHelpers'
import { SymptomHeatmap } from './SymptomHeatmap'
import styles from './HealthStats.module.css'

function parseVitalValue(entry, schema) {
  try {
    const v = JSON.parse(entry.value)
    if (schema === 'compound') return { sys: v.sys, dia: v.dia }
    return { val: Number(v) }
  } catch {
    return null
  }
}

function formatXTick(isoStr) {
  return new Date(isoStr).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

export function HealthStats({ symptoms, symptomTypes, vitalTypes, vitalEntries, range }) {
  const freq = useMemo(
    () => calcSymptomFrequency(symptoms, symptomTypes, range),
    [symptoms, symptomTypes, range]
  )

  const regionData = useMemo(() => calcRegionStats(symptoms, range), [symptoms, range])

  const maxFreq = freq.length ? freq[0].count : 1

  const vitalCharts = useMemo(() => {
    const inRange = vitalEntries.filter((e) => {
      const d = new Date(e.timestamp)
      return d >= range.start && d <= range.end
    })
    return vitalTypes
      .map((vt) => {
        const entries = inRange
          .filter((e) => e.vital_type_id === vt.id)
          .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
        if (entries.length < 2) return null
        const data = entries
          .map((e) => {
            const v = parseVitalValue(e, vt.value_schema)
            if (!v) return null
            return { date: e.timestamp.slice(0, 10), ...v }
          })
          .filter(Boolean)
        if (data.length < 2) return null
        return { vt, data }
      })
      .filter(Boolean)
  }, [vitalTypes, vitalEntries, range])

  return (
    <div className={styles.section}>
      <div className={styles.heading}>Health</div>

      {freq.length === 0 && vitalCharts.length === 0 ? (
        <p className={styles.empty}>No health data logged in this period.</p>
      ) : (
        <>
          {freq.length > 0 && (
            <>
              <div className={styles.card}>
                <span className={styles.cardLabel}>Symptom frequency</span>
                <div className={styles.freqRow}>
                  <div className={styles.bodyMapWrap}>
                    <div
                      style={{
                        width: '100%',
                        height: 180,
                        borderRadius: 'var(--radius)',
                        overflow: 'hidden',
                      }}
                    >
                      <BodyViewer3D
                        mode="stats"
                        region="Full Body"
                        regionData={regionData}
                        autoRotate={true}
                      />
                    </div>
                  </div>
                  <div className={styles.freqList}>
                    {freq.map((f) => (
                      <div key={f.name} className={styles.freqItem}>
                        <span className={styles.freqName}>{f.name}</span>
                        <div className={styles.freqTrack}>
                          <div
                            className={styles.freqFill}
                            style={{ width: `${(f.count / maxFreq) * 100}%` }}
                          />
                        </div>
                        <span className={styles.freqCount}>{f.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <SymptomHeatmap symptoms={symptoms} symptomTypes={symptomTypes} range={range} />
            </>
          )}

          {vitalCharts.map(({ vt, data }) => (
            <div key={vt.id} className={styles.card}>
              <span className={styles.cardLabel}>{vt.name}</span>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatXTick}
                    tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                    labelFormatter={formatXTick}
                    formatter={(val) => [`${val} ${vt.unit}`, vt.name]}
                  />
                  {vt.normal_min != null && vt.normal_max != null && (
                    <ReferenceArea
                      y1={vt.normal_min}
                      y2={vt.normal_max}
                      fill="#4ade80"
                      fillOpacity={0.07}
                    />
                  )}
                  {vt.value_schema === 'compound' ? (
                    <>
                      <Line
                        type="monotone"
                        dataKey="sys"
                        stroke="#f97316"
                        strokeWidth={1.5}
                        dot={false}
                        name="Systolic"
                      />
                      <Line
                        type="monotone"
                        dataKey="dia"
                        stroke="#f97316"
                        strokeWidth={1}
                        strokeDasharray="3 2"
                        dot={false}
                        name="Diastolic"
                        opacity={0.6}
                      />
                    </>
                  ) : (
                    <Line
                      type="monotone"
                      dataKey="val"
                      stroke="#3d8ef0"
                      strokeWidth={1.5}
                      dot={false}
                      name={vt.name}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

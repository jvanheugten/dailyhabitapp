import JSZip from 'jszip'
import { db as defaultDb } from '../db/db'

// ─── CSV helpers ──────────────────────────────────────────────────────────────

export function csvQuote(value) {
  if (value == null) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function toCsv(headers, rows) {
  const lines = [headers.map(csvQuote).join(',')]
  for (const row of rows) {
    lines.push(row.map(csvQuote).join(','))
  }
  return lines.join('\n')
}

// ─── Backup JSON ──────────────────────────────────────────────────────────────

export async function buildBackupJSON(db) {
  const [
    habits,
    completions,
    journal_entries,
    notification_prefs,
    symptom_types,
    symptoms,
    vital_types,
    vital_entries,
    google_fit_sync,
  ] = await Promise.all([
    db.habits.toArray(),
    db.completions.toArray(),
    db.journal_entries.toArray(),
    db.notification_prefs.toArray(),
    db.symptom_types.toArray(),
    db.symptoms.toArray(),
    db.vital_types.toArray(),
    db.vital_entries.toArray(),
    db.google_fit_sync.toArray(),
  ])
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    habits,
    completions,
    journal_entries,
    notification_prefs,
    symptom_types,
    symptoms,
    vital_types,
    vital_entries,
    google_fit_sync,
  }
}

// ─── Zip export ───────────────────────────────────────────────────────────────

export async function exportAllData(db = defaultDb) {
  const backup = await buildBackupJSON(db)
  const zip = new JSZip()

  zip.file(
    'habits.csv',
    toCsv(
      ['id', 'name', 'days', 'time', 'streak'],
      backup.habits.map((h) => [
        h.id,
        h.name,
        (h.days ?? []).join(';'),
        h.time ?? '',
        h.streak ?? 0,
      ])
    )
  )

  zip.file(
    'completions.csv',
    toCsv(
      ['id', 'habitId', 'date'],
      backup.completions.map((c) => [c.id, c.habitId, c.date])
    )
  )

  zip.file(
    'journal_entries.csv',
    toCsv(
      ['id', 'date', 'text', 'createdAt', 'updatedAt'],
      backup.journal_entries.map((j) => [
        j.id,
        j.date,
        j.text ?? '',
        j.createdAt ?? '',
        j.updatedAt ?? '',
      ])
    )
  )

  zip.file(
    'symptom_types.csv',
    toCsv(
      ['id', 'name', 'createdAt'],
      backup.symptom_types.map((t) => [t.id, t.name, t.createdAt ?? ''])
    )
  )

  zip.file(
    'symptoms.csv',
    toCsv(
      ['id', 'symptom_type_id', 'region', 'view', 'intensity', 'pain_type', 'notes', 'timestamp'],
      backup.symptoms.map((s) => [
        s.id,
        s.symptom_type_id,
        s.region ?? '',
        s.view ?? '',
        s.intensity ?? '',
        s.pain_type ?? '',
        s.notes ?? '',
        s.timestamp,
      ])
    )
  )

  zip.file(
    'vital_types.csv',
    toCsv(
      ['id', 'name', 'unit', 'value_schema', 'normal_min', 'normal_max', 'is_standard'],
      backup.vital_types.map((t) => [
        t.id,
        t.name,
        t.unit,
        t.value_schema,
        t.normal_min ?? '',
        t.normal_max ?? '',
        t.is_standard ? '1' : '0',
      ])
    )
  )

  zip.file(
    'vital_entries.csv',
    toCsv(
      ['id', 'vital_type_id', 'value', 'notes', 'timestamp', 'source'],
      backup.vital_entries.map((e) => [
        e.id,
        e.vital_type_id,
        e.value,
        e.notes ?? '',
        e.timestamp,
        e.source ?? '',
      ])
    )
  )

  zip.file('backup.json', JSON.stringify(backup, null, 2))

  const blob = await zip.generateAsync({ type: 'blob' })
  const today = new Date().toISOString().slice(0, 10)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dailyhabitapp-export-${today}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

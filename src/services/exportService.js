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
  const lines = [headers.join(',')]
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
    symptom_types,
    symptoms,
    vital_types,
    vital_entries,
    google_fit_sync,
  ] = await Promise.all([
    db.habits.toArray(),
    db.completions.toArray(),
    db.journal_entries.toArray(),
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
    symptom_types,
    symptoms,
    vital_types,
    vital_entries,
    google_fit_sync,
  }
}

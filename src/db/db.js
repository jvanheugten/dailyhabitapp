import Dexie from 'dexie'

export const db = new Dexie('dailyhabit')

const STANDARD_VITAL_TYPES = [
  {
    name: 'Blood Pressure',
    unit: 'mmHg',
    value_schema: 'compound',
    is_standard: true,
    normal_min: null,
    normal_max: null,
  },
  {
    name: 'Blood Sugar',
    unit: 'mmol/L',
    value_schema: 'single',
    is_standard: true,
    normal_min: 3.9,
    normal_max: 7.8,
  },
  {
    name: 'Heart Rate',
    unit: 'bpm',
    value_schema: 'single',
    is_standard: true,
    normal_min: 60,
    normal_max: 100,
  },
  {
    name: 'Weight',
    unit: 'kg',
    value_schema: 'single',
    is_standard: true,
    normal_min: null,
    normal_max: null,
  },
  {
    name: 'Temperature',
    unit: '°C',
    value_schema: 'single',
    is_standard: true,
    normal_min: 36.1,
    normal_max: 37.2,
  },
  {
    name: 'Oxygen Saturation',
    unit: '%',
    value_schema: 'single',
    is_standard: true,
    normal_min: 95,
    normal_max: 100,
  },
]

db.version(1).stores({
  habits: '++id, createdAt',
  completions: '++id, [habitId+date], date',
  journal_entries: '++id, &date',
  notification_prefs: 'habitId',
})

const ACTIVITY_VITAL_TYPES = [
  {
    name: 'Steps',
    unit: 'steps',
    value_schema: 'single',
    is_standard: true,
    normal_min: null,
    normal_max: null,
  },
  {
    name: 'Calories',
    unit: 'kcal',
    value_schema: 'single',
    is_standard: true,
    normal_min: null,
    normal_max: null,
  },
  {
    name: 'Active Minutes',
    unit: 'min',
    value_schema: 'single',
    is_standard: true,
    normal_min: null,
    normal_max: null,
  },
  {
    name: 'Sleep Duration',
    unit: 'min',
    value_schema: 'single',
    is_standard: true,
    normal_min: null,
    normal_max: null,
  },
]

db.version(2)
  .stores({
    habits: '++id, createdAt',
    completions: '++id, [habitId+date], date',
    journal_entries: '++id, &date',
    notification_prefs: 'habitId',
    symptom_types: '++id, name, createdAt',
    symptoms: '++id, symptom_type_id, timestamp, region',
    vital_types: '++id, name, is_standard',
    vital_entries: '++id, vital_type_id, timestamp, source',
    google_fit_sync: '++id, data_type',
  })
  .upgrade(async (tx) => {
    const now = new Date().toISOString()
    const vital_types_with_timestamp = STANDARD_VITAL_TYPES.map((type) => ({
      ...type,
      createdAt: now,
    }))
    return tx.table('vital_types').bulkAdd(vital_types_with_timestamp)
  })

db.version(3)
  .stores({
    habits: '++id, createdAt',
    completions: '++id, [habitId+date], date',
    journal_entries: '++id, &date',
    notification_prefs: 'habitId',
    symptom_types: '++id, name, createdAt',
    symptoms: '++id, symptom_type_id, timestamp, region',
    vital_types: '++id, name, is_standard',
    vital_entries: '++id, vital_type_id, timestamp, source',
    google_fit_sync: '++id, data_type',
  })
  .upgrade(async (tx) => {
    const existing = await tx.table('vital_types').toArray()
    const existingNames = new Set(existing.map((t) => t.name))
    const now = new Date().toISOString()
    const toAdd = ACTIVITY_VITAL_TYPES.filter((t) => !existingNames.has(t.name)).map((t) => ({
      ...t,
      createdAt: now,
    }))
    if (toAdd.length > 0) {
      return tx.table('vital_types').bulkAdd(toAdd)
    }
  })

export async function ensureVitalTypesSeeded() {
  const count = await db.vital_types.count()
  if (count === 0) {
    const now = new Date().toISOString()
    const all_vital_types = [...STANDARD_VITAL_TYPES, ...ACTIVITY_VITAL_TYPES].map((type) => ({
      ...type,
      createdAt: now,
    }))
    await db.vital_types.bulkAdd(all_vital_types)
  }
}

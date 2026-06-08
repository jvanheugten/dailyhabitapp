import Dexie from 'dexie'

export const db = new Dexie('dailyhabit')

db.version(1).stores({
  habits: '++id, createdAt',
  completions: '++id, [habitId+date], date',
  journal_entries: '++id, &date',
  notification_prefs: 'habitId',
})

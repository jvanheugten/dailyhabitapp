import { db } from './db'

beforeEach(async () => {
  await db.habits.clear()
  await db.completions.clear()
  await db.journal_entries.clear()
  await db.notification_prefs.clear()
})

test('database exposes all required tables', () => {
  expect(db.habits).toBeDefined()
  expect(db.completions).toBeDefined()
  expect(db.journal_entries).toBeDefined()
  expect(db.notification_prefs).toBeDefined()
})

test('can add and retrieve a habit', async () => {
  const id = await db.habits.add({
    name: 'Morning run',
    days: [1, 2, 3, 4, 5],
    time: '07:00',
    createdAt: new Date().toISOString(),
  })
  const habit = await db.habits.get(id)
  expect(habit.name).toBe('Morning run')
  expect(habit.days).toEqual([1, 2, 3, 4, 5])
})

test('can add a completion and look it up by [habitId+date]', async () => {
  await db.completions.add({ habitId: 1, date: '2026-06-08', completedAt: new Date().toISOString() })
  const rows = await db.completions.where('[habitId+date]').equals([1, '2026-06-08']).toArray()
  expect(rows).toHaveLength(1)
})

test('journal_entries date is unique — duplicate date throws', async () => {
  await db.journal_entries.add({ date: '2026-06-08', text: 'first', createdAt: '', updatedAt: '' })
  await expect(
    db.journal_entries.add({ date: '2026-06-08', text: 'second', createdAt: '', updatedAt: '' })
  ).rejects.toThrow()
})

test('notification_prefs uses habitId as primary key', async () => {
  await db.notification_prefs.put({ habitId: 42, enabled: true, time: '08:00' })
  await db.notification_prefs.put({ habitId: 42, enabled: false, time: '08:00' })
  const all = await db.notification_prefs.toArray()
  expect(all).toHaveLength(1)
  expect(all[0].enabled).toBe(false)
})

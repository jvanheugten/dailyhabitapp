import { vi } from 'vitest'
import { scheduleHabitReminders } from './notifications'

// Mock Notification API
beforeEach(() => {
  vi.stubGlobal('Notification', {
    permission: 'granted',
  })
  vi.useFakeTimers()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

test('scheduleHabitReminders does nothing if habit has no time', () => {
  const habits = [{ id: 1, name: 'Run', days: [0,1,2,3,4,5,6], time: null, notifyEnabled: true }]
  expect(() => scheduleHabitReminders(habits)).not.toThrow()
})

test('scheduleHabitReminders skips habits with notifyEnabled false', () => {
  const habits = [{ id: 1, name: 'Run', days: [0,1,2,3,4,5,6], time: '08:00', notifyEnabled: false }]
  const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
  scheduleHabitReminders(habits)
  expect(setTimeoutSpy).not.toHaveBeenCalled()
})

test('scheduleHabitReminders skips if habit not scheduled today', () => {
  const today = new Date()
  const todayDay = today.getDay()
  const otherDay = (todayDay + 1) % 7
  const habits = [{ id: 1, name: 'Run', days: [otherDay], time: '08:00', notifyEnabled: true }]
  const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
  scheduleHabitReminders(habits)
  expect(setTimeoutSpy).not.toHaveBeenCalled()
})

test('requestNotificationPermission returns false when Notification unavailable', async () => {
  vi.stubGlobal('Notification', undefined)
  const { requestNotificationPermission } = await import('./notifications?t=' + Date.now())
  const result = await requestNotificationPermission()
  expect(result).toBe(false)
})

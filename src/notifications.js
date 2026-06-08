export async function requestNotificationPermission() {
  if (!window.Notification) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}

// Called on app startup. Schedules browser notifications for habits due today.
// Works when the app is open (foreground or backgrounded PWA).
// True push notifications (app fully closed) require a backend — deferred to Cloud Sync phase.
export function scheduleHabitReminders(habits) {
  if (!window.Notification || Notification.permission !== 'granted') return

  const now = new Date()
  const todayDay = now.getDay()

  habits.forEach((habit) => {
    if (!habit.notifyEnabled) return
    if (!habit.time) return
    if (!habit.days.includes(todayDay)) return

    const [hours, minutes] = habit.time.split(':').map(Number)
    const target = new Date(now)
    target.setHours(hours, minutes, 0, 0)

    const delay = target.getTime() - now.getTime()
    if (delay <= 0) return

    setTimeout(() => {
      new Notification(`Time for: ${habit.name}`, {
        body: 'Tap to open Daily Habit',
        icon: '/icon-192.png',
      })
    }, delay)
  })
}

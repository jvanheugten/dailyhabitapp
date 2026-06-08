// Placeholder — full implementation in Task 15
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

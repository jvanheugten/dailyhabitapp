import { formatDate, today, parseDate, DAY_LETTERS } from './dates'

test('formatDate formats a Date to YYYY-MM-DD', () => {
  expect(formatDate(new Date(2026, 5, 8))).toBe('2026-06-08')
})

test('formatDate pads month and day with zeros', () => {
  expect(formatDate(new Date(2026, 0, 5))).toBe('2026-01-05')
})

test('today returns current date as YYYY-MM-DD', () => {
  const result = today()
  expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})

test('parseDate parses YYYY-MM-DD without timezone shift', () => {
  const d = parseDate('2026-06-08')
  expect(d.getFullYear()).toBe(2026)
  expect(d.getMonth()).toBe(5)
  expect(d.getDate()).toBe(8)
})

test('DAY_LETTERS has 7 entries starting with Sunday', () => {
  expect(DAY_LETTERS).toHaveLength(7)
  expect(DAY_LETTERS[0]).toBe('S') // Sunday
  expect(DAY_LETTERS[1]).toBe('M') // Monday
})

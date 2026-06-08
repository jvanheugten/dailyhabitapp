import { pointsToPath } from './bezier'
import { describe, test, expect } from 'vitest'

describe('pointsToPath', () => {
  test('returns empty string for fewer than 2 points', () => {
    expect(pointsToPath([])).toBe('')
    expect(pointsToPath([{ x: 10, y: 20 }])).toBe('')
  })

  test('returns a line for exactly 2 points', () => {
    const result = pointsToPath([
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ])
    expect(result).toMatch(/^M /)
    expect(result).toContain('0 0')
    expect(result).toContain('100 100')
  })

  test('returns a path starting with M for 3+ points', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 50, y: 50 },
      { x: 100, y: 0 },
    ]
    const result = pointsToPath(points)
    expect(result).toMatch(/^M 0 0/)
    expect(result).toContain('C ')
  })

  test('output is a valid SVG path d attribute (no NaN)', () => {
    const points = Array.from({ length: 10 }, (_, i) => ({ x: i * 10, y: Math.sin(i) * 20 + 50 }))
    const result = pointsToPath(points)
    expect(result).not.toContain('NaN')
    expect(result).not.toContain('undefined')
  })
})

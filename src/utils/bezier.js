// Catmull-Rom → cubic Bézier conversion for smooth freehand paths.
// Input: [{x, y}, ...] touch/pointer points
// Output: SVG path d string
export function pointsToPath(points) {
  if (points.length < 2) return ''
  if (points.length === 2) {
    const [a, b] = points
    return `M ${r(a.x)} ${r(a.y)} L ${r(b.x)} ${r(b.y)}`
  }

  const d = [`M ${r(points[0].x)} ${r(points[0].y)}`]

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(i + 2, points.length - 1)]

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    d.push(`C ${r(cp1x)} ${r(cp1y)}, ${r(cp2x)} ${r(cp2y)}, ${r(p2.x)} ${r(p2.y)}`)
  }

  return d.join(' ')
}

function r(n) {
  return Math.round(n * 10) / 10
}

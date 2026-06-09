import { useState, useRef } from 'react'

// Each stroke: { points: [{x,y,z},...], color, radius }
// 'points' are world-space 3D positions on the mesh surface

export function useBodyPainter({ brushSize, color }) {
  const [strokes, setStrokes] = useState([])
  const currentStrokeRef = useRef(null)

  function beginStroke() {
    currentStrokeRef.current = { points: [], color, radius: brushSize * 0.0003 }
  }

  function addPoint(x, y, z) {
    if (!currentStrokeRef.current) return
    currentStrokeRef.current.points.push({ x, y, z })
  }

  function endStroke() {
    const s = currentStrokeRef.current
    if (s && s.points.length > 0) {
      setStrokes((prev) => [...prev, s])
    }
    currentStrokeRef.current = null
  }

  function undo() {
    setStrokes((prev) => prev.slice(0, -1))
  }

  function clear() {
    setStrokes([])
  }

  return { beginStroke, addPoint, endStroke, undo, clear, strokes }
}

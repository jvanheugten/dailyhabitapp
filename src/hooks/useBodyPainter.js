import { useState, useRef } from 'react'

export function replayStrokes(ctx, strokes, W, H) {
  ctx.clearRect(0, 0, W, H)
  for (const { uvPoints, brushSize, color } of strokes) {
    ctx.fillStyle = color
    ctx.globalAlpha = 0.4
    for (const { u, v } of uvPoints) {
      ctx.beginPath()
      ctx.arc(u * W, v * H, brushSize / 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1.0
}

export function useBodyPainter({ canvasRef, textureRef, brushSize, color }) {
  const [strokes, setStrokes] = useState([])
  const currentStrokeRef = useRef(null)

  function beginStroke() {
    currentStrokeRef.current = { uvPoints: [], brushSize, color }
  }

  function addPoint(u, v) {
    if (!currentStrokeRef.current) return
    currentStrokeRef.current.uvPoints.push({ u, v })

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = color
    ctx.globalAlpha = 0.4
    ctx.beginPath()
    ctx.arc(u * canvas.width, v * canvas.height, brushSize / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1.0
    if (textureRef.current) textureRef.current.needsUpdate = true
  }

  function endStroke() {
    const s = currentStrokeRef.current
    if (s && s.uvPoints.length > 0) {
      setStrokes((prev) => [...prev, s])
    }
    currentStrokeRef.current = null
  }

  function undo() {
    setStrokes((prev) => {
      const next = prev.slice(0, -1)
      const canvas = canvasRef.current
      if (canvas) {
        replayStrokes(canvas.getContext('2d'), next, canvas.width, canvas.height)
        if (textureRef.current) textureRef.current.needsUpdate = true
      }
      return next
    })
  }

  function clear() {
    setStrokes([])
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (textureRef.current) textureRef.current.needsUpdate = true
    }
  }

  return { beginStroke, addPoint, endStroke, undo, clear, strokes }
}

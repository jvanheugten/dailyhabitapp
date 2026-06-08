import { useRef, useState, useCallback } from 'react'
import { pointsToPath } from '../../utils/bezier'
import styles from './DrawingCanvas.module.css'

// Overlay component positioned absolute over a parent with position:relative.
// Captures pointer events, converts to SVG 200×300 coordinate space, records paths.
// Parent is responsible for rendering the <svg> with paths.
export function DrawingCanvas({ paths, onPathsChange, color, strokeWidth = 8 }) {
  const overlayRef = useRef(null)
  const currentPoints = useRef([])
  const [isDrawing, setIsDrawing] = useState(false)

  function toSvgCoords(clientX, clientY) {
    const rect = overlayRef.current.getBoundingClientRect()
    return {
      x: Math.round(((clientX - rect.left) / rect.width) * 200 * 10) / 10,
      y: Math.round(((clientY - rect.top) / rect.height) * 300 * 10) / 10,
    }
  }

  function getClientXY(e) {
    if (e.touches) return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY }
    return { clientX: e.clientX, clientY: e.clientY }
  }

  const onStart = useCallback((e) => {
    e.preventDefault()
    setIsDrawing(true)
    const { clientX, clientY } = getClientXY(e)
    currentPoints.current = [toSvgCoords(clientX, clientY)]
  }, [])

  const onMove = useCallback(
    (e) => {
      e.preventDefault()
      if (!isDrawing) return
      const { clientX, clientY } = getClientXY(e)
      currentPoints.current.push(toSvgCoords(clientX, clientY))
    },
    [isDrawing]
  )

  const onEnd = useCallback(
    (e) => {
      e.preventDefault()
      if (!isDrawing) return
      setIsDrawing(false)
      if (currentPoints.current.length < 2) {
        currentPoints.current = []
        return
      }
      const d = pointsToPath(currentPoints.current)
      onPathsChange([...paths, { d, color, strokeWidth }])
      currentPoints.current = []
    },
    [isDrawing, paths, onPathsChange, color, strokeWidth]
  )

  return (
    <>
      <div
        ref={overlayRef}
        className={styles.overlay}
        onMouseDown={onStart}
        onMouseMove={onMove}
        onMouseUp={onEnd}
        onMouseLeave={onEnd}
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
        onTouchCancel={onEnd}
      />
      <div className={styles.tools}>
        <button type="button" className={styles.tool} aria-label="Draw">
          ✏️
        </button>
        <button
          type="button"
          className={styles.tool}
          aria-label="Erase last"
          onClick={() => onPathsChange(paths.slice(0, -1))}
        >
          ⊘
        </button>
        <button
          type="button"
          className={styles.tool}
          aria-label="Clear all"
          onClick={() => onPathsChange([])}
        >
          🗑
        </button>
      </div>
    </>
  )
}

import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBodyPainter } from './useBodyPainter'

describe('useBodyPainter', () => {
  it('starts with empty strokes', () => {
    const { result } = renderHook(() => useBodyPainter({ brushSize: 12, color: '#f97316' }))
    expect(result.current.strokes).toEqual([])
  })

  it('addPoint + endStroke appends a stroke with world points', () => {
    const { result } = renderHook(() => useBodyPainter({ brushSize: 12, color: '#f97316' }))
    act(() => {
      result.current.beginStroke()
      result.current.addPoint(0.1, 0.5, 0.2)
      result.current.addPoint(0.11, 0.51, 0.21)
      result.current.endStroke()
    })
    expect(result.current.strokes).toHaveLength(1)
    expect(result.current.strokes[0].points).toHaveLength(2)
    expect(result.current.strokes[0].points[0]).toEqual({ x: 0.1, y: 0.5, z: 0.2 })
    expect(result.current.strokes[0].color).toBe('#f97316')
  })

  it('endStroke with no points does not add stroke', () => {
    const { result } = renderHook(() => useBodyPainter({ brushSize: 12, color: '#f97316' }))
    act(() => {
      result.current.beginStroke()
      result.current.endStroke()
    })
    expect(result.current.strokes).toHaveLength(0)
  })

  it('undo removes the last stroke', () => {
    const { result } = renderHook(() => useBodyPainter({ brushSize: 12, color: '#f97316' }))
    act(() => {
      result.current.beginStroke()
      result.current.addPoint(0.1, 0.5, 0.2)
      result.current.endStroke()
      result.current.beginStroke()
      result.current.addPoint(0.2, 0.6, 0.3)
      result.current.endStroke()
    })
    expect(result.current.strokes).toHaveLength(2)
    act(() => {
      result.current.undo()
    })
    expect(result.current.strokes).toHaveLength(1)
  })

  it('clear empties all strokes', () => {
    const { result } = renderHook(() => useBodyPainter({ brushSize: 12, color: '#f97316' }))
    act(() => {
      result.current.beginStroke()
      result.current.addPoint(0.1, 0.5, 0.2)
      result.current.endStroke()
    })
    act(() => {
      result.current.clear()
    })
    expect(result.current.strokes).toHaveLength(0)
  })
})

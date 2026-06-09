import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBodyPainter, replayStrokes } from './useBodyPainter'

function makeMockCtx() {
  return {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillStyle: '',
    globalAlpha: 1,
  }
}

function makeCanvas(ctx) {
  return { width: 1024, height: 1024, getContext: () => ctx }
}

describe('replayStrokes', () => {
  it('clears then draws each UV point', () => {
    const ctx = makeMockCtx()
    const strokes = [{ uvPoints: [{ u: 0.5, v: 0.25 }], brushSize: 10, color: '#f97316' }]
    replayStrokes(ctx, strokes, 1024, 1024)
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 1024, 1024)
    expect(ctx.arc).toHaveBeenCalledWith(512, 256, 5, 0, Math.PI * 2)
    expect(ctx.fill).toHaveBeenCalled()
  })

  it('clears canvas when strokes is empty', () => {
    const ctx = makeMockCtx()
    replayStrokes(ctx, [], 1024, 1024)
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 1024, 1024)
    expect(ctx.arc).not.toHaveBeenCalled()
  })
})

describe('useBodyPainter', () => {
  it('starts with empty strokes', () => {
    const canvasRef = { current: null }
    const textureRef = { current: null }
    const { result } = renderHook(() =>
      useBodyPainter({ canvasRef, textureRef, brushSize: 12, color: '#f97316' })
    )
    expect(result.current.strokes).toEqual([])
  })

  it('addPoint + endStroke appends a stroke', () => {
    const ctx = makeMockCtx()
    const canvasRef = { current: makeCanvas(ctx) }
    const textureRef = { current: null }
    const { result } = renderHook(() =>
      useBodyPainter({ canvasRef, textureRef, brushSize: 12, color: '#f97316' })
    )
    act(() => {
      result.current.beginStroke()
      result.current.addPoint(0.5, 0.3)
      result.current.addPoint(0.51, 0.31)
      result.current.endStroke()
    })
    expect(result.current.strokes).toHaveLength(1)
    expect(result.current.strokes[0].uvPoints).toHaveLength(2)
    expect(result.current.strokes[0].color).toBe('#f97316')
    expect(result.current.strokes[0].brushSize).toBe(12)
  })

  it('endStroke with no points does not add stroke', () => {
    const canvasRef = { current: null }
    const textureRef = { current: null }
    const { result } = renderHook(() =>
      useBodyPainter({ canvasRef, textureRef, brushSize: 12, color: '#f97316' })
    )
    act(() => {
      result.current.beginStroke()
      result.current.endStroke()
    })
    expect(result.current.strokes).toHaveLength(0)
  })

  it('undo removes the last stroke', () => {
    const ctx = makeMockCtx()
    const canvasRef = { current: makeCanvas(ctx) }
    const textureRef = { current: null }
    const { result } = renderHook(() =>
      useBodyPainter({ canvasRef, textureRef, brushSize: 12, color: '#f97316' })
    )
    act(() => {
      result.current.beginStroke()
      result.current.addPoint(0.5, 0.5)
      result.current.endStroke()
      result.current.beginStroke()
      result.current.addPoint(0.6, 0.6)
      result.current.endStroke()
    })
    expect(result.current.strokes).toHaveLength(2)
    act(() => {
      result.current.undo()
    })
    expect(result.current.strokes).toHaveLength(1)
  })

  it('clear empties all strokes', () => {
    const ctx = makeMockCtx()
    const canvasRef = { current: makeCanvas(ctx) }
    const textureRef = { current: null }
    const { result } = renderHook(() =>
      useBodyPainter({ canvasRef, textureRef, brushSize: 12, color: '#f97316' })
    )
    act(() => {
      result.current.beginStroke()
      result.current.addPoint(0.5, 0.5)
      result.current.endStroke()
    })
    act(() => {
      result.current.clear()
    })
    expect(result.current.strokes).toHaveLength(0)
    expect(ctx.clearRect).toHaveBeenCalled()
  })
})

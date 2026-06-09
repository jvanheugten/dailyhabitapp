import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { BodyViewer3D, countToHeatColor } from './BodyViewer3D'

// Mock Three.js — no WebGL in jsdom
vi.mock('three', () => {
  const domElement = document.createElement('canvas')
  return {
    Scene: vi.fn(function () {
      return { add: vi.fn(), background: null }
    }),
    PerspectiveCamera: vi.fn(function () {
      return {
        position: { set: vi.fn() },
        aspect: 1,
        updateProjectionMatrix: vi.fn(),
      }
    }),
    WebGLRenderer: vi.fn(function () {
      return {
        setSize: vi.fn(),
        setPixelRatio: vi.fn(),
        domElement,
        render: vi.fn(),
        dispose: vi.fn(),
      }
    }),
    AmbientLight: vi.fn(function () {
      return {}
    }),
    DirectionalLight: vi.fn(function () {
      return { position: { set: vi.fn() } }
    }),
    HemisphereLight: vi.fn(function () {
      return {}
    }),
    Color: vi.fn(),
    CanvasTexture: vi.fn(function () {
      return { needsUpdate: false, dispose: vi.fn() }
    }),
    MeshStandardMaterial: vi.fn(function () {
      return {}
    }),
    Raycaster: vi.fn(function () {
      return { setFromCamera: vi.fn(), intersectObject: vi.fn(() => []) }
    }),
    Vector2: vi.fn(function () {
      return { x: 0, y: 0 }
    }),
  }
})

vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: vi.fn(function () {
    return { load: vi.fn() }
  }),
}))

vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: vi.fn(function () {
    return {
      target: { set: vi.fn() },
      update: vi.fn(),
      dispose: vi.fn(),
      enableDamping: true,
      dampingFactor: 0.05,
      autoRotate: false,
      autoRotateSpeed: 3,
      enabled: true,
    }
  }),
}))

vi.mock('../../hooks/useBodyPainter', () => ({
  useBodyPainter: vi.fn(() => ({
    beginStroke: vi.fn(),
    addPoint: vi.fn(),
    endStroke: vi.fn(),
    undo: vi.fn(),
    clear: vi.fn(),
    strokes: [],
  })),
  replayStrokes: vi.fn(),
}))

describe('BodyViewer3D', () => {
  it('renders mount container without crashing', () => {
    const { container } = render(<BodyViewer3D mode="stats" region="Full Body" regionData={{}} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('GLTFLoader.load is called with the body model URL', async () => {
    render(<BodyViewer3D mode="stats" region="Full Body" regionData={{}} />)
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
    const instance = GLTFLoader.mock.results[0]?.value
    expect(instance?.load).toHaveBeenCalledWith(
      expect.stringContaining('body.glb'),
      expect.any(Function),
      undefined,
      expect.any(Function)
    )
  })
})

describe('countToHeatColor', () => {
  it('returns amber for low intensity', () => {
    expect(countToHeatColor(1, 1)).toContain('251,191,36')
  })

  it('returns orange for medium intensity', () => {
    expect(countToHeatColor(1, 3)).toContain('249,115,22')
  })

  it('returns red for high intensity', () => {
    expect(countToHeatColor(1, 5)).toContain('239,68,68')
  })

  it('alpha scales with count', () => {
    const low = countToHeatColor(1, 5)
    const high = countToHeatColor(5, 5)
    const alphaLow = Number(low.match(/[\d.]+\)$/)[0].slice(0, -1))
    const alphaHigh = Number(high.match(/[\d.]+\)$/)[0].slice(0, -1))
    expect(alphaHigh).toBeGreaterThan(alphaLow)
  })
})

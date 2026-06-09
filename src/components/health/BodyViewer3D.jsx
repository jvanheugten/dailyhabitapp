/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useBodyPainter, replayStrokes } from '../../hooks/useBodyPainter'
import styles from './BodyViewer3D.module.css'

const BASE = import.meta.env?.BASE_URL ?? '/'
const MODEL_URL = `${BASE}models/body.glb`
const CANVAS_SIZE = 1024

export const REGION_CAMERA = {
  'Full Body': { target: [0, 0.8, 0], position: [0, 0.8, 3.2] },
  Head: { target: [0, 1.7, 0], position: [0, 1.7, 1.2] },
  Neck: { target: [0, 1.55, 0], position: [0, 1.55, 1.0] },
  Chest: { target: [0, 1.1, 0], position: [0, 1.1, 1.4] },
  'Upper Back': { target: [0, 1.1, 0], position: [0, 1.1, -1.4] },
  Abdomen: { target: [0, 0.7, 0], position: [0, 0.7, 1.3] },
  'Lower Back': { target: [0, 0.7, 0], position: [0, 0.7, -1.3] },
  'Left Shoulder': { target: [-0.5, 1.3, 0], position: [-1.2, 1.3, 1.0] },
  'Right Shoulder': { target: [0.5, 1.3, 0], position: [1.2, 1.3, 1.0] },
  'Left Arm': { target: [-0.7, 0.9, 0], position: [-1.5, 0.9, 0.8] },
  'Right Arm': { target: [0.7, 0.9, 0], position: [1.5, 0.9, 0.8] },
  'Left Hand': { target: [-0.9, 0.4, 0], position: [-1.8, 0.4, 0.6] },
  'Right Hand': { target: [0.9, 0.4, 0], position: [1.8, 0.4, 0.6] },
  'Left Hip': { target: [-0.3, 0.5, 0], position: [-0.8, 0.5, 1.2] },
  'Right Hip': { target: [0.3, 0.5, 0], position: [0.8, 0.5, 1.2] },
  'Left Thigh': { target: [-0.3, 0.1, 0], position: [-0.9, 0.1, 1.2] },
  'Right Thigh': { target: [0.3, 0.1, 0], position: [0.9, 0.1, 1.2] },
  'Left Lower Leg': { target: [-0.3, -0.5, 0], position: [-0.9, -0.5, 1.1] },
  'Right Lower Leg': { target: [0.3, -0.5, 0], position: [0.9, -0.5, 1.1] },
  'Left Foot': { target: [-0.3, -0.9, 0], position: [-0.8, -0.9, 0.9] },
  'Right Foot': { target: [0.3, -0.9, 0], position: [0.8, -0.9, 0.9] },
}

export const REGION_UV_CENTROID = {
  'Full Body': { u: 0.5, v: 0.5 },
  Head: { u: 0.5, v: 0.06 },
  Neck: { u: 0.5, v: 0.13 },
  Chest: { u: 0.45, v: 0.26 },
  'Upper Back': { u: 0.55, v: 0.26 },
  Abdomen: { u: 0.45, v: 0.4 },
  'Lower Back': { u: 0.55, v: 0.4 },
  'Left Shoulder': { u: 0.28, v: 0.21 },
  'Right Shoulder': { u: 0.72, v: 0.21 },
  'Left Arm': { u: 0.18, v: 0.37 },
  'Right Arm': { u: 0.82, v: 0.37 },
  'Left Hand': { u: 0.13, v: 0.52 },
  'Right Hand': { u: 0.87, v: 0.52 },
  'Left Hip': { u: 0.38, v: 0.56 },
  'Right Hip': { u: 0.62, v: 0.56 },
  'Left Thigh': { u: 0.38, v: 0.68 },
  'Right Thigh': { u: 0.62, v: 0.68 },
  'Left Lower Leg': { u: 0.38, v: 0.82 },
  'Right Lower Leg': { u: 0.62, v: 0.82 },
  'Left Foot': { u: 0.38, v: 0.94 },
  'Right Foot': { u: 0.62, v: 0.94 },
}

export function countToHeatColor(count, maxIntensity) {
  const alpha = Math.min(0.9, 0.3 + count * 0.15)
  if (maxIntensity <= 2) return `rgba(251,191,36,${alpha})`
  if (maxIntensity <= 3) return `rgba(249,115,22,${alpha})`
  return `rgba(239,68,68,${alpha})`
}

export const BodyViewer3D = forwardRef(function BodyViewer3D(
  {
    mode = 'stats',
    region = 'Full Body',
    strokes = [],
    onStrokesChange,
    brushSize = 12,
    paintColor = '#f97316',
    regionData = {},
    autoRotate = false,
    isPainting = false,
  },
  ref
) {
  const mountRef = useRef(null)
  const canvasRef = useRef(null)
  const textureRef = useRef(null)
  const meshRef = useRef(null)
  const isPaintingRef = useRef(isPainting)

  useEffect(() => {
    isPaintingRef.current = isPainting
  }, [isPainting])

  const painter = useBodyPainter({ canvasRef, textureRef, brushSize, color: paintColor })

  useImperativeHandle(ref, () => ({
    undo: painter.undo,
    clear: painter.clear,
  }))

  useEffect(() => {
    onStrokesChange?.(painter.strokes)
  }, [painter.strokes, onStrokesChange])

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const paintCanvas = document.createElement('canvas')
    paintCanvas.width = CANVAS_SIZE
    paintCanvas.height = CANVAS_SIZE
    canvasRef.current = paintCanvas

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(el.clientWidth || 300, el.clientHeight || 400)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x070c16)

    const cam = new THREE.PerspectiveCamera(
      45,
      (el.clientWidth || 300) / (el.clientHeight || 400),
      0.1,
      100
    )
    const camConfig = REGION_CAMERA[region] ?? REGION_CAMERA['Full Body']
    cam.position.set(...camConfig.position)

    scene.add(new THREE.AmbientLight(0xffffff, 0.4))
    const dir = new THREE.DirectionalLight(0xffffff, 1.2)
    dir.position.set(2, 4, 3)
    scene.add(dir)
    scene.add(new THREE.HemisphereLight(0x3d8ef0, 0x070c16, 0.3))

    const controls = new OrbitControls(cam, renderer.domElement)
    controls.target.set(...camConfig.target)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.autoRotate = autoRotate
    controls.autoRotateSpeed = 3
    controls.enabled = !isPaintingRef.current

    const texture = new THREE.CanvasTexture(paintCanvas)
    textureRef.current = texture

    if (strokes.length > 0) {
      replayStrokes(paintCanvas.getContext('2d'), strokes, CANVAS_SIZE, CANVAS_SIZE)
      texture.needsUpdate = true
    }

    const loader = new GLTFLoader()
    loader.load(
      MODEL_URL,
      (gltf) => {
        let mesh = null
        gltf.scene.traverse((obj) => {
          if (obj.isMesh && !mesh) mesh = obj
        })
        if (!mesh) return
        mesh.material = new THREE.MeshStandardMaterial({ map: texture, color: 0xb0c8e0 })
        scene.add(gltf.scene)
        meshRef.current = mesh

        if (mode === 'stats' && Object.keys(regionData).length > 0) {
          const ctx = paintCanvas.getContext('2d')
          for (const [name, { count, maxIntensity }] of Object.entries(regionData)) {
            const centroid = REGION_UV_CENTROID[name]
            if (!centroid) continue
            const x = centroid.u * CANVAS_SIZE
            const y = centroid.v * CANVAS_SIZE
            const r = Math.min(120, 40 + count * 15)
            const color = countToHeatColor(count, maxIntensity)
            const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
            grad.addColorStop(0, color)
            grad.addColorStop(1, 'rgba(0,0,0,0)')
            ctx.fillStyle = grad
            ctx.beginPath()
            ctx.arc(x, y, r, 0, Math.PI * 2)
            ctx.fill()
          }
          texture.needsUpdate = true
        }
      },
      undefined,
      () => {
        el.dataset.error = 'load'
      }
    )

    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2()

    function getNDC(e) {
      const rect = renderer.domElement.getBoundingClientRect()
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1
    }

    function handlePointerDown(e) {
      if (!isPaintingRef.current || !meshRef.current) return
      e.preventDefault()
      getNDC(e)
      raycaster.setFromCamera(ndc, cam)
      const hits = raycaster.intersectObject(meshRef.current)
      if (!hits.length || !hits[0].uv) return
      painter.beginStroke()
      painter.addPoint(hits[0].uv.x, hits[0].uv.y)
    }

    function handlePointerMove(e) {
      if (!isPaintingRef.current || !meshRef.current) return
      e.preventDefault()
      getNDC(e)
      raycaster.setFromCamera(ndc, cam)
      const hits = raycaster.intersectObject(meshRef.current)
      if (!hits.length || !hits[0].uv) return
      painter.addPoint(hits[0].uv.x, hits[0].uv.y)
    }

    function handlePointerUp() {
      if (!isPaintingRef.current) return
      painter.endStroke()
    }

    renderer.domElement.addEventListener('pointerdown', handlePointerDown)
    renderer.domElement.addEventListener('pointermove', handlePointerMove)
    renderer.domElement.addEventListener('pointerup', handlePointerUp)
    renderer.domElement.addEventListener('touchstart', handlePointerDown, { passive: false })
    renderer.domElement.addEventListener('touchmove', handlePointerMove, { passive: false })
    renderer.domElement.addEventListener('touchend', handlePointerUp)

    let animId
    function animate() {
      animId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, cam)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown)
      renderer.domElement.removeEventListener('pointermove', handlePointerMove)
      renderer.domElement.removeEventListener('pointerup', handlePointerUp)
      renderer.domElement.removeEventListener('touchstart', handlePointerDown)
      renderer.domElement.removeEventListener('touchmove', handlePointerMove)
      renderer.domElement.removeEventListener('touchend', handlePointerUp)
      controls.dispose()
      renderer.dispose()
      texture.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [region, mode, autoRotate]) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={mountRef} className={styles.wrap} />
})

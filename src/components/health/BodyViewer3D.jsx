/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useBodyPainter } from '../../hooks/useBodyPainter'
import styles from './BodyViewer3D.module.css'

const BASE = import.meta.env?.BASE_URL ?? '/'
const MODEL_URL = `${BASE}models/body.glb`

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

// Fractional positions within model bounding box [0=min, 1=max] per axis
const REGION_BOX_FRACTION = {
  'Full Body': { fx: 0.5, fy: 0.5, fz: 0.7 },
  Head: { fx: 0.5, fy: 0.96, fz: 0.6 },
  Neck: { fx: 0.5, fy: 0.88, fz: 0.6 },
  Chest: { fx: 0.5, fy: 0.72, fz: 0.75 },
  'Upper Back': { fx: 0.5, fy: 0.72, fz: 0.3 },
  Abdomen: { fx: 0.5, fy: 0.58, fz: 0.75 },
  'Lower Back': { fx: 0.5, fy: 0.52, fz: 0.3 },
  'Left Shoulder': { fx: 0.2, fy: 0.8, fz: 0.6 },
  'Right Shoulder': { fx: 0.8, fy: 0.8, fz: 0.6 },
  'Left Arm': { fx: 0.1, fy: 0.6, fz: 0.6 },
  'Right Arm': { fx: 0.9, fy: 0.6, fz: 0.6 },
  'Left Hand': { fx: 0.06, fy: 0.4, fz: 0.6 },
  'Right Hand': { fx: 0.94, fy: 0.4, fz: 0.6 },
  'Left Hip': { fx: 0.35, fy: 0.44, fz: 0.6 },
  'Right Hip': { fx: 0.65, fy: 0.44, fz: 0.6 },
  'Left Thigh': { fx: 0.35, fy: 0.3, fz: 0.6 },
  'Right Thigh': { fx: 0.65, fy: 0.3, fz: 0.6 },
  'Left Lower Leg': { fx: 0.35, fy: 0.14, fz: 0.6 },
  'Right Lower Leg': { fx: 0.65, fy: 0.14, fz: 0.6 },
  'Left Foot': { fx: 0.35, fy: 0.02, fz: 0.6 },
  'Right Foot': { fx: 0.65, fy: 0.02, fz: 0.6 },
}

export function countToHeatColor(count, maxIntensity) {
  const alpha = Math.min(0.9, 0.3 + count * 0.15)
  if (maxIntensity <= 2) return `rgba(251,191,36,${alpha})`
  if (maxIntensity <= 3) return `rgba(249,115,22,${alpha})`
  return `rgba(239,68,68,${alpha})`
}

function heatColorToHex(count, maxIntensity) {
  if (maxIntensity <= 2) return 0xfbbf24
  if (maxIntensity <= 3) return 0xf97316
  return 0xef4444
}

function makeSphere(radius, color, opacity = 1) {
  const geo = new THREE.SphereGeometry(radius, 8, 6)
  const mat = new THREE.MeshStandardMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthTest: false,
  })
  return new THREE.Mesh(geo, mat)
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
  const meshRef = useRef(null)
  const materialRef = useRef(null)
  const gltfSceneRef = useRef(null)
  const controlsRef = useRef(null)
  const sceneRef = useRef(null)
  const paintGroupRef = useRef(null) // holds live stroke meshes during painting
  const strokeMeshesRef = useRef([]) // [ [mesh,...], [mesh,...] ] one array per committed stroke
  const heatGroupRef = useRef(null)
  const modelBoundsRef = useRef(null)
  const isPaintingRef = useRef(isPainting)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    isPaintingRef.current = isPainting
    if (controlsRef.current) controlsRef.current.enabled = !isPainting
  }, [isPainting])

  const painter = useBodyPainter({ brushSize, color: paintColor })
  const painterRef = useRef(painter)
  useEffect(() => {
    painterRef.current = painter
  })

  useImperativeHandle(ref, () => ({
    undo: painter.undo,
    clear: painter.clear,
  }))

  useEffect(() => {
    onStrokesChange?.(painter.strokes)
  }, [painter.strokes, onStrokesChange])

  // Sync 3D sphere meshes with strokes state
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    const existing = strokeMeshesRef.current
    const diff = strokes.length - existing.length

    if (diff < 0) {
      // Undo: remove surplus stroke groups
      for (let i = strokes.length; i < existing.length; i++) {
        existing[i].forEach((m) => {
          scene.remove(m)
          m.geometry.dispose()
          m.material.dispose()
        })
      }
      strokeMeshesRef.current = existing.slice(0, strokes.length)
    } else if (diff > 0) {
      // New strokes added: create spheres for each new stroke
      for (let i = existing.length; i < strokes.length; i++) {
        const stroke = strokes[i]
        const meshes = stroke.points.map(({ x, y, z }) => {
          const s = makeSphere(stroke.radius, new THREE.Color(stroke.color))
          s.position.set(x, y, z)
          scene.add(s)
          return s
        })
        existing.push(meshes)
      }
    } else if (diff === 0 && strokes.length === 0 && existing.length > 0) {
      // Clear
      existing.forEach((group) =>
        group.forEach((m) => {
          scene.remove(m)
          m.geometry.dispose()
          m.material.dispose()
        })
      )
      strokeMeshesRef.current = []
    }
  }, [strokes])

  // Stats mode: rebuild heat markers when regionData changes
  useEffect(() => {
    const scene = sceneRef.current
    const bounds = modelBoundsRef.current
    if (!scene || mode !== 'stats') return

    // Remove old heat group
    if (heatGroupRef.current) {
      scene.remove(heatGroupRef.current)
      heatGroupRef.current.traverse((o) => {
        if (o.isMesh) {
          o.geometry.dispose()
          o.material.dispose()
        }
      })
      heatGroupRef.current = null
    }
    if (!bounds || Object.keys(regionData).length === 0) return

    const group = new THREE.Group()
    const { min, size } = bounds

    for (const [name, { count, maxIntensity }] of Object.entries(regionData)) {
      const frac = REGION_BOX_FRACTION[name]
      if (!frac) continue
      const pos = new THREE.Vector3(
        min.x + frac.fx * size.x,
        min.y + frac.fy * size.y,
        min.z + frac.fz * size.z
      )
      const radius = size.y * (0.04 + Math.min(count, 10) * 0.006)
      const alpha = Math.min(0.85, 0.3 + count * 0.12)
      const hex = heatColorToHex(count, maxIntensity)
      const geo = new THREE.SphereGeometry(radius, 12, 8)
      const mat = new THREE.MeshStandardMaterial({ color: hex, transparent: true, opacity: alpha })
      const sphere = new THREE.Mesh(geo, mat)
      sphere.position.copy(pos)
      group.add(sphere)
    }

    scene.add(group)
    heatGroupRef.current = group
  }, [regionData, mode])

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    let cancelled = false

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(el.clientWidth || 300, el.clientHeight || 400)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x070c16)
    sceneRef.current = scene

    // Paint group for live (uncommitted) stroke points
    const liveGroup = new THREE.Group()
    scene.add(liveGroup)
    paintGroupRef.current = liveGroup

    const cam = new THREE.PerspectiveCamera(
      45,
      (el.clientWidth || 300) / (el.clientHeight || 400),
      0.1,
      100
    )
    const camConfig = REGION_CAMERA[region] ?? REGION_CAMERA['Full Body']
    cam.position.set(...camConfig.position)

    scene.add(new THREE.AmbientLight(0xffffff, 0.8))
    const dir = new THREE.DirectionalLight(0xffffff, 1.6)
    dir.position.set(2, 4, 3)
    scene.add(dir)
    const dir2 = new THREE.DirectionalLight(0xffffff, 0.4)
    dir2.position.set(-2, -1, -2)
    scene.add(dir2)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x3d8ef0, 0.3))

    const controls = new OrbitControls(cam, renderer.domElement)
    controlsRef.current = controls
    controls.target.set(...camConfig.target)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.autoRotate = autoRotate
    controls.autoRotateSpeed = 3
    controls.enabled = !isPaintingRef.current

    const loader = new GLTFLoader()
    loader.load(
      MODEL_URL,
      (gltf) => {
        if (cancelled) return
        let mesh = null
        gltf.scene.traverse((obj) => {
          if (obj.isMesh && !mesh) mesh = obj
        })
        if (!mesh) return

        const material = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          side: THREE.DoubleSide,
        })
        mesh.material = material
        materialRef.current = material
        gltfSceneRef.current = gltf.scene
        scene.add(gltf.scene)
        meshRef.current = mesh

        gltf.scene.updateMatrixWorld(true)
        const box = new THREE.Box3().setFromObject(gltf.scene)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        modelBoundsRef.current = { min: box.min.clone(), max: box.max.clone(), size: size.clone() }

        const camDist = (maxDim / 2 / Math.tan((cam.fov * Math.PI) / 180 / 2)) * 1.5
        cam.near = maxDim / 100
        cam.far = maxDim * 100
        cam.position.set(center.x, center.y, center.z + camDist)
        cam.updateProjectionMatrix()
        controls.target.copy(center)
        controls.update()

        // Replay existing strokes (e.g. re-mounting with saved data)
        if (strokes.length > 0) {
          strokes.forEach((stroke) => {
            const meshes = stroke.points.map(({ x, y, z }) => {
              const s = makeSphere(stroke.radius, new THREE.Color(stroke.color))
              s.position.set(x, y, z)
              scene.add(s)
              return s
            })
            strokeMeshesRef.current.push(meshes)
          })
        }
      },
      undefined,
      () => {
        if (!cancelled) setLoadError(true)
      }
    )

    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2()

    function getNDC(e) {
      const rect = renderer.domElement.getBoundingClientRect()
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    }

    function handlePointerDown(e) {
      if (!isPaintingRef.current || !meshRef.current) return
      e.preventDefault()
      getNDC(e)
      raycaster.setFromCamera(ndc, cam)
      const hits = raycaster.intersectObject(meshRef.current, true)
      if (!hits.length) return
      const { point } = hits[0]
      const bounds = modelBoundsRef.current
      const radius = bounds ? Math.max(bounds.size.x, bounds.size.y, bounds.size.z) * 0.015 : 0.02
      painterRef.current.beginStroke()
      painterRef.current.addPoint(point.x, point.y, point.z)
      // Show live dot immediately
      const dot = makeSphere(radius, new THREE.Color(paintColor))
      dot.position.copy(point)
      liveGroup.add(dot)
    }

    function handlePointerMove(e) {
      if (!isPaintingRef.current || !meshRef.current) return
      e.preventDefault()
      getNDC(e)
      raycaster.setFromCamera(ndc, cam)
      const hits = raycaster.intersectObject(meshRef.current, true)
      if (!hits.length) return
      const { point } = hits[0]
      const bounds = modelBoundsRef.current
      const radius = bounds ? Math.max(bounds.size.x, bounds.size.y, bounds.size.z) * 0.015 : 0.02
      painterRef.current.addPoint(point.x, point.y, point.z)
      const dot = makeSphere(radius, new THREE.Color(paintColor))
      dot.position.copy(point)
      liveGroup.add(dot)
    }

    function handlePointerUp() {
      painterRef.current.endStroke()
      // Clear live group (stroke now in painter.strokes → synced via useEffect)
      liveGroup.children.slice().forEach((m) => {
        liveGroup.remove(m)
        m.geometry.dispose()
        m.material.dispose()
      })
    }

    renderer.domElement.addEventListener('pointerdown', handlePointerDown)
    renderer.domElement.addEventListener('pointermove', handlePointerMove)
    renderer.domElement.addEventListener('pointerup', handlePointerUp)

    let animId
    function animate() {
      animId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, cam)
    }
    animate()

    const resizeObserver = new ResizeObserver(() => {
      if (cancelled) return
      const w = el.clientWidth || 300
      const h = el.clientHeight || 400
      renderer.setSize(w, h)
      cam.aspect = w / h
      cam.updateProjectionMatrix()
    })
    resizeObserver.observe(el)

    return () => {
      cancelled = true
      cancelAnimationFrame(animId)
      resizeObserver.disconnect()
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown)
      renderer.domElement.removeEventListener('pointermove', handlePointerMove)
      renderer.domElement.removeEventListener('pointerup', handlePointerUp)
      controls.dispose()
      controlsRef.current = null
      renderer.dispose()
      sceneRef.current = null
      paintGroupRef.current = null
      strokeMeshesRef.current = []
      if (gltfSceneRef.current) {
        gltfSceneRef.current.traverse((obj) => {
          if (obj.isMesh) {
            obj.geometry?.dispose()
            if (obj.material && obj.material !== materialRef.current) obj.material.dispose()
          }
        })
        gltfSceneRef.current = null
      }
      if (materialRef.current) {
        materialRef.current.dispose()
        materialRef.current = null
      }
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [region, mode, autoRotate]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loadError) {
    return <div className={styles.error}>3D view unavailable — model failed to load</div>
  }
  return <div ref={mountRef} className={styles.wrap} />
})

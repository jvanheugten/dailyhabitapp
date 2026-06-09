# 3D Body Map — Design Spec

## Goal

Replace the flat SVG body map with an interactive 3D body viewer: a region picker leads to a Three.js scene where the user can rotate the body and paint freehand on the surface to mark where it hurts. The same model displays as a static heat map in the Health overview and Stats page.

## Model

`public/models/body.glb` — pre-placed by the user. Single mesh (`Cube__0`), single material, UV coordinates present (`TEXCOORD_0`), no embedded textures. 134KB. Loaded at runtime via Three.js `GLTFLoader`.

## New Logging Flow

**Step 1 → Region Picker** (replaces the old flat body map tap)
**Step 2 → 3D Paint View** (replaces BodyRegion zoom + SVG draw)
**Step 3 → Metadata** (symptom type, pain quality, notes, timestamp — unchanged)

## Component Architecture

| File | Responsibility |
|---|---|
| `src/components/health/RegionPicker.jsx` + `.module.css` | Scrollable chip grid of body regions |
| `src/components/health/BodyViewer3D.jsx` + `.module.css` | Three.js scene — log mode (paint) and stats mode (heat map) |
| `src/hooks/useBodyPainter.js` | Raycasting, CanvasTexture painting, undo stack |
| `src/components/health/PaintControls.jsx` + `.module.css` | Toolbar: rotate/paint toggle, brush size, undo, clear |
| `src/contexts/HealthContext.jsx` | Store `uv_strokes` JSON on symptoms instead of `svg_paths` |

**Updated:**
- `src/components/health/LogSymptomSheet.jsx` — new step 1 (RegionPicker) and step 2 (BodyViewer3D)
- `src/screens/Health.jsx` — replace BodyMap with BodyViewer3D in stats mode for the overview card
- `src/components/stats/HealthStats.jsx` — replace BodyMap with BodyViewer3D for the symptom frequency card

**Removed** (no longer needed):
- `src/components/health/BodyMap.jsx`
- `src/components/health/BodyRegion.jsx`
- `src/components/health/SymptomThumbnail.jsx` — replaced by a 3D thumbnail

**New dependency:** `three` (`npm install three`)

## RegionPicker

A scrollable grid of tappable chips. Tapping one proceeds to the 3D view pre-zoomed to that region.

Regions (20 total):
```
Full Body | Head | Neck | Chest | Upper Back | Abdomen | Lower Back
Left Shoulder | Right Shoulder | Left Arm | Right Arm | Left Hand | Right Hand
Left Hip | Right Hip | Left Thigh | Right Thigh | Left Lower Leg | Right Lower Leg | Left Foot | Right Foot
```

Each chip: `background: var(--surface); border: 1px solid var(--border-subtle); border-radius: 20px; padding: 8px 14px; font-size: 13px`. Active/selected: `background: var(--accent-dim); border-color: var(--accent); color: var(--accent)`.

## BodyViewer3D

### Scene setup

```js
// Camera: PerspectiveCamera(45, aspect, 0.1, 100), positioned at (0, 1, 3)
// Lights: AmbientLight(0xffffff, 0.4) + DirectionalLight(0xffffff, 1.2) at (2,4,3)
//         + HemisphereLight(0x3d8ef0, 0x070c16, 0.3)
// Renderer: WebGLRenderer({ antialias: true, alpha: true }), background #070c16
// Controls: OrbitControls — disabled when in paint mode
```

### Log mode (interactive)

Props: `region` (string), `onStrokesChange(strokes)`, `strokes` (array)

- Load `body.glb` via `GLTFLoader`
- Apply `MeshStandardMaterial` with `map: canvasTexture` (1024×1024 CanvasTexture, starts transparent)
- Camera zooms to the bounding box of the selected `region` on load (using a pre-defined camera position per region — see Region Camera Positions below)
- OrbitControls enabled in rotate mode; disabled in paint mode
- Touch/mouse events in paint mode: raycast → UV → paint

### Stats mode (read-only heat map)

Props: `regionColors` (object: `{ regionName: { count, maxIntensity } }`), `autoRotate?: boolean`

- Same scene setup, no OrbitControls interaction
- `autoRotate: true` on OrbitControls (slow spin, 0.5 rpm)
- For each symptom entry: find UV centroid for that region (pre-defined lookup), draw radial gradient on canvas at that point, colour = `countToHeatColor(count, maxIntensity)`
- `canvasTexture.needsUpdate = true` after all entries drawn

### Region Camera Positions

Pre-defined `(x, y, z)` camera target + position per region name:

```js
const REGION_CAMERA = {
  'Full Body':     { target: [0, 0.8, 0], position: [0, 0.8, 3.2] },
  'Head':          { target: [0, 1.7, 0], position: [0, 1.7, 1.2] },
  'Chest':         { target: [0, 1.1, 0], position: [0, 1.1, 1.4] },
  'Abdomen':       { target: [0, 0.7, 0], position: [0, 0.7, 1.3] },
  'Upper Back':    { target: [0, 1.1, 0], position: [0, 1.1,-1.4] },
  'Lower Back':    { target: [0, 0.7, 0], position: [0, 0.7,-1.3] },
  'Left Shoulder': { target: [-0.5,1.3, 0], position: [-1.2,1.3, 1.0] },
  'Right Shoulder':{ target: [ 0.5,1.3, 0], position: [ 1.2,1.3, 1.0] },
  'Left Arm':           { target: [-0.7, 0.9, 0], position: [-1.5, 0.9, 0.8] },
  'Right Arm':          { target: [ 0.7, 0.9, 0], position: [ 1.5, 0.9, 0.8] },
  'Left Hand':          { target: [-0.9, 0.4, 0], position: [-1.8, 0.4, 0.6] },
  'Right Hand':         { target: [ 0.9, 0.4, 0], position: [ 1.8, 0.4, 0.6] },
  'Neck':               { target: [ 0,   1.55,0], position: [ 0,   1.55,1.0] },
  'Left Hip':           { target: [-0.3, 0.5, 0], position: [-0.8, 0.5, 1.2] },
  'Right Hip':          { target: [ 0.3, 0.5, 0], position: [ 0.8, 0.5, 1.2] },
  'Left Thigh':         { target: [-0.3, 0.1, 0], position: [-0.9, 0.1, 1.2] },
  'Right Thigh':        { target: [ 0.3, 0.1, 0], position: [ 0.9, 0.1, 1.2] },
  'Left Lower Leg':     { target: [-0.3,-0.5, 0], position: [-0.9,-0.5, 1.1] },
  'Right Lower Leg':    { target: [ 0.3,-0.5, 0], position: [ 0.9,-0.5, 1.1] },
  'Left Foot':          { target: [-0.3,-0.9, 0], position: [-0.8,-0.9, 0.9] },
  'Right Foot':         { target: [ 0.3,-0.9, 0], position: [ 0.8,-0.9, 0.9] },
}
```

## useBodyPainter Hook

```js
// useBodyPainter(canvasRef, meshRef, cameraRef, rendererRef, mode)
// Returns: { startPainting, stopPainting, undo, clear, strokes }
```

**State:** `strokes` array — each stroke is `{ uvPoints: [{u,v},...], brushSize, color }`.

**On pointer/touch move in paint mode:**
1. Get normalized device coordinates from event
2. `raycaster.setFromCamera(ndc, camera)`
3. `raycaster.intersectObject(mesh)` → get `uv` from first intersection
4. Push `{u: uv.x, v: uv.y}` to current stroke's `uvPoints`
5. Draw on canvas: `ctx.beginPath()` → arc at `(u*W, v*H)` with radius `brushSize` → fill with `color` + 40% opacity for soft brush
6. `texture.needsUpdate = true`

**Undo:** Pop last stroke from `strokes`, redraw canvas from scratch (replay all remaining strokes).

**Persistence format** — stored on symptom record as `uv_strokes`:
```json
[
  { "uvPoints": [{"u": 0.52, "v": 0.31}, ...], "brushSize": 12, "color": "#f97316" }
]
```

Replaces the old `svg_paths` field. `HealthContext` stores/retrieves `uv_strokes` instead.

## PaintControls

Toolbar rendered below the 3D canvas:

```
[🔄 Rotate] [🖌 Paint]    ○──●── brush size    [↩ Undo] [✕ Clear]
```

- Rotate/Paint toggle: changes `mode` prop passed to `BodyViewer3D`
- Brush size: `<input type="range" min="4" max="40" />` → passed as `brushSize` to painter
- Colour (intensity): reuse existing `IntensityPicker` component — maps intensity 1–5 to colour `#fbbf24` → `#f97316` → `#ef4444`
- Undo: calls `painter.undo()`
- Clear: calls `painter.clear()`

## Heat Map Colour Scale

```js
function countToHeatColor(count, maxIntensity) {
  // intensity 1-2: amber, 3: orange, 4-5: red — scaled by count
  const alpha = Math.min(0.9, 0.3 + count * 0.15)
  if (maxIntensity <= 2) return `rgba(251,191,36,${alpha})`
  if (maxIntensity <= 3) return `rgba(249,115,22,${alpha})`
  return `rgba(239,68,68,${alpha})`
}
```

## SymptomThumbnail Replacement

History rows currently show a 40×60 SVG thumbnail. Replace with a small static Three.js canvas (40×60) in stats mode showing the heat map for that specific symptom's `uv_strokes`. Falls back to a region label chip if Three.js fails to load.

## Data Migration

`svg_paths` field on existing symptom records becomes obsolete. New records use `uv_strokes`. No migration needed — old records simply show no thumbnail (graceful fallback). The `svg_paths` field is left in the DB schema for backwards compat.

## Error Handling

- `GLTFLoader` fails: show "3D view unavailable" message with region label text fallback
- WebGL not supported: same fallback
- `uv_strokes` parse error: treat as empty strokes array

## Testing

- `useBodyPainter`: unit test UV → canvas coordinate mapping; test undo removes last stroke; test clear empties canvas
- `RegionPicker`: renders all 20 regions; tapping one calls `onSelect` with correct region name
- `BodyViewer3D`: mount in jsdom environment with mocked Three.js (verify GLTFLoader called with correct path; verify canvas created)
- No visual/WebGL tests — Three.js scene correctness verified by manual review

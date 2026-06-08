// Generates placeholder SVG outlines for all body regions and views.
// Run once: node scripts/generate-body-svgs.js
// Replace individual files with anatomically accurate SVGs later.
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const OUT = join(process.cwd(), 'public', 'body')
mkdirSync(OUT, { recursive: true })

const REGIONS = {
  full:       { views: ['front', 'back'], label: 'Full Body',   shape: 'body' },
  head:       { views: ['front', 'back', 'left', 'right'], label: 'Head',       shape: 'oval' },
  chest:      { views: ['front', 'back', 'left', 'right'], label: 'Chest',      shape: 'trap' },
  abdomen:    { views: ['front', 'back'],                  label: 'Abdomen',    shape: 'rect' },
  back:       { views: ['front', 'back', 'left', 'right'], label: 'Back',       shape: 'rect' },
  left_arm:   { views: ['front', 'back', 'left', 'right'], label: 'Left Arm',   shape: 'arm' },
  right_arm:  { views: ['front', 'back', 'left', 'right'], label: 'Right Arm',  shape: 'arm' },
  left_hand:  { views: ['front', 'back', 'left', 'right'], label: 'Left Hand',  shape: 'hand' },
  right_hand: { views: ['front', 'back', 'left', 'right'], label: 'Right Hand', shape: 'hand' },
  left_leg:   { views: ['front', 'back', 'left', 'right'], label: 'Left Leg',   shape: 'leg' },
  right_leg:  { views: ['front', 'back', 'left', 'right'], label: 'Right Leg',  shape: 'leg' },
  left_foot:  { views: ['front', 'back', 'left', 'right'], label: 'Left Foot',  shape: 'foot' },
  right_foot: { views: ['front', 'back', 'left', 'right'], label: 'Right Foot', shape: 'foot' },
}

function outline(shape) {
  switch (shape) {
    case 'oval':  return '<ellipse cx="100" cy="100" rx="70" ry="85" fill="none" stroke="#4a4a4a" stroke-width="2"/>'
    case 'trap':  return '<path d="M30,40 L170,40 L155,160 L45,160Z" fill="none" stroke="#4a4a4a" stroke-width="2"/>'
    case 'rect':  return '<rect x="40" y="30" width="120" height="140" rx="12" fill="none" stroke="#4a4a4a" stroke-width="2"/>'
    case 'arm':   return '<rect x="70" y="20" width="60" height="160" rx="28" fill="none" stroke="#4a4a4a" stroke-width="2"/>'
    case 'hand':  return '<path d="M60,160 L60,80 Q60,30 100,30 Q140,30 140,80 L140,160 Q140,180 100,190 Q60,180 60,160Z" fill="none" stroke="#4a4a4a" stroke-width="2"/>'
    case 'leg':   return '<rect x="65" y="20" width="70" height="160" rx="30" fill="none" stroke="#4a4a4a" stroke-width="2"/>'
    case 'foot':  return '<path d="M30,80 Q30,20 100,20 Q150,20 170,60 L170,140 Q170,170 130,175 L40,175 Q20,170 20,140 L20,100 Q20,80 30,80Z" fill="none" stroke="#4a4a4a" stroke-width="2"/>'
    case 'body':  return `
      <ellipse cx="100" cy="28" rx="22" ry="25" fill="none" stroke="#4a4a4a" stroke-width="2"/>
      <path d="M68,55 L68,120 Q100,128 132,120 L132,55 Q116,48 100,48 Q84,48 68,55Z" fill="none" stroke="#4a4a4a" stroke-width="2"/>
      <path d="M68,120 L65,150 Q100,158 135,150 L132,120 Q100,128 68,120Z" fill="none" stroke="#4a4a4a" stroke-width="2"/>
      <path d="M65,150 L60,200 Q72,205 82,200 L85,150Z" fill="none" stroke="#4a4a4a" stroke-width="2"/>
      <path d="M135,150 L140,200 Q128,205 118,200 L115,150Z" fill="none" stroke="#4a4a4a" stroke-width="2"/>
      <path d="M45,56 L38,100 Q44,106 52,102 L60,56Z" fill="none" stroke="#4a4a4a" stroke-width="2"/>
      <path d="M155,56 L162,100 Q156,106 148,102 L140,56Z" fill="none" stroke="#4a4a4a" stroke-width="2"/>`
    default:      return '<rect x="20" y="20" width="160" height="160" rx="12" fill="none" stroke="#4a4a4a" stroke-width="2"/>'
  }
}

for (const [region, { views, label, shape }] of Object.entries(REGIONS)) {
  for (const view of views) {
    const filename = `${region}-${view}.svg`
    const svg = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="200" fill="#111"/>
  ${outline(shape)}
  <text x="100" y="195" text-anchor="middle" font-size="10" fill="#444" font-family="system-ui">${label} · ${view}</text>
</svg>`
    writeFileSync(join(OUT, filename), svg)
    console.log('wrote', filename)
  }
}
console.log('Done — replace files in public/body/ with anatomically accurate SVGs when ready.')

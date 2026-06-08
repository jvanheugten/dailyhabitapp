export const INTENSITY_LEVELS = [
  { value: 1, label: 'Minimal', color: '#4ade80' },
  { value: 2, label: 'Mild', color: '#a3e635' },
  { value: 3, label: 'Moderate', color: '#facc15' },
  { value: 4, label: 'Severe', color: '#f97316' },
  { value: 5, label: 'Extreme', color: '#ef4444' },
]

export function intensityColor(value) {
  return INTENSITY_LEVELS.find((l) => l.value === value)?.color ?? '#4ade80'
}

export function intensityLabel(value) {
  return INTENSITY_LEVELS.find((l) => l.value === value)?.label ?? 'Unknown'
}

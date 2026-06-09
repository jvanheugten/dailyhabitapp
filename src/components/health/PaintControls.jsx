import styles from './PaintControls.module.css'

export function PaintControls({
  isPainting,
  onModeChange,
  brushSize,
  onBrushSizeChange,
  onUndo,
  onClear,
}) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.modeGroup}>
        <button
          type="button"
          className={`${styles.modeBtn} ${!isPainting ? styles.modeBtnActive : ''}`}
          onClick={() => onModeChange(false)}
        >
          🔄 Rotate
        </button>
        <button
          type="button"
          className={`${styles.modeBtn} ${isPainting ? styles.modeBtnActive : ''}`}
          onClick={() => onModeChange(true)}
        >
          🖌 Paint
        </button>
      </div>

      <div className={styles.brushWrap}>
        <span className={styles.brushLabel}>Size</span>
        <input
          type="range"
          className={styles.brushSlider}
          min={4}
          max={40}
          value={brushSize}
          onChange={(e) => onBrushSizeChange(Number(e.target.value))}
        />
      </div>

      <button type="button" className={styles.actionBtn} onClick={onUndo}>
        ↩ Undo
      </button>
      <button type="button" className={styles.actionBtn} onClick={onClear}>
        ✕ Clear
      </button>
    </div>
  )
}

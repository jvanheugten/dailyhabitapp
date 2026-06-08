import { useSpeech } from '../hooks/useSpeech'
import styles from './JournalEditor.module.css'

export function JournalEditor({ value, onChange, onBlur }) {
  const { isSupported, isListening, startListening } = useSpeech()

  function handleMic() {
    startListening((transcript) => {
      onChange(value ? `${value} ${transcript}` : transcript)
    })
  }

  return (
    <div className={styles.editor}>
      <textarea
        className={styles.textarea}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder="Add a note for today..."
        rows={3}
      />
      {isSupported && (
        <button
          className={`${styles.micBtn} ${isListening ? styles.listening : ''}`}
          onClick={handleMic}
          type="button"
          aria-label="Dictate note"
        >
          🎤
        </button>
      )}
    </div>
  )
}

import { useState, useCallback, useRef } from 'react'

const SpeechRecognition =
  typeof window !== 'undefined'
    ? (window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null)
    : null

export function useSpeech() {
  const isSupported = Boolean(SpeechRecognition)
  const [isListening, setIsListening] = useState(false)

  const recognitionRef = useRef(null)
  const isActiveRef = useRef(false)
  const accumulatedRef = useRef('')
  const onResultRef = useRef(null)

  function buildRecognition() {
    const r = new SpeechRecognition()
    r.continuous = true
    r.interimResults = false
    r.lang = 'en-US'

    r.onresult = (e) => {
      let chunk = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) chunk += e.results[i][0].transcript
      }
      if (!chunk) return
      accumulatedRef.current = (accumulatedRef.current + ' ' + chunk).trim()
      onResultRef.current?.(accumulatedRef.current)
    }

    // Android Chrome stops recognition on silence even with continuous: true.
    // Restart transparently as long as the user hasn't explicitly stopped.
    r.onend = () => {
      if (isActiveRef.current) {
        try {
          r.start()
        } catch {
          /* already started or context gone */
        }
      } else {
        setIsListening(false)
      }
    }

    r.onerror = (e) => {
      if (e.error === 'aborted') return // we stopped it ourselves
      if (e.error === 'no-speech' && isActiveRef.current) return // onend will restart
      isActiveRef.current = false
      setIsListening(false)
    }

    return r
  }

  const startListening = useCallback(
    (onResult) => {
      if (!isSupported) return
      accumulatedRef.current = ''
      onResultRef.current = onResult
      isActiveRef.current = true
      setIsListening(true)
      const r = buildRecognition()
      recognitionRef.current = r
      r.start()
    },
    [isSupported]
  )  

  const stopListening = useCallback(() => {
    isActiveRef.current = false
    try {
      recognitionRef.current?.stop()
    } catch {
      /* ignore */
    }
    recognitionRef.current = null
    setIsListening(false)
  }, [])

  return { isSupported, isListening, startListening, stopListening }
}

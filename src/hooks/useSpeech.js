import { useState, useCallback } from 'react'

const SpeechRecognition =
  typeof window !== 'undefined'
    ? (window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null)
    : null

export function useSpeech() {
  const isSupported = Boolean(SpeechRecognition)
  const [isListening, setIsListening] = useState(false)

  const startListening = useCallback((onResult) => {
    if (!isSupported) return
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    setIsListening(true)
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      onResult(transcript)
    }
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    recognition.start()
  }, [isSupported])

  return { isSupported, isListening, startListening }
}

import { renderHook } from '@testing-library/react'
import { useSpeech } from './useSpeech'

test('isSupported is false when SpeechRecognition is unavailable', () => {
  // jsdom does not implement SpeechRecognition
  const { result } = renderHook(() => useSpeech())
  expect(result.current.isSupported).toBe(false)
})

test('isListening starts as false', () => {
  const { result } = renderHook(() => useSpeech())
  expect(result.current.isListening).toBe(false)
})

test('startListening is a function', () => {
  const { result } = renderHook(() => useSpeech())
  expect(typeof result.current.startListening).toBe('function')
})

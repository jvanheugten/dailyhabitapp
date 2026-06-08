import { renderHook, act } from '@testing-library/react'
import { HealthProvider, useHealth } from './HealthContext'
import { db } from '../db/db'

beforeEach(async () => {
  await db.symptom_types.clear()
  await db.symptoms.clear()
})

const wrapper = ({ children }) => <HealthProvider>{children}</HealthProvider>

test('symptomTypes starts empty', async () => {
  const { result } = renderHook(() => useHealth(), { wrapper })
  await act(async () => {})
  expect(result.current.symptomTypes).toEqual([])
})

test('addSymptomType adds to db and state', async () => {
  const { result } = renderHook(() => useHealth(), { wrapper })
  await act(async () => {
    await result.current.addSymptomType('Headache')
  })
  expect(result.current.symptomTypes).toHaveLength(1)
  expect(result.current.symptomTypes[0].name).toBe('Headache')
})

test('addSymptom adds to db and state', async () => {
  const { result } = renderHook(() => useHealth(), { wrapper })
  let type
  await act(async () => {
    type = await result.current.addSymptomType('Nausea')
  })
  await act(async () => {
    await result.current.addSymptom({
      symptom_type_id: type.id,
      region: 'abdomen',
      view: 'front',
      svg_paths: JSON.stringify([]),
      intensity: 2,
      pain_type: JSON.stringify(['dull']),
      notes: '',
      timestamp: new Date().toISOString(),
    })
  })
  expect(result.current.symptoms).toHaveLength(1)
  expect(result.current.symptoms[0].region).toBe('abdomen')
})

test('deleteSymptomType removes type and its symptoms', async () => {
  const { result } = renderHook(() => useHealth(), { wrapper })
  let type
  await act(async () => {
    type = await result.current.addSymptomType('Test')
    await result.current.addSymptom({
      symptom_type_id: type.id,
      region: 'head',
      view: 'front',
      svg_paths: '[]',
      intensity: 1,
      pain_type: '[]',
      notes: '',
      timestamp: new Date().toISOString(),
    })
  })
  await act(async () => {
    await result.current.deleteSymptomType(type.id)
  })
  expect(result.current.symptomTypes).toHaveLength(0)
  expect(result.current.symptoms).toHaveLength(0)
})

test('deleteSymptom removes from state', async () => {
  const { result } = renderHook(() => useHealth(), { wrapper })
  let symptom
  await act(async () => {
    const type = await result.current.addSymptomType('Test')
    symptom = await result.current.addSymptom({
      symptom_type_id: type.id,
      region: 'head',
      view: 'front',
      svg_paths: '[]',
      intensity: 1,
      pain_type: '[]',
      notes: '',
      timestamp: new Date().toISOString(),
    })
  })
  await act(async () => {
    await result.current.deleteSymptom(symptom.id)
  })
  expect(result.current.symptoms).toHaveLength(0)
})

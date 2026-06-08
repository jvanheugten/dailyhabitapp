import { renderHook, act } from '@testing-library/react'
import { VitalsProvider, useVitals } from './VitalsContext'
import { db } from '../db/db'

beforeEach(async () => {
  await db.vital_types.clear()
  await db.vital_entries.clear()
})

const wrapper = ({ children }) => <VitalsProvider>{children}</VitalsProvider>

test('vitalTypes starts empty when db is cleared', async () => {
  const { result } = renderHook(() => useVitals(), { wrapper })
  await act(async () => {})
  expect(result.current.vitalTypes).toEqual([])
})

test('addVitalType adds custom type with is_standard false', async () => {
  const { result } = renderHook(() => useVitals(), { wrapper })
  await act(async () => {
    await result.current.addVitalType({
      name: 'Steps',
      unit: 'steps/day',
      value_schema: 'single',
      normal_min: null,
      normal_max: null,
    })
  })
  expect(result.current.vitalTypes).toHaveLength(1)
  expect(result.current.vitalTypes[0].is_standard).toBe(false)
})

test('addVitalEntry adds to db and state', async () => {
  const { result } = renderHook(() => useVitals(), { wrapper })
  let type
  await act(async () => {
    type = await result.current.addVitalType({
      name: 'Heart Rate',
      unit: 'bpm',
      value_schema: 'single',
      normal_min: 60,
      normal_max: 100,
    })
  })
  await act(async () => {
    await result.current.addVitalEntry({
      vital_type_id: type.id,
      value: JSON.stringify('72'),
      notes: '',
    })
  })
  expect(result.current.vitalEntries).toHaveLength(1)
  expect(result.current.vitalEntries[0].source).toBe('manual')
})

test('deleteVitalType removes type and its entries', async () => {
  const { result } = renderHook(() => useVitals(), { wrapper })
  let type
  await act(async () => {
    type = await result.current.addVitalType({
      name: 'X',
      unit: 'u',
      value_schema: 'single',
      normal_min: null,
      normal_max: null,
    })
    await result.current.addVitalEntry({ vital_type_id: type.id, value: '"1"', notes: '' })
  })
  await act(async () => {
    await result.current.deleteVitalType(type.id)
  })
  expect(result.current.vitalTypes).toHaveLength(0)
  expect(result.current.vitalEntries).toHaveLength(0)
})

test('deleteVitalType no-ops for is_standard types', async () => {
  let stdId
  await act(async () => {
    stdId = await db.vital_types.add({
      name: 'Std',
      unit: 'u',
      value_schema: 'single',
      is_standard: true,
      normal_min: null,
      normal_max: null,
      createdAt: new Date().toISOString(),
    })
  })
  const { result } = renderHook(() => useVitals(), { wrapper })
  await act(async () => {})
  const before = result.current.vitalTypes.length
  await act(async () => {
    await result.current.deleteVitalType(stdId)
  })
  expect(result.current.vitalTypes.length).toBe(before)
})

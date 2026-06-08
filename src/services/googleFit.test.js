import { describe, it, expect } from 'vitest'
import {
  mapStepsResponse,
  mapCaloriesResponse,
  mapActiveMinutesResponse,
  mapHeartRateResponse,
  mapSleepResponse,
  mapWeightResponse,
  mapBloodPressureResponse,
  mapBloodGlucoseResponse,
  mapOxygenSatResponse,
} from './googleFit'

function bucket(startMs, endMs, values) {
  return {
    startTimeMillis: String(startMs),
    endTimeMillis: String(endMs),
    dataset: [{ point: values }],
  }
}

function fpVal(val) {
  return { value: [{ fpVal: val }] }
}
function intVal(val) {
  return { value: [{ intVal: val }] }
}
function mapVal(sys, dia) {
  return {
    value: [
      {
        mapVal: [
          { key: 'systolic', value: { fpVal: sys } },
          { key: 'diastolic', value: { fpVal: dia } },
        ],
      },
    ],
  }
}

const START = 1700000000000
const END = START + 86400000

describe('mapStepsResponse', () => {
  it('sums step counts in a bucket', () => {
    const b = bucket(START, END, [intVal(3000), intVal(2000)])
    const result = mapStepsResponse([b], 99)
    expect(result).toHaveLength(1)
    expect(JSON.parse(result[0].value)).toBe(5000)
    expect(result[0].vital_type_id).toBe(99)
    expect(result[0].source).toBe('google_fit')
  })
  it('skips empty buckets', () => {
    const b = bucket(START, END, [])
    expect(mapStepsResponse([b], 99)).toHaveLength(0)
  })
})

describe('mapCaloriesResponse', () => {
  it('rounds calories to 1 decimal', () => {
    const b = bucket(START, END, [fpVal(312.567)])
    const result = mapCaloriesResponse([b], 88)
    expect(JSON.parse(result[0].value)).toBe(312.6)
  })
})

describe('mapActiveMinutesResponse', () => {
  it('returns active minutes from intVal', () => {
    const b = bucket(START, END, [intVal(45)])
    const result = mapActiveMinutesResponse([b], 77)
    expect(JSON.parse(result[0].value)).toBe(45)
  })
})

describe('mapHeartRateResponse', () => {
  it('takes average fpVal', () => {
    const b = bucket(START, END, [fpVal(70), fpVal(80)])
    const result = mapHeartRateResponse([b], 66)
    expect(JSON.parse(result[0].value)).toBe(75)
  })
})

describe('mapSleepResponse', () => {
  it('sums sleep segment durations into minutes', () => {
    const point1 = { startTimeMillis: String(START), endTimeMillis: String(START + 3600000) }
    const point2 = {
      startTimeMillis: String(START + 3600000),
      endTimeMillis: String(START + 7200000),
    }
    const b = {
      startTimeMillis: String(START),
      endTimeMillis: String(END),
      dataset: [{ point: [point1, point2] }],
    }
    const result = mapSleepResponse([b], 55)
    expect(JSON.parse(result[0].value)).toBe(120)
  })
})

describe('mapWeightResponse', () => {
  it('takes last fpVal in bucket', () => {
    const b = bucket(START, END, [fpVal(72.5)])
    const result = mapWeightResponse([b], 44)
    expect(JSON.parse(result[0].value)).toBeCloseTo(72.5)
  })
})

describe('mapBloodPressureResponse', () => {
  it('maps compound sys/dia value', () => {
    const b = bucket(START, END, [mapVal(120, 80)])
    const result = mapBloodPressureResponse([b], 33)
    const val = JSON.parse(result[0].value)
    expect(val.sys).toBe(120)
    expect(val.dia).toBe(80)
  })
})

describe('mapBloodGlucoseResponse', () => {
  it('converts mg/dL to mmol/L (÷18.018)', () => {
    const b = bucket(START, END, [fpVal(126)])
    const result = mapBloodGlucoseResponse([b], 22)
    expect(JSON.parse(result[0].value)).toBeCloseTo(7.0, 1)
  })
})

describe('mapOxygenSatResponse', () => {
  it('converts 0-1 fraction to percentage', () => {
    const b = bucket(START, END, [fpVal(0.98)])
    const result = mapOxygenSatResponse([b], 11)
    expect(JSON.parse(result[0].value)).toBeCloseTo(98, 0)
  })
})

const CLIENT_ID = import.meta.env?.VITE_GOOGLE_CLIENT_ID ?? ''

const SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.body.read',
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
  'https://www.googleapis.com/auth/fitness.blood_pressure.read',
  'https://www.googleapis.com/auth/fitness.blood_glucose.read',
  'https://www.googleapis.com/auth/fitness.oxygen_saturation.read',
  'https://www.googleapis.com/auth/fitness.sleep.read',
].join(' ')

// ─── Token management ─────────────────────────────────────────────────────────

const TOKEN_KEY = 'gfit_token'
const EXPIRY_KEY = 'gfit_expiry'

export function saveToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(EXPIRY_KEY, String(Date.now() + 55 * 60 * 1000))
}

export function loadToken() {
  const token = sessionStorage.getItem(TOKEN_KEY)
  const expiry = Number(sessionStorage.getItem(EXPIRY_KEY) ?? 0)
  if (!token || Date.now() > expiry) return null
  return token
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(EXPIRY_KEY)
}

export function isConnected() {
  return Boolean(loadToken())
}

// ─── OAuth popup ──────────────────────────────────────────────────────────────

export function requestAccessToken() {
  return new Promise((resolve, reject) => {
    if (!window.google) {
      reject(new Error('Google Identity Services not loaded'))
      return
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description ?? response.error))
          return
        }
        saveToken(response.access_token)
        resolve(response.access_token)
      },
    })
    client.requestAccessToken()
  })
}

export function disconnect() {
  const token = loadToken()
  if (token && window.google) {
    window.google.accounts.oauth2.revoke(token, () => {})
  }
  clearToken()
}

// ─── Fitness API ──────────────────────────────────────────────────────────────

async function aggregateRequest(token, dataTypeName, startMs, endMs) {
  const res = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      aggregateBy: [{ dataTypeName }],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: startMs,
      endTimeMillis: endMs,
    }),
  })
  if (!res.ok) throw new Error(`Fitness API error ${res.status}`)
  const json = await res.json()
  return json.bucket ?? []
}

// ─── Mapping functions (pure — testable without fetch) ────────────────────────

function bucketTimestamp(b) {
  return new Date(Number(b.startTimeMillis)).toISOString()
}

function points(b) {
  return b.dataset?.[0]?.point ?? []
}

export function mapStepsResponse(buckets, vitalTypeId) {
  return buckets.flatMap((b) => {
    const pts = points(b)
    if (!pts.length) return []
    const total = pts.reduce((sum, p) => sum + (p.value?.[0]?.intVal ?? 0), 0)
    if (!total) return []
    return [
      {
        vital_type_id: vitalTypeId,
        value: JSON.stringify(total),
        source: 'google_fit',
        timestamp: bucketTimestamp(b),
        notes: '',
      },
    ]
  })
}

export function mapCaloriesResponse(buckets, vitalTypeId) {
  return buckets.flatMap((b) => {
    const pts = points(b)
    if (!pts.length) return []
    const total = pts.reduce((sum, p) => sum + (p.value?.[0]?.fpVal ?? 0), 0)
    if (!total) return []
    return [
      {
        vital_type_id: vitalTypeId,
        value: JSON.stringify(Math.round(total * 10) / 10),
        source: 'google_fit',
        timestamp: bucketTimestamp(b),
        notes: '',
      },
    ]
  })
}

export function mapActiveMinutesResponse(buckets, vitalTypeId) {
  return buckets.flatMap((b) => {
    const pts = points(b)
    if (!pts.length) return []
    const total = pts.reduce((sum, p) => sum + (p.value?.[0]?.intVal ?? 0), 0)
    if (!total) return []
    return [
      {
        vital_type_id: vitalTypeId,
        value: JSON.stringify(total),
        source: 'google_fit',
        timestamp: bucketTimestamp(b),
        notes: '',
      },
    ]
  })
}

export function mapHeartRateResponse(buckets, vitalTypeId) {
  return buckets.flatMap((b) => {
    const pts = points(b)
    if (!pts.length) return []
    const vals = pts.map((p) => p.value?.[0]?.fpVal ?? 0).filter(Boolean)
    if (!vals.length) return []
    const avg = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)
    return [
      {
        vital_type_id: vitalTypeId,
        value: JSON.stringify(avg),
        source: 'google_fit',
        timestamp: bucketTimestamp(b),
        notes: '',
      },
    ]
  })
}

export function mapSleepResponse(buckets, vitalTypeId) {
  return buckets.flatMap((b) => {
    const pts = points(b)
    if (!pts.length) return []
    const totalMs = pts.reduce((sum, p) => {
      const start = Number(p.startTimeMillis ?? 0)
      const end = Number(p.endTimeMillis ?? 0)
      return sum + (end - start)
    }, 0)
    const minutes = Math.round(totalMs / 60000)
    if (!minutes) return []
    return [
      {
        vital_type_id: vitalTypeId,
        value: JSON.stringify(minutes),
        source: 'google_fit',
        timestamp: bucketTimestamp(b),
        notes: '',
      },
    ]
  })
}

export function mapWeightResponse(buckets, vitalTypeId) {
  return buckets.flatMap((b) => {
    const pts = points(b)
    if (!pts.length) return []
    const last = pts[pts.length - 1]
    const val = last?.value?.[0]?.fpVal
    if (!val) return []
    return [
      {
        vital_type_id: vitalTypeId,
        value: JSON.stringify(Math.round(val * 10) / 10),
        source: 'google_fit',
        timestamp: bucketTimestamp(b),
        notes: '',
      },
    ]
  })
}

export function mapBloodPressureResponse(buckets, vitalTypeId) {
  return buckets.flatMap((b) => {
    const pts = points(b)
    if (!pts.length) return []
    return pts.flatMap((p) => {
      const mapVal = p.value?.[0]?.mapVal ?? []
      const sys = mapVal.find((m) => m.key === 'systolic')?.value?.fpVal
      const dia = mapVal.find((m) => m.key === 'diastolic')?.value?.fpVal
      if (!sys || !dia) return []
      return [
        {
          vital_type_id: vitalTypeId,
          value: JSON.stringify({ sys: Math.round(sys), dia: Math.round(dia) }),
          source: 'google_fit',
          timestamp: bucketTimestamp(b),
          notes: '',
        },
      ]
    })
  })
}

export function mapBloodGlucoseResponse(buckets, vitalTypeId) {
  return buckets.flatMap((b) => {
    const pts = points(b)
    if (!pts.length) return []
    return pts.flatMap((p) => {
      const mgdl = p.value?.[0]?.fpVal
      if (!mgdl) return []
      const mmol = Math.round((mgdl / 18.018) * 10) / 10
      return [
        {
          vital_type_id: vitalTypeId,
          value: JSON.stringify(mmol),
          source: 'google_fit',
          timestamp: bucketTimestamp(b),
          notes: '',
        },
      ]
    })
  })
}

export function mapOxygenSatResponse(buckets, vitalTypeId) {
  return buckets.flatMap((b) => {
    const pts = points(b)
    if (!pts.length) return []
    return pts.flatMap((p) => {
      const raw = p.value?.[0]?.fpVal
      if (!raw) return []
      return [
        {
          vital_type_id: vitalTypeId,
          value: JSON.stringify(Math.round(raw * 100)),
          source: 'google_fit',
          timestamp: bucketTimestamp(b),
          notes: '',
        },
      ]
    })
  })
}

// ─── Full sync ────────────────────────────────────────────────────────────────

export async function fetchAllFitnessData(token, typeMap, lastSyncedISO) {
  const endMs = Date.now()
  const startMs = lastSyncedISO
    ? new Date(lastSyncedISO).getTime()
    : endMs - 30 * 24 * 60 * 60 * 1000

  const jobs = [
    { type: 'com.google.step_count.delta', name: 'Steps', mapper: mapStepsResponse },
    { type: 'com.google.calories.expended', name: 'Calories', mapper: mapCaloriesResponse },
    { type: 'com.google.active_minutes', name: 'Active Minutes', mapper: mapActiveMinutesResponse },
    { type: 'com.google.heart_rate.summary', name: 'Heart Rate', mapper: mapHeartRateResponse },
    { type: 'com.google.sleep.segment', name: 'Sleep Duration', mapper: mapSleepResponse },
    { type: 'com.google.weight', name: 'Weight', mapper: mapWeightResponse },
    { type: 'com.google.blood_pressure', name: 'Blood Pressure', mapper: mapBloodPressureResponse },
    { type: 'com.google.blood_glucose', name: 'Blood Sugar', mapper: mapBloodGlucoseResponse },
    {
      type: 'com.google.oxygen_saturation',
      name: 'Oxygen Saturation',
      mapper: mapOxygenSatResponse,
    },
  ]

  const allEntries = []
  for (const job of jobs) {
    const id = typeMap[job.name]
    if (!id) continue
    try {
      const buckets = await aggregateRequest(token, job.type, startMs, endMs)
      const entries = job.mapper(buckets, id)
      allEntries.push(...entries)
    } catch {
      // skip unavailable data types silently
    }
  }
  return allEntries
}

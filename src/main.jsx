import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { db } from './db/db'
import { scheduleHabitReminders } from './notifications'

async function init() {
  const habits = await db.habits.toArray()
  scheduleHabitReminders(habits)
}

init()

if (import.meta.env.DEV) {
  import('./dev/seed.js').then(({ seedDevData }) => {
    window.seedDevData = seedDevData
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)

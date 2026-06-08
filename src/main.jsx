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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)

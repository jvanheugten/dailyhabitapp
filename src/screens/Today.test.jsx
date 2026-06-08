import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Today } from './Today'
import { HabitsProvider } from '../contexts/HabitsContext'
import { JournalProvider } from '../contexts/JournalContext'
import { db } from '../db/db'

beforeEach(async () => {
  await db.habits.clear()
  await db.completions.clear()
  await db.journal_entries.clear()
})

function Wrapper({ children }) {
  return <HabitsProvider><JournalProvider>{children}</JournalProvider></HabitsProvider>
}

test('shows "No habits scheduled" when no habits exist', async () => {
  render(<Today />, { wrapper: Wrapper })
  await screen.findByText(/no habits scheduled/i)
})

test('shows habits due today', async () => {
  const today = new Date()
  const todayDay = today.getDay()
  await db.habits.add({ name: 'Meditate', days: [todayDay], time: null, notifyEnabled: false, createdAt: new Date().toISOString() })
  render(<Today />, { wrapper: Wrapper })
  await screen.findByText('Meditate')
})

test('shows progress count', async () => {
  const todayDay = new Date().getDay()
  await db.habits.add({ name: 'Run', days: [todayDay], time: null, notifyEnabled: false, createdAt: new Date().toISOString() })
  render(<Today />, { wrapper: Wrapper })
  await screen.findByText(/0\/1 done/i)
})

test('journal section is rendered', async () => {
  render(<Today />, { wrapper: Wrapper })
  expect(screen.getByPlaceholderText(/add a note/i)).toBeInTheDocument()
})

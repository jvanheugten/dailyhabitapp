import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Journal } from './Journal'
import { HabitsProvider } from '../contexts/HabitsContext'
import { JournalProvider } from '../contexts/JournalContext'
import { db } from '../db/db'

beforeEach(async () => {
  await db.journal_entries.clear()
})

function Wrapper({ children }) {
  return (
    <HabitsProvider>
      <JournalProvider>{children}</JournalProvider>
    </HabitsProvider>
  )
}

test('shows empty state when no entries', async () => {
  render(<Journal />, { wrapper: Wrapper })
  await screen.findByText(/no journal entries yet/i)
})

test('lists existing entries', async () => {
  const now = new Date().toISOString()
  await db.journal_entries.add({
    date: '2026-06-08',
    text: 'Great day',
    createdAt: now,
    updatedAt: now,
  })
  render(<Journal />, { wrapper: Wrapper })
  await screen.findByText(/great day/i)
})

test('tapping an entry opens edit view', async () => {
  const user = userEvent.setup()
  const now = new Date().toISOString()
  await db.journal_entries.add({
    date: '2026-06-08',
    text: 'My note',
    createdAt: now,
    updatedAt: now,
  })
  render(<Journal />, { wrapper: Wrapper })
  const item = await screen.findByText(/my note/i)
  await user.click(item)
  expect(screen.getByRole('textbox')).toHaveValue('My note')
})

test('back button returns to list', async () => {
  const user = userEvent.setup()
  const now = new Date().toISOString()
  await db.journal_entries.add({ date: '2026-06-08', text: 'Note', createdAt: now, updatedAt: now })
  render(<Journal />, { wrapper: Wrapper })
  await user.click(await screen.findByText(/note/i))
  await user.click(screen.getByText(/← Back/))
  await screen.findByText(/journal/i)
})

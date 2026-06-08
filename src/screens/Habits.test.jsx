import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Habits } from './Habits'
import { HabitsProvider } from '../contexts/HabitsContext'
import { JournalProvider } from '../contexts/JournalContext'
import { db } from '../db/db'

beforeEach(async () => {
  await db.habits.clear()
  await db.completions.clear()
})

function Wrapper({ children }) {
  return (
    <HabitsProvider>
      <JournalProvider>{children}</JournalProvider>
    </HabitsProvider>
  )
}

test('shows empty state when no habits', async () => {
  render(<Habits />, { wrapper: Wrapper })
  await screen.findByText(/no habits yet/i)
})

test('FAB button is present', async () => {
  render(<Habits />, { wrapper: Wrapper })
  expect(screen.getByLabelText(/add habit/i)).toBeInTheDocument()
})

test('clicking FAB opens HabitForm', async () => {
  const user = userEvent.setup()
  render(<Habits />, { wrapper: Wrapper })
  await user.click(screen.getByLabelText(/add habit/i))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
})

test('added habit appears in list', async () => {
  const user = userEvent.setup()
  render(<Habits />, { wrapper: Wrapper })
  await user.click(screen.getByLabelText(/add habit/i))
  await user.type(screen.getByPlaceholderText(/morning run/i), 'Yoga')
  await user.click(screen.getByText('Save'))
  await screen.findByText('Yoga')
})

test('delete button shows confirmation', async () => {
  const user = userEvent.setup()
  await db.habits.add({
    name: 'Run',
    days: [1],
    time: null,
    notifyEnabled: false,
    createdAt: new Date().toISOString(),
  })
  render(<Habits />, { wrapper: Wrapper })
  await screen.findByText('Run')
  await user.click(screen.getByLabelText(/delete run/i))
  expect(screen.getByText('Delete')).toBeInTheDocument()
  expect(screen.getByText('Cancel')).toBeInTheDocument()
})

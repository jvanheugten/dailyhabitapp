import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HabitRow } from './HabitRow'
import { HabitsProvider } from '../contexts/HabitsContext'
import { db } from '../db/db'

beforeEach(async () => {
  await db.habits.clear()
  await db.completions.clear()
})

const habit = { id: 1, name: 'Morning run', days: [1, 2, 3, 4, 5], time: null }

const wrapper = ({ children }) => <HabitsProvider>{children}</HabitsProvider>

test('renders habit name', () => {
  render(<HabitRow habit={habit} completed={false} onToggle={() => {}} />, { wrapper })
  expect(screen.getByText('Morning run')).toBeInTheDocument()
})

test('shows checkmark when completed', () => {
  render(<HabitRow habit={habit} completed={true} onToggle={() => {}} />, { wrapper })
  expect(screen.getByRole('button', { name: /unmark/i })).toBeInTheDocument()
})

test('calls onToggle when checkbox clicked', async () => {
  const user = userEvent.setup()
  const onToggle = vi.fn()
  render(<HabitRow habit={habit} completed={false} onToggle={onToggle} />, { wrapper })
  await user.click(screen.getByRole('button', { name: /mark/i }))
  expect(onToggle).toHaveBeenCalledOnce()
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HabitForm } from './HabitForm'

const noop = () => {}

test('renders name input and day picker', () => {
  render(<HabitForm habit={null} onSave={noop} onClose={noop} />)
  expect(screen.getByPlaceholderText(/morning run/i)).toBeInTheDocument()
  expect(screen.getByText('Mo')).toBeInTheDocument()
})

test('shows error if name is empty on submit', async () => {
  const user = userEvent.setup()
  render(<HabitForm habit={null} onSave={noop} onClose={noop} />)
  await user.click(screen.getByText('Save'))
  expect(screen.getByText(/name is required/i)).toBeInTheDocument()
})

test('shows error if no days selected', async () => {
  const user = userEvent.setup()
  render(<HabitForm habit={null} onSave={noop} onClose={noop} />)
  // Deselect all default days (Mo-Fr)
  for (const label of ['Mo', 'Tu', 'We', 'Th', 'Fr']) {
    await user.click(screen.getByText(label))
  }
  await user.type(screen.getByPlaceholderText(/morning run/i), 'Run')
  await user.click(screen.getByText('Save'))
  expect(screen.getByText(/select at least one day/i)).toBeInTheDocument()
})

test('calls onSave with form data when valid', async () => {
  const user = userEvent.setup()
  const onSave = vi.fn().mockResolvedValue()
  const onClose = vi.fn()
  render(<HabitForm habit={null} onSave={onSave} onClose={onClose} />)
  await user.type(screen.getByPlaceholderText(/morning run/i), 'Meditate')
  await user.click(screen.getByText('Save'))
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'Meditate' }))
})

test('pre-fills fields when editing an existing habit', () => {
  const habit = { id: 1, name: 'Yoga', days: [0, 6], time: '07:30', notifyEnabled: false }
  render(<HabitForm habit={habit} onSave={noop} onClose={noop} />)
  expect(screen.getByDisplayValue('Yoga')).toBeInTheDocument()
})

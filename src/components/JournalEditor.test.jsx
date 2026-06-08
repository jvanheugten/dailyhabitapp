import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JournalEditor } from './JournalEditor'

test('renders textarea with provided value', () => {
  render(<JournalEditor value="Hello" onChange={() => {}} onBlur={() => {}} />)
  expect(screen.getByDisplayValue('Hello')).toBeInTheDocument()
})

test('calls onChange when typing', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<JournalEditor value="" onChange={onChange} onBlur={() => {}} />)
  await user.type(screen.getByRole('textbox'), 'Hi')
  expect(onChange).toHaveBeenCalled()
})

test('calls onBlur when textarea loses focus', async () => {
  const user = userEvent.setup()
  const onBlur = vi.fn()
  render(<JournalEditor value="test" onChange={() => {}} onBlur={onBlur} />)
  await user.click(screen.getByRole('textbox'))
  await user.tab()
  expect(onBlur).toHaveBeenCalled()
})

test('mic button is hidden when speech not supported', () => {
  // jsdom has no SpeechRecognition, so mic button should not render
  render(<JournalEditor value="" onChange={() => {}} onBlur={() => {}} />)
  expect(screen.queryByLabelText(/dictate/i)).not.toBeInTheDocument()
})

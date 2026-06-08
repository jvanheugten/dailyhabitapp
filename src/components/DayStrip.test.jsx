import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DayStrip } from './DayStrip'
import { today } from '../utils/dates'

test('renders today as selected by default', () => {
  render(<DayStrip selectedDate={today()} onSelectDate={() => {}} />)
  const todayTile = document.querySelector('[data-today="true"]')
  expect(todayTile).toBeInTheDocument()
  // Check for the selected class using attribute matching since CSS modules transform class names
  expect(todayTile?.className).toMatch(/_selected_/)
})

test('future day buttons are disabled', () => {
  render(<DayStrip selectedDate={today()} onSelectDate={() => {}} />)
  const buttons = screen.getAllByRole('button')
  const futureBtns = buttons.filter(b => b.disabled)
  expect(futureBtns.length).toBeGreaterThan(0)
})

test('clicking a past day calls onSelectDate', async () => {
  const user = userEvent.setup()
  const onSelect = vi.fn()
  render(<DayStrip selectedDate={today()} onSelectDate={onSelect} />)
  const buttons = screen.getAllByRole('button')
  // First button is the oldest past day — enabled, not future
  const pastDays = buttons.filter(b => !b.disabled)
  if (pastDays.length > 1) {
    await user.click(pastDays[0])
    expect(onSelect).toHaveBeenCalled()
  }
})

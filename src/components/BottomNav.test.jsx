import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BottomNav } from './BottomNav'

test('renders four tabs', () => {
  render(<BottomNav activeTab="today" onTabChange={() => {}} />)
  expect(screen.getByText('Today')).toBeInTheDocument()
  expect(screen.getByText('Habits')).toBeInTheDocument()
  expect(screen.getByText('Journal')).toBeInTheDocument()
  expect(screen.getByText('Health')).toBeInTheDocument()
})

test('active tab has aria-current="page"', () => {
  render(<BottomNav activeTab="habits" onTabChange={() => {}} />)
  const habitsBtn = screen.getByText('Habits').closest('button')
  expect(habitsBtn).toHaveAttribute('aria-current', 'page')
})

test('clicking a tab calls onTabChange with tab id', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<BottomNav activeTab="today" onTabChange={onChange} />)
  await user.click(screen.getByText('Journal'))
  expect(onChange).toHaveBeenCalledWith('journal')
})

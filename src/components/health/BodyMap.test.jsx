import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { BodyMap } from './BodyMap'

describe('BodyMap', () => {
  it('renders front/back toggle', () => {
    render(<BodyMap onRegionSelect={() => {}} symptoms={[]} />)
    expect(screen.getByText('Front')).toBeInTheDocument()
    expect(screen.getByText('Back')).toBeInTheDocument()
  })

  it('clicking a region calls onRegionSelect with region name', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<BodyMap onRegionSelect={onSelect} symptoms={[]} />)
    await user.click(screen.getByLabelText(/tap head/i))
    expect(onSelect).toHaveBeenCalledWith('head')
  })

  it('switching to back view still has tappable regions', async () => {
    const user = userEvent.setup()
    render(<BodyMap onRegionSelect={() => {}} symptoms={[]} />)
    await user.click(screen.getByText('Back'))
    expect(screen.getByLabelText(/tap head/i)).toBeInTheDocument()
  })
})

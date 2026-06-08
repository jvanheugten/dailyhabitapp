import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { IntensityPicker } from './IntensityPicker'

describe('IntensityPicker', () => {
  it('renders all 5 intensity level labels', () => {
    render(<IntensityPicker value={1} onChange={() => {}} />)
    expect(screen.getByText('Minimal')).toBeInTheDocument()
    expect(screen.getByText('Mild')).toBeInTheDocument()
    expect(screen.getByText('Moderate')).toBeInTheDocument()
    expect(screen.getByText('Severe')).toBeInTheDocument()
    expect(screen.getByText('Extreme')).toBeInTheDocument()
  })

  it('selected level has aria-pressed="true"', () => {
    render(<IntensityPicker value={3} onChange={() => {}} />)
    const btn = screen.getByText('Moderate').closest('button')
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('clicking a level calls onChange with its value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<IntensityPicker value={1} onChange={onChange} />)
    await user.click(screen.getByText('Severe'))
    expect(onChange).toHaveBeenCalledWith(4)
  })
})

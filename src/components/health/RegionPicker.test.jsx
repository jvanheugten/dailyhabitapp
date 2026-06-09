import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegionPicker, REGIONS } from './RegionPicker'

describe('RegionPicker', () => {
  it('renders all 21 regions', () => {
    render(<RegionPicker onSelect={vi.fn()} />)
    expect(REGIONS).toHaveLength(21)
    for (const r of REGIONS) {
      expect(screen.getByRole('button', { name: r })).toBeDefined()
    }
  })

  it('calls onSelect with region name when chip tapped', async () => {
    const onSelect = vi.fn()
    render(<RegionPicker onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: 'Head' }))
    expect(onSelect).toHaveBeenCalledWith('Head')
  })

  it('calls onSelect with Full Body', async () => {
    const onSelect = vi.fn()
    render(<RegionPicker onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: 'Full Body' }))
    expect(onSelect).toHaveBeenCalledWith('Full Body')
  })
})

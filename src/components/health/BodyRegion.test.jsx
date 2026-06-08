import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { BodyRegion } from './BodyRegion'

const noop = () => {}

describe('BodyRegion', () => {
  it('renders region label', () => {
    render(
      <BodyRegion
        region="head"
        view="front"
        onViewChange={noop}
        paths={[]}
        onPathsChange={noop}
        intensity={3}
      />
    )
    expect(screen.getByText(/head/i)).toBeInTheDocument()
  })

  it('renders view selector buttons for head (4 views)', () => {
    render(
      <BodyRegion
        region="head"
        view="front"
        onViewChange={noop}
        paths={[]}
        onPathsChange={noop}
        intensity={3}
      />
    )
    expect(screen.getByText('Front')).toBeInTheDocument()
    expect(screen.getByText('Back')).toBeInTheDocument()
    expect(screen.getByText('Left')).toBeInTheDocument()
    expect(screen.getByText('Right')).toBeInTheDocument()
  })

  it('clicking a view button calls onViewChange', async () => {
    const user = userEvent.setup()
    const onViewChange = vi.fn()
    render(
      <BodyRegion
        region="head"
        view="front"
        onViewChange={onViewChange}
        paths={[]}
        onPathsChange={noop}
        intensity={3}
      />
    )
    await user.click(screen.getByText('Back'))
    expect(onViewChange).toHaveBeenCalledWith('back')
  })

  it('abdomen only shows front and back view buttons', () => {
    render(
      <BodyRegion
        region="abdomen"
        view="front"
        onViewChange={noop}
        paths={[]}
        onPathsChange={noop}
        intensity={2}
      />
    )
    expect(screen.getByText('Front')).toBeInTheDocument()
    expect(screen.getByText('Back')).toBeInTheDocument()
    expect(screen.queryByText('Left')).not.toBeInTheDocument()
    expect(screen.queryByText('Right')).not.toBeInTheDocument()
  })
})

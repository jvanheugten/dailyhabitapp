import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { DrawingCanvas } from './DrawingCanvas'

const noop = () => {}

describe('DrawingCanvas', () => {
  it('renders draw, erase, and clear buttons', () => {
    render(<DrawingCanvas paths={[]} onPathsChange={noop} color="#ef4444" />)
    expect(screen.getByLabelText(/draw/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/erase last/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/clear all/i)).toBeInTheDocument()
  })

  it('erase last button removes last path', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const paths = [{ d: 'M 0 0 L 10 10', color: '#ef4444', strokeWidth: 8 }]
    render(<DrawingCanvas paths={paths} onPathsChange={onChange} color="#ef4444" />)
    await user.click(screen.getByLabelText(/erase last/i))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('clear all button empties paths', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const paths = [
      { d: 'M 0 0 L 10 10', color: '#ef4444', strokeWidth: 8 },
      { d: 'M 5 5 L 50 50', color: '#f97316', strokeWidth: 8 },
    ]
    render(<DrawingCanvas paths={paths} onPathsChange={onChange} color="#ef4444" />)
    await user.click(screen.getByLabelText(/clear all/i))
    expect(onChange).toHaveBeenCalledWith([])
  })
})

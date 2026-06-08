import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { VitalTypeForm } from './VitalTypeForm'

const noop = () => {}

describe('VitalTypeForm', () => {
  it('renders name and unit inputs', () => {
    render(<VitalTypeForm onSave={noop} onClose={noop} />)
    expect(screen.getByPlaceholderText(/^e\.g\. Steps$/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/^e\.g\. steps\/day$/)).toBeInTheDocument()
  })

  it('shows error if name is empty on save', async () => {
    const user = userEvent.setup()
    render(<VitalTypeForm onSave={noop} onClose={noop} />)
    await user.click(screen.getByText('Save'))
    expect(screen.getByText(/name is required/i)).toBeInTheDocument()
  })

  it('calls onSave with form data when valid', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue()
    render(<VitalTypeForm onSave={onSave} onClose={noop} />)
    await user.type(screen.getByPlaceholderText(/^e\.g\. Steps$/), 'Mood')
    await user.type(screen.getByPlaceholderText(/^e\.g\. steps\/day$/), '1-10')
    await user.click(screen.getByText('Save'))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'Mood', unit: '1-10' }))
  })
})

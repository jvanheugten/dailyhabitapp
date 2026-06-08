import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LogVitalSheet } from './LogVitalSheet'
import { VitalsProvider } from '../../contexts/VitalsContext'
import { db } from '../../db/db'

beforeEach(async () => {
  await db.vital_types.clear()
  await db.vital_entries.clear()
})

const wrapper = ({ children }) => <VitalsProvider>{children}</VitalsProvider>

describe('LogVitalSheet', () => {
  it('renders vital type picker', async () => {
    render(<LogVitalSheet onClose={() => {}} />, { wrapper })
    expect(screen.getByText(/select vital/i)).toBeInTheDocument()
  })

  it('after selecting a type, shows value input', async () => {
    const user = userEvent.setup()
    await db.vital_types.add({
      name: 'Heart Rate',
      unit: 'bpm',
      value_schema: 'single',
      is_standard: true,
      normal_min: 60,
      normal_max: 100,
      createdAt: new Date().toISOString(),
    })
    render(<LogVitalSheet onClose={() => {}} />, { wrapper })
    await user.click(await screen.findByText('Heart Rate'))
    expect(screen.getByPlaceholderText(/value/i)).toBeInTheDocument()
  })

  it('Save calls onClose after saving an entry', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    await db.vital_types.add({
      name: 'Weight',
      unit: 'kg',
      value_schema: 'single',
      is_standard: true,
      normal_min: null,
      normal_max: null,
      createdAt: new Date().toISOString(),
    })
    render(<LogVitalSheet onClose={onClose} />, { wrapper })
    await user.click(await screen.findByText('Weight'))
    await user.type(screen.getByPlaceholderText(/value/i), '72')
    await user.click(screen.getByText('Save'))
    expect(onClose).toHaveBeenCalled()
  })
})

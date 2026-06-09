import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LogSymptomSheet } from './LogSymptomSheet'
import { HealthProvider } from '../../contexts/HealthContext'
import { db } from '../../db/db'

vi.mock('./BodyViewer3D', () => ({
  BodyViewer3D: vi.fn(() => <div data-testid="body-viewer-3d" />),
}))
vi.mock('./PaintControls', () => ({
  PaintControls: vi.fn(() => <div data-testid="paint-controls" />),
}))
vi.mock('./RegionPicker', () => ({
  RegionPicker: vi.fn(({ onSelect }) => <button onClick={() => onSelect('Head')}>Head</button>),
}))

beforeEach(async () => {
  await db.symptom_types.clear()
  await db.symptoms.clear()
})

const wrapper = ({ children }) => <HealthProvider>{children}</HealthProvider>

describe('LogSymptomSheet', () => {
  test('renders RegionPicker in step 1', () => {
    render(<LogSymptomSheet onClose={() => {}} />, { wrapper })
    expect(screen.getByText('Head')).toBeInTheDocument()
  })

  test('tapping a region advances to step 2', async () => {
    const user = userEvent.setup()
    render(<LogSymptomSheet onClose={() => {}} />, { wrapper })
    await user.click(screen.getByText('Head'))
    expect(screen.getByTestId('body-viewer-3d')).toBeInTheDocument()
    expect(screen.getByTestId('paint-controls')).toBeInTheDocument()
  })

  test('step 2 Next button advances to step 3', async () => {
    const user = userEvent.setup()
    render(<LogSymptomSheet onClose={() => {}} />, { wrapper })
    await user.click(screen.getByText('Head'))
    await user.click(screen.getByText('Next'))
    expect(screen.getByText('Symptom type')).toBeInTheDocument()
  })

  test('Save in step 3 calls onClose after saving', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<LogSymptomSheet onClose={onClose} />, { wrapper })
    await user.click(screen.getByText('Head'))
    await user.click(screen.getByText('Next'))
    await user.type(screen.getByPlaceholderText(/new symptom type/i), 'Headache')
    await user.click(screen.getByText('Save'))
    await expect.poll(() => onClose.mock.calls.length).toBe(1)
  })
})

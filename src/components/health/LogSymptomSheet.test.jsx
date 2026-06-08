import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LogSymptomSheet } from './LogSymptomSheet'
import { HealthProvider } from '../../contexts/HealthContext'
import { db } from '../../db/db'

beforeEach(async () => {
  await db.symptom_types.clear()
  await db.symptoms.clear()
})

const wrapper = ({ children }) => <HealthProvider>{children}</HealthProvider>

describe('LogSymptomSheet', () => {
  test('renders body map in step 1', () => {
    render(<LogSymptomSheet onClose={() => {}} />, { wrapper })
    expect(screen.getByText('Front')).toBeInTheDocument()
    expect(screen.getByText('Back')).toBeInTheDocument()
  })

  test('tapping a region advances to step 2', async () => {
    const user = userEvent.setup()
    render(<LogSymptomSheet onClose={() => {}} />, { wrapper })
    await user.click(screen.getByLabelText(/tap head/i))
    expect(screen.getByText('Head')).toBeInTheDocument()
    expect(screen.getByText('Minimal')).toBeInTheDocument()
  })

  test('step 2 Next button advances to step 3', async () => {
    const user = userEvent.setup()
    render(<LogSymptomSheet onClose={() => {}} />, { wrapper })
    await user.click(screen.getByLabelText(/tap head/i))
    await user.click(screen.getByText('Next'))
    expect(screen.getByText('Symptom type')).toBeInTheDocument()
  })

  test('Save in step 3 calls onClose after saving', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<LogSymptomSheet onClose={onClose} />, { wrapper })
    await user.click(screen.getByLabelText(/tap head/i))
    await user.click(screen.getByText('Next'))
    await user.type(screen.getByPlaceholderText(/new symptom type/i), 'Headache')
    await user.click(screen.getByText('Save'))
    await expect.poll(() => onClose.mock.calls.length).toBe(1)
  })
})

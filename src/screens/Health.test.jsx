import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Health } from './Health'
import { HealthProvider } from '../contexts/HealthContext'
import { VitalsProvider } from '../contexts/VitalsContext'
import { db } from '../db/db'

beforeEach(async () => {
  await db.symptom_types.clear()
  await db.symptoms.clear()
  await db.vital_types.clear()
  await db.vital_entries.clear()
})

function Wrapper({ children }) {
  return (
    <HealthProvider>
      <VitalsProvider>{children}</VitalsProvider>
    </HealthProvider>
  )
}

test('renders Overview and History tabs', async () => {
  render(<Health />, { wrapper: Wrapper })
  expect(screen.getByText('Overview')).toBeInTheDocument()
  expect(screen.getByText('History')).toBeInTheDocument()
})

test('Overview shows Log Symptom and Log Vital buttons', async () => {
  render(<Health />, { wrapper: Wrapper })
  expect(screen.getByText('Log Symptom')).toBeInTheDocument()
  expect(screen.getByText('Log Vital')).toBeInTheDocument()
})

test('clicking Log Symptom opens LogSymptomSheet', async () => {
  const user = userEvent.setup()
  render(<Health />, { wrapper: Wrapper })
  await user.click(screen.getByText('Log Symptom'))
  expect(screen.getByRole('dialog', { name: /log symptom/i })).toBeInTheDocument()
})

test('clicking Log Vital opens LogVitalSheet', async () => {
  const user = userEvent.setup()
  render(<Health />, { wrapper: Wrapper })
  await user.click(screen.getByText('Log Vital'))
  expect(screen.getByRole('dialog', { name: /log vital/i })).toBeInTheDocument()
})

test('switching to History tab shows history list with filter chips', async () => {
  const user = userEvent.setup()
  render(<Health />, { wrapper: Wrapper })
  await user.click(screen.getByText('History'))
  expect(screen.getByText(/no health events/i)).toBeInTheDocument()
  expect(screen.getByText('All')).toBeInTheDocument()
  expect(screen.getByText('Symptoms')).toBeInTheDocument()
  expect(screen.getByText('Vitals')).toBeInTheDocument()
})

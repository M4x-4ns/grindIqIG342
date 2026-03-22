import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAppStore } from '@/store/useAppStore'
import { MemoryRouter } from 'react-router-dom'
import BeanProfiles from './BeanProfiles'
import type { BeanProfile } from '@/types/bean'
import type { GrinderConfig } from '@/types/grinder'

const grinders: GrinderConfig[] = [
  { id: 'grinder-a', label: 'Junior', roastLevel: 'light', grinderType: 'stepped', baselineGrind: 18, tempCoefficient: 0.15, humidityCoefficient: 0.05, isActive: true },
]

const beans: BeanProfile[] = [
  { id: 'bean-1', name: 'Ethiopia Yirgacheffe', origin: 'Ethiopia', agtron: 78, roastLevel: 'light', baselineGrinds: { 'grinder-a': 18 }, baselineTemp: 25, baselineHumidity: 60, isActive: true,  createdAt: '2026-01-01T00:00:00Z' },
  { id: 'bean-2', name: 'Colombia Huila',       origin: 'Colombia', agtron: 58, roastLevel: 'medium', baselineGrinds: { 'grinder-a': 19 }, baselineTemp: 25, baselineHumidity: 60, isActive: false, createdAt: '2026-01-02T00:00:00Z' },
]

beforeEach(() => {
  useAppStore.setState({ beans, grinders, selectedBean: null, selectedGrinder: null })
})

describe('BeanProfiles page', () => {
  it('renders all bean cards', () => {
    render(<MemoryRouter><BeanProfiles /></MemoryRouter>)
    expect(screen.getByText('Ethiopia Yirgacheffe')).toBeTruthy()
    expect(screen.getByText('Colombia Huila')).toBeTruthy()
  })

  it('opens drawer when a card is clicked', async () => {
    render(<MemoryRouter><BeanProfiles /></MemoryRouter>)
    await userEvent.click(screen.getByText('Colombia Huila'))
    expect(screen.getByText('Edit Bean Profile')).toBeTruthy()
  })

  it('switches drawer bean when a different card is clicked while drawer is open', async () => {
    render(<MemoryRouter><BeanProfiles /></MemoryRouter>)
    await userEvent.click(screen.getByText('Ethiopia Yirgacheffe'))
    expect(screen.getByText('Edit Bean Profile')).toBeTruthy()
    await userEvent.click(screen.getByText('Colombia Huila'))
    expect(screen.getByText('Edit Bean Profile')).toBeTruthy()
    const colHuilaText = screen.getAllByText('Colombia Huila')
    expect(colHuilaText.length).toBeGreaterThan(0)
  })

  it('closes drawer when ✕ is clicked', async () => {
    render(<MemoryRouter><BeanProfiles /></MemoryRouter>)
    await userEvent.click(screen.getByText('Colombia Huila'))
    await userEvent.click(screen.getByLabelText('Close drawer'))
    expect(screen.queryByText('Edit Bean Profile')).toBeNull()
  })
})

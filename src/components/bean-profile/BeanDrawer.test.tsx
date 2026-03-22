import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BeanDrawer } from './BeanDrawer'
import type { BeanProfile } from '@/types/bean'
import type { GrinderConfig } from '@/types/grinder'

// Mock the store — BeanDrawer reads createBean/updateBean/deleteBean from it
vi.mock('@/store/useAppStore', () => ({
  useAppStore: vi.fn(() => ({
    createBean:  vi.fn().mockResolvedValue(undefined),
    updateBean:  vi.fn().mockResolvedValue(undefined),
    deleteBean:  vi.fn().mockResolvedValue(undefined),
    isSaving:    false,
  })),
}))

const grinders: GrinderConfig[] = [
  { id: 'grinder-a', label: 'Junior', roastLevel: 'light', grinderType: 'stepped', baselineGrind: 18, tempCoefficient: 0.15, humidityCoefficient: 0.05, isActive: true },
]

const bean: BeanProfile = {
  id: 'b1',
  name: 'Ethiopia Yirgacheffe',
  origin: 'Ethiopia',
  agtron: 78,
  roastLevel: 'light',
  baselineGrinds: { 'grinder-a': 18 },
  baselineTemp: 25,
  baselineHumidity: 60,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
}

describe('BeanDrawer', () => {
  it('shows "Edit Bean Profile" title in edit mode', () => {
    render(<BeanDrawer mode="edit" bean={bean} grinders={grinders} onClose={vi.fn()} />)
    expect(screen.getByText('Edit Bean Profile')).toBeTruthy()
  })

  it('shows bean name as subtitle in edit mode', () => {
    render(<BeanDrawer mode="edit" bean={bean} grinders={grinders} onClose={vi.fn()} />)
    expect(screen.getByText('Ethiopia Yirgacheffe')).toBeTruthy()
  })

  it('shows "New Bean Profile" title in add mode', () => {
    render(<BeanDrawer mode="add" grinders={grinders} onClose={vi.fn()} />)
    expect(screen.getByText('New Bean Profile')).toBeTruthy()
  })

  it('calls onClose when ✕ button is clicked', async () => {
    const onClose = vi.fn()
    render(<BeanDrawer mode="add" grinders={grinders} onClose={onClose} />)
    await userEvent.click(screen.getByLabelText('Close drawer'))
    expect(onClose).toHaveBeenCalledOnce()
  })
})

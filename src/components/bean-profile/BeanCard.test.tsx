import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BeanCard } from './BeanCard'
import type { BeanProfile } from '@/types/bean'
import type { GrinderConfig } from '@/types/grinder'

const grinders: GrinderConfig[] = [
  { id: 'grinder-a', label: 'Jr',   roastLevel: 'light',  grinderType: 'stepped',   baselineGrind: 18, tempCoefficient: 0.15, humidityCoefficient: 0.05, isActive: true },
  { id: 'grinder-b', label: 'Ze',   roastLevel: 'medium', grinderType: 'stepless',  baselineGrind: 22, tempCoefficient: 0.15, humidityCoefficient: 0.05, isActive: true },
  { id: 'grinder-c', label: 'Ti',   roastLevel: 'dark',   grinderType: 'stepped',   baselineGrind: 24, tempCoefficient: 0.15, humidityCoefficient: 0.05, isActive: true },
]

const activeBean: BeanProfile = {
  id: 'b1',
  name: 'Ethiopia Yirgacheffe',
  origin: 'Ethiopia',
  agtron: 78,
  roastLevel: 'light',
  baselineGrinds: { 'grinder-a': 18, 'grinder-b': 22, 'grinder-c': 24 },
  baselineTemp: 25,
  baselineHumidity: 60,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
}

const hiddenBean: BeanProfile = { ...activeBean, id: 'b2', isActive: false }

describe('BeanCard', () => {
  it('renders bean name and origin', () => {
    render(<BeanCard bean={activeBean} grinders={grinders} onClick={vi.fn()} />)
    expect(screen.getByText('Ethiopia Yirgacheffe')).toBeTruthy()
    expect(screen.getByText('Ethiopia')).toBeTruthy()
  })

  it('renders agtron number', () => {
    render(<BeanCard bean={activeBean} grinders={grinders} onClick={vi.fn()} />)
    expect(screen.getByText('78')).toBeTruthy()
  })

  it('renders grind chips using label prefix + value from grinders prop', () => {
    render(<BeanCard bean={activeBean} grinders={grinders} onClick={vi.fn()} />)
    // Each chip shows first 2 chars of grinder label + the value
    expect(screen.getByText(/Jr/)).toBeTruthy()
    expect(screen.getByText(/Ze/)).toBeTruthy()
    expect(screen.getByText(/Ti/)).toBeTruthy()
    // Values
    expect(screen.getByText('18')).toBeTruthy()
    expect(screen.getByText('22')).toBeTruthy()
    expect(screen.getByText('24')).toBeTruthy()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<BeanCard bean={activeBean} grinders={grinders} onClick={onClick} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('applies reduced opacity for hidden bean', () => {
    const { container } = render(<BeanCard bean={hiddenBean} grinders={grinders} onClick={vi.fn()} />)
    const button = container.firstChild as HTMLElement
    // Hidden card should have opacity style (0.45) or an opacity class applied
    const opacityStyle = button.style.opacity
    const hasOpacityClass = button.className.includes('opacity')
    expect(opacityStyle === '0.45' || hasOpacityClass).toBe(true)
  })

  it('applies grinder accent colour to chip label prefixes', () => {
    const { container } = render(<BeanCard bean={activeBean} grinders={grinders} onClick={vi.fn()} />)
    // Grinder-a (index 0) should have colour #fbbf24
    const coloredSpans = container.querySelectorAll('[style*="color"]')
    expect(coloredSpans.length).toBeGreaterThan(0)
    expect((coloredSpans[0] as HTMLElement).style.color).toBeTruthy()
  })
})

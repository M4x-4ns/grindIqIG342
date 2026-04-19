import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ShotLog } from '@/types/shot'
import type { BeanProfile } from '@/types/bean'
import type { GrinderConfig } from '@/types/grinder'
import { DetailDrawer } from './DetailDrawer'

const mockShot: ShotLog = {
  id:               'shot-1',
  beanId:           'bean-1',
  grinderId:        'grinder-1',
  recommendedGrind: 14.0,
  actualGrind:      14.0,
  temp:             25,
  humidity:         55,
  feedback:         'perfect',
  createdAt:        '2026-03-28T10:00:00Z',
}

const mockBean: BeanProfile = {
  id:               'bean-1',
  name:             'Test Bean',
  origin:           'Ethiopia',
  agtron:           55,
  roastLevel:       'medium',
  baselineGrinds:   { 'grinder-1': 14.0 },
  baselineTemp:     25,
  baselineHumidity: 55,
  isActive:         true,
  createdAt:        '2026-01-01T00:00:00Z',
}

const mockGrinder: GrinderConfig = {
  id:                  'grinder-1',
  label:               'A',
  roastLevel:          'medium',
  grinderType:         'stepless',
  baselineGrind:       14.0,
  tempCoefficient:     0.15,
  humidityCoefficient: 0.05,
  isActive:            true,
}

describe('DetailDrawer — yield row', () => {
  it('displays yieldMl when present', () => {
    render(
      <DetailDrawer
        shot={{ ...mockShot, yieldMl: 42 }}
        bean={mockBean}
        grinder={mockGrinder}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText('42ml')).toBeTruthy()
    expect(screen.getByText('Yield')).toBeTruthy()
  })

  it('displays dash when yieldMl is absent', () => {
    render(
      <DetailDrawer
        shot={mockShot}
        bean={mockBean}
        grinder={mockGrinder}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText('Yield')).toBeTruthy()
    // The — character is the em dash used for absent values
    const yieldRow = screen.getByText('Yield').closest('div')
    expect(yieldRow?.textContent).toContain('—')
  })

  it('displays extractionTime when present', () => {
    render(
      <DetailDrawer
        shot={{ ...mockShot, extractionTime: 27 }}
        bean={mockBean}
        grinder={mockGrinder}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText('27s')).toBeTruthy()
  })
})

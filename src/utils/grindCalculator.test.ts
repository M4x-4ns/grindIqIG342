import { describe, it, expect } from 'vitest'
import { calculateGrind, formatAdjustment } from './grindCalculator'
import type { BeanProfile } from '@/types/bean'
import type { GrinderConfig } from '@/types/grinder'

const mockBean: BeanProfile = {
  id: 'b1',
  name: 'Ethiopia Yirgacheffe',
  origin: 'Ethiopia',
  agtron: 75,         // Light roast boundary — dAgtron = -0.5
  roastLevel: 'light',
  baselineGrinds: { 'a': 20 },   // key = mockGrinderStepped.id
  baselineTemp: 25,
  baselineHumidity: 60,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
}

const mockGrinderStepped: GrinderConfig = {
  id: 'a',
  label: 'A',
  roastLevel: 'light',
  grinderType: 'stepped',
  baselineGrind: 20,
  tempCoefficient: 0.15,
  humidityCoefficient: 0.05,
  isActive: true,
}

const mockGrinderStepless: GrinderConfig = {
  ...mockGrinderStepped,
  id: 'b',
  label: 'B',
  grinderType: 'stepless',
}

describe('calculateGrind', () => {
  it('returns baseline when conditions match baseline', () => {
    // At baseline temp & humidity, dTemp=0, dHumidity=0, dAgtron=-0.5 (agtron=75≥65)
    const result = calculateGrind(mockBean, mockGrinderStepped, 25, 60)
    expect(result.adjustments.dTemp).toBe(0)
    expect(result.adjustments.dHumidity).toBe(0)
    expect(result.adjustments.dAgtron).toBe(-0.5)
    expect(result.finalGrind).toBe(20) // Math.round(20 + 0 + 0 - 0.5) = 20 (rounds 19.5 → 20)
  })

  it('adjusts for higher temperature', () => {
    // +5°C → dTemp = 5 × 0.15 = 0.75
    const result = calculateGrind(mockBean, mockGrinderStepped, 30, 60)
    expect(result.adjustments.dTemp).toBeCloseTo(0.75)
  })

  it('returns integer display for stepped grinder', () => {
    const result = calculateGrind(mockBean, mockGrinderStepped, 25, 60)
    expect(result.displayValue).toMatch(/^\d+$/)
  })

  it('returns 1-decimal display for stepless grinder', () => {
    const result = calculateGrind(mockBean, mockGrinderStepless, 25, 60)
    expect(result.displayValue).toMatch(/^\d+\.\d$/)
  })

  it('applies +0.5 for dark roast (agtron ≤ 45)', () => {
    const darkBean: BeanProfile = { ...mockBean, agtron: 40 }
    const result = calculateGrind(darkBean, mockGrinderStepped, 25, 60)
    expect(result.adjustments.dAgtron).toBe(0.5)
  })

  it('applies 0 for medium roast (45 < agtron < 65)', () => {
    const medBean: BeanProfile = { ...mockBean, agtron: 55 }
    const result = calculateGrind(medBean, mockGrinderStepped, 25, 60)
    expect(result.adjustments.dAgtron).toBe(0)
  })
})

describe('formatAdjustment', () => {
  it('prefixes positive values with +', () => {
    expect(formatAdjustment(0.75)).toBe('+0.75')
  })
  it('keeps negative sign', () => {
    expect(formatAdjustment(-0.5)).toBe('-0.5')
  })
  it('handles zero', () => {
    expect(formatAdjustment(0)).toBe('+0')
  })
})

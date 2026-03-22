import type { BeanProfile } from '@/types/bean'
import type { GrinderConfig } from '@/types/grinder'

export interface GrindAdjustments {
  dTemp: number
  dHumidity: number
  dAgtron: number
}

export interface GrindResult {
  finalGrind: number
  adjustments: GrindAdjustments
  displayValue: string  // integer for stepped, 1 decimal for stepless
}

/**
 * PRD §7.1 — Grind Adjustment Formula
 *
 * Final Grind = Baseline Grind + dTemp + dHumidity + dAgtron
 *
 * dTemp     = (currentTemp - baselineTemp) × tempCoefficient (default 0.15)
 * dHumidity = (currentHumidity - baselineHumidity) × humidityCoefficient (default 0.05)
 * dAgtron   = Agtron ≥ 65 → -0.5 (Light: grind finer)
 *             Agtron ≤ 45 → +0.5 (Dark: grind coarser)
 *             else        →  0
 */
export function calculateGrind(
  bean: BeanProfile,
  grinder: GrinderConfig,
  currentTemp: number,
  currentHumidity: number,
): GrindResult {
  const dTemp = (currentTemp - bean.baselineTemp) * grinder.tempCoefficient
  const dHumidity = (currentHumidity - bean.baselineHumidity) * grinder.humidityCoefficient

  let dAgtron = 0
  if (bean.agtron >= 65) dAgtron = -0.5   // Light roast: grind finer
  else if (bean.agtron <= 45) dAgtron = 0.5  // Dark roast: grind coarser

  const baseline = bean.baselineGrinds[grinder.id] ?? grinder.baselineGrind
  const raw = baseline + dTemp + dHumidity + dAgtron

  const finalGrind =
    grinder.grinderType === 'stepped'
      ? Math.round(raw)
      : Math.round(raw * 10) / 10

  const displayValue =
    grinder.grinderType === 'stepped'
      ? String(finalGrind)
      : finalGrind.toFixed(1)

  return {
    finalGrind,
    adjustments: { dTemp, dHumidity, dAgtron },
    displayValue,
  }
}

/** Format an adjustment value with sign for display */
export function formatAdjustment(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return rounded >= 0 ? `+${rounded}` : String(rounded)
}

import type { ShotLog } from '@/types/shot'

/** Number of consecutive same-direction shots required to trigger a calibration suggestion. */
export const CALIBRATION_THRESHOLD = 2

export const TIME_TARGET  = 25    // seconds — shop target
export const YIELD_TARGET = 45    // ml — shop target
export const DELTA_CLAMP  = 1.5   // max absolute adjustment in either direction

export interface CalibrationSuggestion {
  direction: 'under' | 'over'
  beanId: string
  grinderId: string
  currentBaseline: number
  suggestedBaseline: number
  /** Adaptive adjustment from extraction time/yield deviation; falls back to ±0.5 if no data. Negative = finer grind (Under), positive = coarser grind (Over). */
  delta: number
}

/**
 * Computes a proportional grind adjustment from the extraction data of the two
 * trigger shots. Returns null if neither shot has any extraction data (caller
 * should fall back to the fixed ±0.5).
 *
 * Sign convention (lower grind number = finer):
 *   Under shots (fast/high-yield) → negative delta (finer)
 *   Over shots  (slow/low-yield)  → positive delta (coarser)
 */
export function computeAdaptiveDelta(s0: ShotLog, s1: ShotLog): number | null {
  const perShotDev = (shot: ShotLog): number | null => {
    const hasTime  = shot.extractionTime != null
    const hasYield = shot.yieldMl        != null
    if (!hasTime && !hasYield) return null

    const timeDev  = hasTime  ? (shot.extractionTime! - TIME_TARGET)  / TIME_TARGET  : null
    const yieldDev = hasYield ? (YIELD_TARGET - shot.yieldMl!)        / YIELD_TARGET : null

    if (timeDev != null && yieldDev != null) return (timeDev + yieldDev) / 2
    return timeDev ?? yieldDev!
  }

  const dev0 = perShotDev(s0)
  const dev1 = perShotDev(s1)
  if (dev0 == null && dev1 == null) return null

  const crossAvg =
    dev0 != null && dev1 != null ? (dev0 + dev1) / 2
    : (dev0 ?? dev1!)

  // Scale normalised deviation into grind-unit adjustment (empirically ×2)
  return Math.min(DELTA_CLAMP, Math.max(-DELTA_CLAMP, crossAvg * 2))
}

/**
 * Checks the two most recent shots for a given bean+grinder combination.
 * If both have the same non-'perfect' feedback direction, returns a calibration suggestion.
 *
 * Expects shots[] to be newest-first (as stored in useAppStore).
 * Returns null in all edge cases — never throws.
 */
export function detectCalibrationTrigger(
  shots: ShotLog[],
  beanId: string,
  grinderId: string,
  currentBaseline: number,
): CalibrationSuggestion | null {
  const filtered = shots.filter(s => s.beanId === beanId && s.grinderId === grinderId)

  if (filtered.length < CALIBRATION_THRESHOLD) return null

  const [s0, s1] = filtered  // s0 = most recent, s1 = second-most-recent

  if (s0.feedback === 'perfect' || s1.feedback === 'perfect') return null
  if (s0.feedback !== s1.feedback) return null

  const direction = s0.feedback  // 'under' | 'over' (not 'perfect')
  const fallbackDelta = direction === 'under' ? -0.5 : 0.5
  const delta = computeAdaptiveDelta(s0, s1) ?? fallbackDelta

  return {
    direction,
    beanId,
    grinderId,
    currentBaseline,
    suggestedBaseline: currentBaseline + delta,
    delta,
  }
}

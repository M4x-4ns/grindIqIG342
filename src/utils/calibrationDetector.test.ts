import { describe, it, expect } from 'vitest'
import { detectCalibrationTrigger, CALIBRATION_THRESHOLD, computeAdaptiveDelta, DELTA_CLAMP } from './calibrationDetector'
import type { ShotLog } from '@/types/shot'

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const BEAN_ID    = 'bean-1'
const GRINDER_ID = 'grinder-1'
const BASELINE   = 14.0

/**
 * Build a ShotLog fixture.
 * IMPORTANT: shots[] in the store is newest-first (prepended on save).
 * Pass shots to the test in the same order: index 0 = most recent.
 */
const makeShot = (
  feedback:       ShotLog['feedback'],
  beanId          = BEAN_ID,
  grinderId       = GRINDER_ID,
  extractionTime?: number,
  yieldMl?:        number,
): ShotLog => ({
  id:               crypto.randomUUID(),
  beanId,
  grinderId,
  recommendedGrind: BASELINE,
  actualGrind:      BASELINE,
  temp:             25,
  humidity:         55,
  feedback,
  extractionTime,
  yieldMl,
  createdAt:        new Date().toISOString(),
})

/** Shorthand for computeAdaptiveDelta unit tests — beanId/grinderId irrelevant there. */
const shot = (
  feedback:        ShotLog['feedback'],
  extractionTime?: number,
  yieldMl?:        number,
) => makeShot(feedback, BEAN_ID, GRINDER_ID, extractionTime, yieldMl)

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('CALIBRATION_THRESHOLD', () => {
  it('equals 2', () => {
    expect(CALIBRATION_THRESHOLD).toBe(2)
  })
})

describe('detectCalibrationTrigger', () => {
  it('returns null for empty shots array', () => {
    expect(detectCalibrationTrigger([], BEAN_ID, GRINDER_ID, BASELINE)).toBeNull()
  })

  it('returns null when only 1 matching shot exists', () => {
    const shots = [makeShot('under')]
    expect(detectCalibrationTrigger(shots, BEAN_ID, GRINDER_ID, BASELINE)).toBeNull()
  })

  it('returns suggestion for two consecutive under shots', () => {
    // newest-first: [under(newest), under(older)]
    const shots = [makeShot('under'), makeShot('under')]
    const result = detectCalibrationTrigger(shots, BEAN_ID, GRINDER_ID, BASELINE)

    expect(result).not.toBeNull()
    expect(result!.direction).toBe('under')
    expect(result!.delta).toBe(-0.5)
    expect(result!.suggestedBaseline).toBe(BASELINE - 0.5)   // 13.5
    expect(result!.currentBaseline).toBe(BASELINE)
    expect(result!.beanId).toBe(BEAN_ID)
    expect(result!.grinderId).toBe(GRINDER_ID)
  })

  it('returns suggestion for two consecutive over shots', () => {
    const shots = [makeShot('over'), makeShot('over')]
    const result = detectCalibrationTrigger(shots, BEAN_ID, GRINDER_ID, BASELINE)

    expect(result).not.toBeNull()
    expect(result!.direction).toBe('over')
    expect(result!.delta).toBe(0.5)
    expect(result!.suggestedBaseline).toBe(BASELINE + 0.5)   // 14.5
  })

  it('returns null for mixed under+over (index 0=under, index 1=over)', () => {
    const shots = [makeShot('under'), makeShot('over')]
    expect(detectCalibrationTrigger(shots, BEAN_ID, GRINDER_ID, BASELINE)).toBeNull()
  })

  it('returns null when most recent shot (index 0) is perfect', () => {
    const shots = [makeShot('perfect'), makeShot('under')]
    expect(detectCalibrationTrigger(shots, BEAN_ID, GRINDER_ID, BASELINE)).toBeNull()
  })

  it('returns null when second shot (index 1) is perfect', () => {
    const shots = [makeShot('under'), makeShot('perfect')]
    expect(detectCalibrationTrigger(shots, BEAN_ID, GRINDER_ID, BASELINE)).toBeNull()
  })

  it('returns null for two consecutive perfect shots', () => {
    const shots = [makeShot('perfect'), makeShot('perfect')]
    expect(detectCalibrationTrigger(shots, BEAN_ID, GRINDER_ID, BASELINE)).toBeNull()
  })

  it('[under, perfect, under] → null  (index 0+1 are under+perfect)', () => {
    // newest-first: [under, perfect, under]
    // filtered[0]=under, filtered[1]=perfect → perfect guard fires
    const shots = [makeShot('under'), makeShot('perfect'), makeShot('under')]
    expect(detectCalibrationTrigger(shots, BEAN_ID, GRINDER_ID, BASELINE)).toBeNull()
  })

  it('[under, under, over] → under  (index 0+1 are both under)', () => {
    // newest-first: [under(newest), under, over(oldest)]
    const shots = [makeShot('under'), makeShot('under'), makeShot('over')]
    const result = detectCalibrationTrigger(shots, BEAN_ID, GRINDER_ID, BASELINE)
    expect(result).not.toBeNull()
    expect(result!.direction).toBe('under')
  })

  it('ignores shots for different bean or grinder', () => {
    // Only 1 matching shot — others have wrong beanId or grinderId
    const shots = [
      makeShot('under', 'other-bean',    GRINDER_ID),
      makeShot('under', BEAN_ID,         'other-grinder'),
      makeShot('under', BEAN_ID,         GRINDER_ID),   // only 1 match
    ]
    expect(detectCalibrationTrigger(shots, BEAN_ID, GRINDER_ID, BASELINE)).toBeNull()
  })

  it('uses per-bean-grinder baseline — not a global value', () => {
    const customBaseline = 20.0
    const shots = [makeShot('over'), makeShot('over')]
    const result = detectCalibrationTrigger(shots, BEAN_ID, GRINDER_ID, customBaseline)
    expect(result!.currentBaseline).toBe(customBaseline)
    expect(result!.suggestedBaseline).toBe(customBaseline + 0.5)   // 20.5
  })
})

describe('detectCalibrationTrigger — adaptive delta integration', () => {
  it('two Under shots with time + yield produce adaptive negative delta', () => {
    // s0: 18s/55ml, s1: 20s/50ml → adaptive delta ≈ -0.41
    const shots = [
      makeShot('under', BEAN_ID, GRINDER_ID, 18, 55),
      makeShot('under', BEAN_ID, GRINDER_ID, 20, 50),
    ]
    const result = detectCalibrationTrigger(shots, BEAN_ID, GRINDER_ID, BASELINE)
    expect(result).not.toBeNull()
    expect(result!.delta).toBeCloseTo(-0.41, 1)
    expect(result!.suggestedBaseline).toBeCloseTo(BASELINE + result!.delta, 5)
  })

  it('two Over shots with time + yield produce adaptive positive delta', () => {
    // s0: 35s/35ml, s1: 32s/38ml → adaptive delta ≈ +0.53
    const shots = [
      makeShot('over', BEAN_ID, GRINDER_ID, 35, 35),
      makeShot('over', BEAN_ID, GRINDER_ID, 32, 38),
    ]
    const result = detectCalibrationTrigger(shots, BEAN_ID, GRINDER_ID, BASELINE)
    expect(result).not.toBeNull()
    expect(result!.delta).toBeCloseTo(0.53, 1)
    expect(result!.suggestedBaseline).toBeCloseTo(BASELINE + result!.delta, 5)
  })

  it('only s0 has data → delta driven by s0 alone, not the fixed fallback', () => {
    // s0: 18s/55ml → perShot=-0.251; s1: no data → crossAvg=-0.251; adj=-0.502
    // -0.502 is more negative than the fallback -0.5, confirming adaptive path was taken
    const shots = [
      makeShot('under', BEAN_ID, GRINDER_ID, 18, 55),
      makeShot('under'),
    ]
    const result = detectCalibrationTrigger(shots, BEAN_ID, GRINDER_ID, BASELINE)
    expect(result).not.toBeNull()
    expect(result!.delta).toBeLessThan(-0.5)   // adaptive -0.502, not fallback -0.5
    expect(result!.suggestedBaseline).toBeCloseTo(BASELINE + result!.delta, 5)
  })
})

// ─── computeAdaptiveDelta ──────────────────────────────────────────────────────
describe('computeAdaptiveDelta', () => {
  it('both shots have time + yield → correct cross-shot average', () => {
    // s0: 18s/55ml → timeDev=-0.280, yieldDev=-0.222, perShot=-0.251
    // s1: 20s/50ml → timeDev=-0.200, yieldDev=-0.111, perShot=-0.156
    // crossAvg=-0.203, adj=-0.41
    const result = computeAdaptiveDelta(shot('under', 18, 55), shot('under', 20, 50))
    expect(result).not.toBeNull()
    expect(result!).toBeCloseTo(-0.41, 1)
  })

  it('both shots have time only → uses timeDev, ignores absent yield', () => {
    // timeDev: s0=-0.280, s1=-0.200; crossAvg=-0.240; adj=-0.48
    const result = computeAdaptiveDelta(shot('under', 18), shot('under', 20))
    expect(result).not.toBeNull()
    expect(result!).toBeCloseTo(-0.48, 1)
  })

  it('both shots have yield only → uses yieldDev, ignores absent time', () => {
    // yieldDev: s0=(45-55)/45=-0.222, s1=(45-50)/45=-0.111; crossAvg=-0.167; adj=-0.33
    const result = computeAdaptiveDelta(shot('under', undefined, 55), shot('under', undefined, 50))
    expect(result).not.toBeNull()
    expect(result!).toBeCloseTo(-0.33, 1)
  })

  it('s0 time-only, s1 yield-only → each contributes its single-signal perShotDev', () => {
    // s0: 18s → perShot=-0.280
    // s1: 50ml → yieldDev=(45-50)/45=-0.111, perShot=-0.111
    // crossAvg=(-0.280 + -0.111)/2=-0.196; adj=-0.39
    const result = computeAdaptiveDelta(shot('under', 18), shot('under', undefined, 50))
    expect(result).not.toBeNull()
    expect(result!).toBeCloseTo(-0.39, 1)
  })

  it('s0 has both signals, s1 has neither → crossAvg equals s0 perShotDev', () => {
    // s0: 18s/55ml → perShot=-0.251; s1: no data → null
    // crossAvg=-0.251; adj=-0.502
    const result = computeAdaptiveDelta(shot('under', 18, 55), shot('under'))
    expect(result).not.toBeNull()
    expect(result!).toBeCloseTo(-0.502, 2)
  })

  it('neither shot has any data → returns null', () => {
    expect(computeAdaptiveDelta(shot('under'), shot('under'))).toBeNull()
  })

  it('extreme Over data → clamped to +DELTA_CLAMP', () => {
    // 100s/1ml: timeDev=3.0, yieldDev=(45-1)/45=0.978; perShot=1.989; adj=3.978 → clamp to 1.5
    const result = computeAdaptiveDelta(shot('over', 100, 1), shot('over', 100, 1))
    expect(result).toBe(DELTA_CLAMP)
  })

  it('extreme Under data → clamped to -DELTA_CLAMP', () => {
    // 1s/200ml: timeDev=-0.96, yieldDev=(45-200)/45=-3.444; perShot=-2.202; adj=-4.404 → clamp to -1.5
    const result = computeAdaptiveDelta(shot('under', 1, 200), shot('under', 1, 200))
    expect(result).toBe(-DELTA_CLAMP)
  })

  it('close to target → small positive adjustment', () => {
    // s0: 27s/43ml, s1: 26s/44ml → crossAvg=+0.047; adj≈+0.09
    const result = computeAdaptiveDelta(shot('over', 27, 43), shot('over', 26, 44))
    expect(result).not.toBeNull()
    expect(result!).toBeCloseTo(0.09, 1)
  })
})

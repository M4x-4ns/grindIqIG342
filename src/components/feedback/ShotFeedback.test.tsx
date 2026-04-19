import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { BeanProfile } from '@/types/bean'
import type { GrinderConfig } from '@/types/grinder'
import type { ShotLog } from '@/types/shot'

// ─── Mock store — must be before ShotFeedback import ─────────────────────────
// vi.mock is hoisted before imports, so the factory runs before module code.
// We use vi.fn() stubs here; the actual return values are configured in beforeEach.
vi.mock('@/store/useAppStore', () => {
  const useAppStore = Object.assign(vi.fn(), { getState: vi.fn() })
  return { useAppStore }
})

import { useAppStore } from '@/store/useAppStore'
import { ShotFeedback } from './ShotFeedback'

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const mockBean: BeanProfile = {
  id:               'bean-1',
  name:             'Test Bean',
  origin:           'Ethiopia',
  agtron:           55,           // medium — dAgtron = 0, keeps baseline clean
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

const makeShot = (feedback: ShotLog['feedback']): ShotLog => ({
  id:               crypto.randomUUID(),
  beanId:           mockBean.id,
  grinderId:        mockGrinder.id,
  recommendedGrind: 14.0,
  actualGrind:      14.0,
  temp:             25,
  humidity:         55,
  feedback,
  createdAt:        new Date().toISOString(),
})

// ─── Store setup helpers ───────────────────────────────────────────────────────
// mockState is re-created in beforeEach so each test starts clean.
// saveShot prepends the new shot so getState().shots reflects the post-save snapshot.
let mockState: {
  selectedBean:    BeanProfile | null
  selectedGrinder: GrinderConfig | null
  sensor:          { reading: { temperature: number; humidity: number } | null }
  saveShot:        ReturnType<typeof vi.fn>
  updateBean:      ReturnType<typeof vi.fn>
  isSaving:        boolean
  shots:           ShotLog[]
}

beforeEach(() => {
  mockState = {
    selectedBean:    mockBean,
    selectedGrinder: mockGrinder,
    sensor:          { reading: { temperature: 25, humidity: 55 } },
    saveShot:        vi.fn(),
    updateBean:      vi.fn().mockResolvedValue(undefined),
    isSaving:        false,
    shots:           [],
  }

  // saveShot prepends the shot, matching real store behaviour
  mockState.saveShot = vi.fn().mockImplementation(async (shot: ShotLog) => {
    mockState.shots = [shot, ...mockState.shots]
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock store shape does not fully match Zustand's generic return type
  vi.mocked(useAppStore).mockReturnValue(mockState as any)
  vi.mocked(useAppStore).getState = vi.fn().mockReturnValue(mockState)
})

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('ShotFeedback — auto-calibration integration', () => {
  it('shows CalibrationSuggestionCard after 2 consecutive under shots', async () => {
    // Pre-seed 1 under shot so the 2nd (logged now) triggers the card
    mockState.shots = [makeShot('under')]

    render(<ShotFeedback />)
    await userEvent.click(screen.getByText('Under'))
    await userEvent.click(screen.getByText('Log Shot'))

    await waitFor(() => {
      expect(screen.getByText(/2 consecutive under-extracted shots/i)).toBeTruthy()
    })
    // Baseline change shown: 14 → 13.5 (under = finer = negative delta)
    expect(screen.getByText(/13\.5/)).toBeTruthy()
  })

  it('shows CalibrationSuggestionCard after 2 consecutive over shots', async () => {
    mockState.shots = [makeShot('over')]

    render(<ShotFeedback />)
    await userEvent.click(screen.getByText('Over'))
    await userEvent.click(screen.getByText('Log Shot'))

    await waitFor(() => {
      expect(screen.getByText(/2 consecutive over-extracted shots/i)).toBeTruthy()
    })
    // Baseline change shown: 14 → 14.5 (over = coarser = positive delta)
    expect(screen.getByText(/14\.5/)).toBeTruthy()
  })

  it('does not show card when only 1 shot exists for this bean+grinder', async () => {
    mockState.shots = []  // no prior shots

    render(<ShotFeedback />)
    await userEvent.click(screen.getByText('Under'))
    await userEvent.click(screen.getByText('Log Shot'))

    await waitFor(() => screen.queryByText('Log Shot'))  // wait for save to complete
    expect(screen.queryByText(/consecutive/i)).toBeNull()
  })

  it('does not show card when last 2 shots have different directions', async () => {
    mockState.shots = [makeShot('over')]  // previous was over

    render(<ShotFeedback />)
    await userEvent.click(screen.getByText('Under'))  // now under — mixed → no card
    await userEvent.click(screen.getByText('Log Shot'))

    await waitFor(() => screen.queryByText('Log Shot'))
    expect(screen.queryByText(/consecutive/i)).toBeNull()
  })

  it('calls updateBean with correct spread on Accept — preserves other grinder baselines', async () => {
    // Bean has baselines for 2 grinders — Accept must not erase grinder-2's baseline
    const beanWith2Grinders: BeanProfile = {
      ...mockBean,
      baselineGrinds: { 'grinder-1': 14.0, 'grinder-2': 18.0 },
    }
    mockState.selectedBean = beanWith2Grinders
    mockState.shots = [makeShot('under')]
    // getState() must return live mockState so post-saveShot mutations are visible
    vi.mocked(useAppStore).getState = vi.fn().mockImplementation(() => mockState)

    render(<ShotFeedback />)
    await userEvent.click(screen.getByText('Under'))
    await userEvent.click(screen.getByText('Log Shot'))
    await waitFor(() => screen.getByText(/under-extracted/i))

    await userEvent.click(screen.getByRole('button', { name: /accept/i }))

    expect(mockState.updateBean).toHaveBeenCalledOnce()
    const updatedBean = mockState.updateBean.mock.calls[0][0] as BeanProfile
    // grinder-1 updated to 13.5 (under = finer = negative delta)
    expect(updatedBean.baselineGrinds['grinder-1']).toBe(13.5)
    // grinder-2 preserved
    expect(updatedBean.baselineGrinds['grinder-2']).toBe(18.0)
    // full bean fields intact
    expect(updatedBean.id).toBe('bean-1')
    expect(updatedBean.name).toBe('Test Bean')
  })

  it('card disappears after Accept', async () => {
    mockState.shots = [makeShot('under')]

    render(<ShotFeedback />)
    await userEvent.click(screen.getByText('Under'))
    await userEvent.click(screen.getByText('Log Shot'))
    await waitFor(() => screen.getByText(/under-extracted/i))

    await userEvent.click(screen.getByRole('button', { name: /accept/i }))

    expect(screen.queryByText(/consecutive/i)).toBeNull()
  })

  it('does not call updateBean on Dismiss; card disappears', async () => {
    mockState.shots = [makeShot('under')]

    render(<ShotFeedback />)
    await userEvent.click(screen.getByText('Under'))
    await userEvent.click(screen.getByText('Log Shot'))
    await waitFor(() => screen.getByText(/under-extracted/i))

    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }))

    expect(mockState.updateBean).not.toHaveBeenCalled()
    expect(screen.queryByText(/consecutive/i)).toBeNull()
  })

  it('timer does not clear toast while CalibrationSuggestionCard is visible', async () => {
    vi.useFakeTimers()
    mockState.shots = [makeShot('under')]

    render(<ShotFeedback />)

    // Use fireEvent (synchronous) to avoid userEvent + fake timer conflicts
    fireEvent.click(screen.getByText('Under'))
    fireEvent.click(screen.getByText('Log Shot'))

    // Flush the async saveShot microtask so React state updates propagate
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })

    // Card must be visible
    expect(screen.getByText(/under-extracted/i)).toBeTruthy()

    // Advance past the 2200ms toast timer
    act(() => { vi.advanceTimersByTime(2300) })

    // Card still present — timer guard fired and bailed out
    expect(screen.queryByText(/under-extracted/i)).not.toBeNull()

    vi.useRealTimers()
  })

  it('does not show card when prior shot is for a different bean or grinder', async () => {
    // 2 shots in store, but only 1 matches this bean+grinder
    // The other belongs to a different bean — should NOT count toward trigger
    const differentBeanShot: ShotLog = {
      ...makeShot('under'),
      beanId: 'other-bean',
    }
    mockState.shots = [differentBeanShot]

    render(<ShotFeedback />)
    await userEvent.click(screen.getByText('Under'))
    await userEvent.click(screen.getByText('Log Shot'))

    await waitFor(() => screen.queryByText('Log Shot'))
    expect(screen.queryByText(/consecutive/i)).toBeNull()
  })
})

describe('ShotFeedback — extraction data inputs', () => {
  it('input fields are not visible before feedback is selected', () => {
    render(<ShotFeedback />)
    // Fields hidden (opacity-0 / pointer-events-none) — query by placeholder
    const timeInput  = screen.queryByPlaceholderText('25')
    const yieldInput = screen.queryByPlaceholderText('45')
    // Elements exist in DOM but their container has opacity-0
    // We verify the container is present and has the hidden class
    if (timeInput) {
      expect(timeInput.closest('[data-extraction-row]')?.className).toContain('opacity-0')
    }
    void yieldInput
  })

  it('saveShot receives extractionTime and yieldMl when both fields are filled', async () => {
    render(<ShotFeedback />)

    await userEvent.click(screen.getByText('Perfect'))
    await userEvent.type(screen.getByPlaceholderText('25'), '27')
    await userEvent.type(screen.getByPlaceholderText('45'), '42')
    await userEvent.click(screen.getByText('Log Shot'))

    await waitFor(() => {
      expect(mockState.saveShot).toHaveBeenCalledOnce()
    })
    const shot = mockState.saveShot.mock.calls[0][0] as ShotLog
    expect(shot.extractionTime).toBe(27)
    expect(shot.yieldMl).toBe(42)
  })

  it('saveShot omits extractionTime and yieldMl when fields are empty', async () => {
    render(<ShotFeedback />)

    await userEvent.click(screen.getByText('Perfect'))
    // Do not fill in either field
    await userEvent.click(screen.getByText('Log Shot'))

    await waitFor(() => {
      expect(mockState.saveShot).toHaveBeenCalledOnce()
    })
    const shot = mockState.saveShot.mock.calls[0][0] as ShotLog
    expect(shot.extractionTime).toBeUndefined()
    expect(shot.yieldMl).toBeUndefined()
  })

  it('field values persist when switching between feedback buttons', async () => {
    render(<ShotFeedback />)

    await userEvent.click(screen.getByText('Perfect'))
    await userEvent.type(screen.getByPlaceholderText('25'), '27')
    await userEvent.type(screen.getByPlaceholderText('45'), '42')

    // Switch to Under
    await userEvent.click(screen.getByText('Under'))

    expect((screen.getByPlaceholderText('25') as HTMLInputElement).value).toBe('27')
    expect((screen.getByPlaceholderText('45') as HTMLInputElement).value).toBe('42')
  })

  it('fields reset to empty after a successful save', async () => {
    render(<ShotFeedback />)

    await userEvent.click(screen.getByText('Perfect'))
    await userEvent.type(screen.getByPlaceholderText('25'), '27')
    await userEvent.type(screen.getByPlaceholderText('45'), '42')
    await userEvent.click(screen.getByText('Log Shot'))

    await waitFor(() => {
      expect((screen.getByPlaceholderText('25') as HTMLInputElement).value).toBe('')
      expect((screen.getByPlaceholderText('45') as HTMLInputElement).value).toBe('')
    })
  })

  it('treats non-numeric input as omitted (saveShot gets undefined)', async () => {
    render(<ShotFeedback />)

    await userEvent.click(screen.getByText('Perfect'))
    await userEvent.type(screen.getByPlaceholderText('25'), 'abc')
    await userEvent.click(screen.getByText('Log Shot'))

    await waitFor(() => expect(mockState.saveShot).toHaveBeenCalledOnce())
    const shot = mockState.saveShot.mock.calls[0][0] as ShotLog
    expect(shot.extractionTime).toBeUndefined()
  })
})

describe('ShotFeedback — variant prop', () => {
  it('default variant renders fragment with 2 top-level children (toast + bar)', () => {
    const { container } = render(<ShotFeedback />)
    // Fragment children → 2 direct children of container
    expect(container.children).toHaveLength(2)
    // Second child (bar) has fixed positioning
    expect((container.children[1] as HTMLElement).className).toContain('fixed')
  })

  it('inline variant renders a single relative wrapper div', () => {
    const { container } = render(<ShotFeedback variant="inline" />)
    // Single wrapper div instead of fragment
    expect(container.children).toHaveLength(1)
    expect((container.children[0] as HTMLElement).className).toContain('relative')
  })

  it('inline variant bar has no fixed positioning and has border-t', () => {
    const { container } = render(<ShotFeedback variant="inline" />)
    // Bar is the second child of the wrapper div
    const bar = container.children[0].children[1] as HTMLElement
    expect(bar.className).not.toContain('fixed')
    expect(bar.className).toContain('border-t')
  })
})

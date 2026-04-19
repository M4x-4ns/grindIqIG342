import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CalibrationSuggestionCard } from './CalibrationSuggestionCard'
import type { CalibrationSuggestion } from '@/utils/calibrationDetector'

const underSuggestion: CalibrationSuggestion = {
  direction:         'under',
  beanId:            'bean-1',
  grinderId:         'grinder-1',
  currentBaseline:   14.0,
  suggestedBaseline: 14.5,
  delta:             0.5,
}

const overSuggestion: CalibrationSuggestion = {
  ...underSuggestion,
  direction:         'over',
  suggestedBaseline: 13.5,
  delta:             -0.5,
}

describe('CalibrationSuggestionCard', () => {
  it('renders heading for under-extracted direction', () => {
    render(<CalibrationSuggestionCard suggestion={underSuggestion} onAccept={vi.fn()} onDismiss={vi.fn()} />)
    expect(screen.getByText(/2 consecutive under-extracted shots/i)).toBeTruthy()
  })

  it('renders heading for over-extracted direction', () => {
    render(<CalibrationSuggestionCard suggestion={overSuggestion} onAccept={vi.fn()} onDismiss={vi.fn()} />)
    expect(screen.getByText(/2 consecutive over-extracted shots/i)).toBeTruthy()
  })

  it('renders current and suggested baseline values', () => {
    render(<CalibrationSuggestionCard suggestion={underSuggestion} onAccept={vi.fn()} onDismiss={vi.fn()} />)
    // Both numbers must appear somewhere in the card text
    expect(screen.getByText(/14/)).toBeTruthy()
    expect(screen.getByText(/14\.5/)).toBeTruthy()
  })

  it('renders Accept and Dismiss buttons', () => {
    render(<CalibrationSuggestionCard suggestion={underSuggestion} onAccept={vi.fn()} onDismiss={vi.fn()} />)
    expect(screen.getByRole('button', { name: /accept/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeTruthy()
  })

  it('calls onAccept when Accept is clicked', async () => {
    const onAccept = vi.fn()
    render(<CalibrationSuggestionCard suggestion={underSuggestion} onAccept={onAccept} onDismiss={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /accept/i }))
    expect(onAccept).toHaveBeenCalledOnce()
  })

  it('calls onDismiss when Dismiss is clicked', async () => {
    const onDismiss = vi.fn()
    render(<CalibrationSuggestionCard suggestion={underSuggestion} onAccept={vi.fn()} onDismiss={onDismiss} />)
    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})

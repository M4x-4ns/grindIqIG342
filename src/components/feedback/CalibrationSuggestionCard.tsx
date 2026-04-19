import { CALIBRATION_THRESHOLD } from '@/utils/calibrationDetector'
import type { CalibrationSuggestion } from '@/utils/calibrationDetector'

interface Props {
  suggestion: CalibrationSuggestion
  onAccept: () => void
  onDismiss: () => void
}

export function CalibrationSuggestionCard({ suggestion, onAccept, onDismiss }: Props) {
  const { direction, currentBaseline, suggestedBaseline } = suggestion
  const directionLabel = direction === 'under' ? 'under-extracted' : 'over-extracted'

  return (
    <div className="mb-[10px] p-3 rounded-[var(--r)] border border-[var(--border2)] bg-[var(--card3)]">
      <p className="text-[12px] font-bold text-[var(--text)] mb-[2px]">
        {CALIBRATION_THRESHOLD} consecutive {directionLabel} shots
      </p>
      <p className="text-[11px] text-[var(--muted)] mb-[10px]">
        Adjust baseline {currentBaseline.toFixed(1)} → {suggestedBaseline.toFixed(1)}?
      </p>
      <div className="flex gap-2">
        <button
          onClick={onAccept}
          className="flex-1 py-[8px] rounded-[var(--r)] bg-[var(--red)] text-white text-[12px] font-bold hover:opacity-90 transition-opacity active:scale-[.98]"
        >
          Accept
        </button>
        <button
          onClick={onDismiss}
          className="flex-1 py-[8px] rounded-[var(--r)] border border-[var(--border2)] text-[var(--muted)] text-[12px] font-medium hover:bg-[var(--card2)] transition-colors active:scale-[.98]"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

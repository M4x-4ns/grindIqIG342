import { useAppStore } from '@/store/useAppStore'
import type { ShotFeedback } from '@/types/shot'

export type FeedbackFilter = 'all' | ShotFeedback

interface FilterStripProps {
  feedback:        FeedbackFilter
  grinderIds:      Set<string>
  onFeedback:      (f: FeedbackFilter) => void
  onToggleGrinder: (id: string) => void
}

const FEEDBACK_CHIPS: { key: FeedbackFilter; label: string; activeCls: string }[] = [
  { key: 'all',     label: 'All',        activeCls: 'bg-white/[.08] border-white/20 text-white' },
  { key: 'perfect', label: '\u2713 Perfect',  activeCls: 'bg-[var(--green-soft)] border-[rgba(34,197,94,.35)] text-[var(--green)]' },
  { key: 'under',   label: '\u25C0\u25C0 Under',   activeCls: 'bg-[var(--blue-soft)]  border-[rgba(96,165,250,.35)] text-[var(--blue)]'  },
  { key: 'over',    label: '\u25B6\u25B6 Over',    activeCls: 'bg-[var(--red-soft)]   border-[rgba(204,36,36,.35)]  text-[#ff8080]'       },
]

const BASE_CHIP = 'flex items-center gap-[5px] border rounded-full px-[14px] py-[7px] text-[12px] font-bold whitespace-nowrap flex-shrink-0 transition-all duration-[150ms] select-none'
const IDLE_CHIP = 'bg-[var(--card)] border-[var(--border2)] text-[var(--muted)] hover:text-[var(--text)] hover:border-white/20'

export function FilterStrip({ feedback, grinderIds, onFeedback, onToggleGrinder }: FilterStripProps) {
  const { grinders } = useAppStore()

  return (
    <div className="flex items-center gap-2 py-[14px] overflow-x-auto [&::-webkit-scrollbar]:hidden">
      {FEEDBACK_CHIPS.map(chip => (
        <button
          key={chip.key}
          onClick={() => onFeedback(chip.key)}
          className={`${BASE_CHIP} ${feedback === chip.key ? chip.activeCls : IDLE_CHIP}`}
        >
          {chip.label}
        </button>
      ))}

      {/* Divider */}
      <div className="w-px h-5 bg-[var(--border2)] flex-shrink-0" />

      {/* Dynamic grinder chips */}
      {grinders.map(g => (
        <button
          key={g.id}
          onClick={() => onToggleGrinder(g.id)}
          className={`${BASE_CHIP} ${
            grinderIds.has(g.id)
              ? 'bg-[var(--amber-soft)] border-[rgba(232,160,32,.35)] text-[var(--amber)]'
              : IDLE_CHIP
          }`}
        >
          Grinder {g.label}
        </button>
      ))}
    </div>
  )
}

import type { BeanProfile } from '@/types/bean'
import type { GrinderConfig, RoastLevel } from '@/types/grinder'

// Accent colours indexed by grinder position — matches BeanForm constants
const GRINDER_COLORS = ['#fbbf24', '#d4845a', '#a0663c']

const ROAST_EMOJI: Record<RoastLevel, string> = {
  light: '☀',
  medium: '⛅',
  dark: '🌑',
  'very-dark': '🌑',
}

const ROAST_BADGE_CLS: Record<RoastLevel, string> = {
  light:      'bg-[rgba(251,191,36,.12)]  text-[#fbbf24] border-[rgba(251,191,36,.2)]',
  medium:     'bg-[rgba(180,110,60,.15)]  text-[#d4845a] border-[rgba(180,110,60,.2)]',
  dark:       'bg-[rgba(100,60,20,.2)]    text-[#a0663c] border-[rgba(100,60,20,.3)]',
  'very-dark':'bg-[rgba(100,60,20,.2)]    text-[#a0663c] border-[rgba(100,60,20,.3)]',
}

interface BeanCardProps {
  bean: BeanProfile
  grinders: GrinderConfig[]
  onClick: () => void
  isSelected?: boolean
}

export function BeanCard({ bean, grinders, onClick, isSelected = false }: BeanCardProps) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col bg-[var(--card)] border-[1.5px] rounded-[13px] p-3 text-left transition-all duration-[180ms] w-full
        ${isSelected
          ? 'border-[var(--red)] bg-[var(--card2)]'
          : 'border-[var(--border)] hover:border-[var(--border2)] hover:bg-[var(--card2)]'
        }`}
      style={{ opacity: bean.isActive ? 1 : 0.45 }}
    >
      {/* Status dot */}
      <div
        className="absolute top-[11px] right-[11px] w-[7px] h-[7px] rounded-full"
        style={{ background: bean.isActive ? '#4ade80' : 'var(--text3)' }}
      />

      {/* Roast badge */}
      <span className={`inline-block text-[9px] font-semibold px-[7px] py-[2px] rounded-[5px] border mb-[5px] self-start
        ${ROAST_BADGE_CLS[bean.roastLevel] ?? ROAST_BADGE_CLS.medium}`}
      >
        {ROAST_EMOJI[bean.roastLevel]} {bean.roastLevel.charAt(0).toUpperCase() + bean.roastLevel.slice(1)}
      </span>

      {/* Name */}
      <div className="text-[13px] font-bold text-white leading-[1.2] mb-[2px] truncate pr-3">
        {bean.name}
      </div>

      {/* Origin */}
      <div className="text-[10px] text-[var(--muted)] mb-[5px]">
        {bean.origin}
      </div>

      {/* Agtron */}
      <div className="flex items-baseline gap-[3px] mb-[6px]">
        <span className="text-[20px] font-black text-white leading-none">{bean.agtron}</span>
        <span className="text-[9px] text-[var(--text3)] uppercase tracking-[.4px]">Agtron</span>
      </div>

      {/* Grind chips — one per grinder; label prefix coloured by grinder accent */}
      <div className="flex flex-wrap gap-[4px]">
        {grinders.map((g, i) => {
          const val = bean.baselineGrinds[g.id]
          if (val === undefined) return null
          return (
            <span
              key={g.id}
              className="text-[9px] bg-[var(--card2)] border border-[var(--border)] rounded-[5px] px-[5px] py-[2px]"
            >
              <span style={{ color: GRINDER_COLORS[i] ?? 'var(--text2)' }} className="font-semibold">
                {g.label.slice(0, 2)}
              </span>{' '}
              <span className="text-white font-semibold">{val}</span>
            </span>
          )
        })}
      </div>
    </button>
  )
}

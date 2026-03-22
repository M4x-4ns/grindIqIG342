import type { ShotLog } from '@/types/shot'
import type { BeanProfile } from '@/types/bean'
import type { GrinderConfig } from '@/types/grinder'
import { fmtGrind } from './formatGrind'

interface ShotRowProps {
  shot:    ShotLog
  bean:    BeanProfile    | undefined
  grinder: GrinderConfig  | undefined
  onClick: () => void
}

const FB_ICON:  Record<string, string> = { perfect: '\u2713', under: '\u25C0\u25C0', over: '\u25B6\u25B6' }
const FB_LABEL: Record<string, string> = { perfect: 'Perfect', under: 'Under', over: 'Over' }

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

/** Deterministic sparkline: seed from numeric part of shot id */
function sparkPoints(id: string): string {
  const seed = parseInt(id.replace(/\D/g, ''), 10) || 1
  return Array.from({ length: 9 }, (_unused, i) => {
    const y = 8 + ((seed * (i + 3) * 13) % 24)
    return `${i * 20},${y}`
  }).join(' ')
}

const ACCENT_CLS: Record<string, string> = {
  perfect: 'before:bg-[var(--green)]',
  under:   'before:bg-[var(--blue)]',
  over:    'before:bg-[var(--red)]',
}
const ICON_CLS: Record<string, string> = {
  perfect: 'bg-[rgba(34,197,94,.14)] border-[rgba(34,197,94,.25)]',
  under:   'bg-[rgba(96,165,250,.14)] border-[rgba(96,165,250,.25)]',
  over:    'bg-[rgba(204,36,36,.14)]  border-[rgba(204,36,36,.25)]',
}
const BADGE_CLS: Record<string, string> = {
  perfect: 'bg-[rgba(34,197,94,.14)] text-[var(--green)]',
  under:   'bg-[rgba(96,165,250,.14)] text-[var(--blue)]',
  over:    'bg-[rgba(204,36,36,.14)]  text-[#ff8080]',
}
const GRIND_CLS: Record<string, string> = {
  perfect: 'text-[rgba(200,255,220,.95)]',
  under:   'text-[rgba(200,220,255,.95)]',
  over:    'text-[rgba(255,200,200,.95)]',
}
const SPARK_CLR: Record<string, string> = {
  perfect: 'rgba(34,197,94,1)',
  under:   'rgba(96,165,250,1)',
  over:    'rgba(204,36,36,1)',
}

export function ShotRow({ shot, bean, grinder, onClick }: ShotRowProps) {
  const fb       = shot.feedback
  const grindStr = grinder ? fmtGrind(shot.recommendedGrind, grinder.grinderType) : shot.recommendedGrind.toFixed(1)
  const beanName = bean?.name    ?? shot.beanId
  const gLabel   = grinder?.label ?? shot.grinderId

  return (
    <button
      onClick={onClick}
      className={`relative w-full bg-[var(--card)] border-[1.5px] border-[var(--border)] rounded-[var(--r)] px-4 py-[14px]
        flex items-center gap-[14px] text-left transition-all duration-[180ms] overflow-hidden select-none
        hover:bg-[var(--card2)] hover:border-[var(--border2)] hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(0,0,0,.35)]
        active:translate-y-0
        before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:rounded-[3px_0_0_3px]
        ${ACCENT_CLS[fb] ?? ''}`}
    >
      {/* Sparkline overlay */}
      <svg
        className="absolute right-[80px] top-0 bottom-0 w-[100px] h-full pointer-events-none opacity-[.18]"
        viewBox="0 0 160 40"
        preserveAspectRatio="none"
      >
        <polyline
          points={sparkPoints(shot.id)}
          fill="none"
          stroke={SPARK_CLR[fb] ?? '#fff'}
          strokeWidth="1.5"
        />
      </svg>

      {/* Feedback icon */}
      <div className={`w-[42px] h-[42px] rounded-[12px] flex items-center justify-center text-[18px] flex-shrink-0 border relative z-10 ${ICON_CLS[fb] ?? ''}`}>
        {FB_ICON[fb]}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 relative z-10">
        <div className="flex items-center gap-[7px] mb-1">
          <span className="text-[14px] font-bold text-white truncate">{beanName}</span>
          <span className="text-[10px] font-extrabold px-[7px] py-[2px] rounded-[6px] bg-[var(--card3)] text-[var(--muted)] flex-shrink-0">
            G{gLabel}
          </span>
          <span className={`text-[10px] font-extrabold px-2 py-[2px] rounded-full flex-shrink-0 ${BADGE_CLS[fb] ?? ''}`}>
            {FB_LABEL[fb]}
          </span>
        </div>
        <div className="flex items-center gap-[10px] text-[11px] text-[var(--muted)]">
          <span>🕐 {fmtTime(shot.createdAt)}</span>
          <span>🌡 {shot.temp.toFixed(1)}°C</span>
          <span>💧 {shot.humidity.toFixed(0)}%</span>
          {shot.extractionTime != null && <span>⏱ {shot.extractionTime}s</span>}
        </div>
      </div>

      {/* Grind number */}
      <div className="text-right flex-shrink-0 relative z-10">
        <div className={`text-[28px] font-black tracking-[-1px] leading-none tabular-nums ${GRIND_CLS[fb] ?? 'text-white'}`}>
          {grindStr}
        </div>
        <div className="text-[10px] text-[var(--muted)] mt-[3px]">
          {grinder?.grinderType ?? 'unknown'}
        </div>
      </div>
    </button>
  )
}

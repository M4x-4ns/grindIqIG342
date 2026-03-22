import { calculateGrind } from '@/utils/grindCalculator'
import type { ShotLog } from '@/types/shot'
import type { BeanProfile } from '@/types/bean'
import type { GrinderConfig } from '@/types/grinder'
import { fmtGrind } from './formatGrind'

interface DetailDrawerProps {
  shot:    ShotLog       | null
  bean:    BeanProfile   | undefined
  grinder: GrinderConfig | undefined
  onClose: () => void
}

function fmtAdj(v: number): string { return (v >= 0 ? '+' : '') + v.toFixed(2) }
function adjCls(v: number): string  { return v > 0.01 ? 'text-[#ffb080]' : v < -0.01 ? 'text-[#90c8ff]' : 'text-[var(--muted)]' }

function fmtDateLabel(iso: string): string {
  const d    = new Date(iso)
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

const FB_COLOR: Record<string, string> = {
  perfect: 'text-[var(--green)]',
  under:   'text-[var(--blue)]',
  over:    'text-[var(--red)]',
}
const FB_LABEL: Record<string, string> = { perfect: 'Perfect', under: 'Under', over: 'Over' }

export function DetailDrawer({ shot, bean, grinder, onClose }: DetailDrawerProps) {
  if (!shot) return null

  const adjustments = bean && grinder
    ? calculateGrind(bean, grinder, shot.temp, shot.humidity).adjustments
    : null

  const grindStr = grinder
    ? fmtGrind(shot.recommendedGrind, grinder.grinderType)
    : shot.recommendedGrind.toFixed(1)

  return (
    <div
      className="fixed inset-0 bg-black/65 backdrop-blur-[8px] z-50 flex items-end justify-center"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[var(--card2)] border border-[var(--border2)] rounded-t-[22px] w-full max-w-3xl px-[22px] pt-5 pb-10 max-h-[80svh] overflow-y-auto [&::-webkit-scrollbar]:hidden">
        {/* Handle */}
        <div className="w-9 h-1 bg-[var(--border2)] rounded-full mx-auto mb-5" />

        {/* Grind hero */}
        <div className="text-center py-2 pb-5 border-b border-[var(--border)] mb-[18px]">
          <div className="text-[80px] font-black tracking-[-4px] leading-none text-white tabular-nums">
            {grindStr}
          </div>
          <div className="text-[13px] text-[var(--muted)] mt-[6px]">
            {grinder?.grinderType ?? '\u2014'} \u00B7 Grinder {grinder?.label ?? '\u2014'}
          </div>
        </div>

        {/* Bean name + timestamp */}
        <div className="text-[18px] font-extrabold text-white mb-1">{bean?.name ?? shot.beanId}</div>
        <div className="text-[13px] text-[var(--muted)] mb-5">
          {fmtDateLabel(shot.createdAt)} at {fmtTime(shot.createdAt)}
        </div>

        {/* Adjustment mini-gauges */}
        {adjustments && (
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { title: '🌡 Temp',     val: adjustments.dTemp     },
              { title: '💧 Humidity', val: adjustments.dHumidity },
              { title: '⚖️ Agtron',   val: adjustments.dAgtron   },
            ].map(g => (
              <div
                key={g.title}
                className="bg-[var(--card3)] border border-[var(--border)] rounded-[12px] px-[10px] py-3 text-center"
              >
                <div className="text-[10px] text-[var(--muted)] mb-1 font-semibold">{g.title}</div>
                <div className={`text-[18px] font-black tracking-[-0.5px] ${adjCls(g.val)}`}>
                  {fmtAdj(g.val)}
                </div>
                <div className="text-[9px] text-[var(--muted2)] mt-[2px]">adjustment</div>
              </div>
            ))}
          </div>
        )}

        {/* Detail rows */}
        {[
          { label: 'Grinder',     value: `Grinder ${grinder?.label ?? '\u2014'} (${grinder?.grinderType ?? '\u2014'})`,    extra: '' },
          { label: 'Temperature', value: `${shot.temp.toFixed(1)}\u00B0C`,                                                  extra: '' },
          { label: 'Humidity',    value: `${shot.humidity.toFixed(1)}%`,                                                     extra: '' },
          { label: 'Extraction',  value: shot.extractionTime != null ? `${shot.extractionTime}s` : '\u2014',                extra: '' },
          { label: 'Feedback',    value: FB_LABEL[shot.feedback] ?? shot.feedback,                                           extra: FB_COLOR[shot.feedback] ?? '' },
        ].map(row => (
          <div
            key={row.label}
            className="flex justify-between items-center py-3 border-b border-[var(--border)] last:border-b-0 text-[14px]"
          >
            <span className="text-[var(--muted)]">{row.label}</span>
            <span className={`font-bold text-white ${row.extra}`}>{row.value}</span>
          </div>
        ))}

        {/* Close */}
        <button
          onClick={onClose}
          className="w-full mt-4 bg-[var(--card3)] border border-[var(--border)] text-[var(--text)] text-[15px] font-semibold rounded-[12px] py-[14px] hover:bg-[var(--card2)] transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}

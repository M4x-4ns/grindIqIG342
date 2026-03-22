import type { ShotLog } from '@/types/shot'

interface StatsCardProps { shots: ShotLog[] }

function dayKey(d: Date): string { return d.toISOString().slice(0, 10) }

/** Deterministic bar height derived from numeric part of shot id */
function barH(id: string): number {
  const n = parseInt(id.replace(/\D/g, ''), 10) || 1
  return 10 + ((n * 7) % 22)
}

export function StatsCard({ shots }: StatsCardProps) {
  const today  = shots.filter(s => dayKey(new Date(s.createdAt)) === dayKey(new Date()))
  const total  = today.length
  const p      = today.filter(s => s.feedback === 'perfect').length
  const u      = today.filter(s => s.feedback === 'under').length
  const o      = today.filter(s => s.feedback === 'over').length
  const denom  = total || 1
  const pctStr = total ? `${Math.round((p / total) * 100)}%` : '—%'
  const last12 = shots.slice(0, 12)

  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div
      className="relative rounded-[var(--r-lg)] overflow-hidden px-[22px] py-5 shadow-[0_12px_40px_rgba(0,0,0,.55),0_0_0_1px_rgba(255,255,255,.06)]"
      style={{ background: 'linear-gradient(160deg,#cc2424 0%,#9a1818 55%,#6e1010 100%)' }}
    >
      {/* Glow blob */}
      <div
        className="absolute top-[-60px] right-[-60px] w-[280px] h-[280px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle,rgba(255,80,80,.16) 0%,transparent 70%)' }}
      />

      <div className="relative z-10">
        {/* Date label */}
        <div className="text-[11px] font-semibold text-white/50 uppercase tracking-[1px] mb-[2px]">
          {dateStr}
        </div>

        {/* Hero row */}
        <div className="flex items-end gap-4 mb-1">
          <div>
            <div className="text-[68px] font-black text-white tracking-[-3px] leading-none tabular-nums">
              {total}
            </div>
            <div className="text-[14px] text-white/55 font-medium">shots today</div>
          </div>
          <div className="ml-auto text-right pb-2">
            <div className="text-[32px] font-black text-white tracking-[-1px] leading-none tabular-nums">
              {pctStr}
            </div>
            <div className="text-[11px] text-white/45 font-medium mt-[2px]">perfect rate</div>
          </div>
        </div>

        {/* Feedback bar */}
        <div className="mb-4">
          <div className="h-[6px] bg-black/30 rounded-[3px] flex overflow-hidden gap-[2px] mb-2">
            <div
              className="bg-[rgba(34,197,94,.8)] rounded-l-[3px] transition-[width_.5s]"
              style={{ width: `${(p / denom) * 100}%` }}
            />
            <div
              className="bg-[rgba(96,165,250,.75)] transition-[width_.5s]"
              style={{ width: `${(u / denom) * 100}%` }}
            />
            <div
              className="bg-[rgba(255,100,100,.6)] rounded-r-[3px] transition-[width_.5s]"
              style={{ width: `${(o / denom) * 100}%` }}
            />
          </div>
          <div className="flex gap-[14px]">
            {[
              { color: 'rgba(34,197,94,.8)',    count: p, label: 'Perfect' },
              { color: 'rgba(96,165,250,.75)',  count: u, label: 'Under'   },
              { color: 'rgba(255,100,100,.6)',  count: o, label: 'Over'    },
            ].map(({ color, count, label }) => (
              <div key={label} className="flex items-center gap-[5px] text-[11px] text-white/55 font-semibold">
                <div className="w-2 h-2 rounded-[2px] flex-shrink-0" style={{ background: color }} />
                {count} {label}
              </div>
            ))}
          </div>
        </div>

        {/* Mini chart — last 12 shots */}
        <div className="flex items-end gap-[3px] h-9">
          {last12.map(s => (
            <div
              key={s.id}
              className={`flex-1 rounded-t-[2px] min-h-[5px] opacity-60
                ${s.feedback === 'perfect' ? 'bg-[rgba(34,197,94,.9)]'
                  : s.feedback === 'under' ? 'bg-[rgba(96,165,250,.9)]'
                  :                          'bg-[rgba(255,100,100,.9)]'}`}
              style={{ height: barH(s.id) }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

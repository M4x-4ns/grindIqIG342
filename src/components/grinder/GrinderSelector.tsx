import { useAppStore } from '@/store/useAppStore'
import { calculateGrind } from '@/utils/grindCalculator'
import { Badge } from '@/components/ui/Badge'

const CHART_BARS = [28, 34, 22, 40, 30, 44, 32, 38, 36, 42, 30, 48, 34, 40, 36, 46]

function fmt(v: number): string {
  return (v >= 0 ? '+' : '') + v.toFixed(2)
}

export function GrinderSelector() {
  const { grinders, selectedGrinder, selectedBean, sensor, setSelectedGrinder } = useAppStore()

  const temp     = sensor.reading?.temperature ?? 25
  const humidity = sensor.reading?.humidity    ?? 60

  const result =
    selectedGrinder && selectedBean
      ? calculateGrind(selectedBean, selectedGrinder, temp, humidity)
      : null

  return (
    <div
      className="relative rounded-[22px] overflow-hidden p-5 shadow-[0_12px_40px_rgba(0,0,0,.55),0_0_0_1px_rgba(255,255,255,.06)]"
      style={{ background: 'linear-gradient(160deg,#cc2424 0%,#9a1818 55%,#6e1010 100%)' }}
    >
      {/* Glow blob */}
      <div
        className="absolute top-[-60px] right-[-60px] w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle,rgba(255,100,100,.18) 0%,transparent 70%)' }}
      />

      {/* Grinder tabs — read from store */}
      <div className="relative z-10 flex gap-2 mb-[18px]">
        {grinders.map(grinder => {
          const isActive = selectedGrinder?.id === grinder.id
          return (
            <button
              key={grinder.id}
              onClick={() => setSelectedGrinder(grinder)}
              className={`flex-1 rounded-[10px] py-[10px] px-2 text-center transition-all duration-[180ms] select-none
                ${isActive
                  ? 'bg-white/[.18] border border-white/30 shadow-[0_2px_10px_rgba(0,0,0,.3)]'
                  : 'bg-black/25 border border-white/10 hover:bg-black/35'
                }`}
            >
              <div className={`text-[22px] font-black leading-none mb-[3px] ${isActive ? 'text-white' : 'text-white/90'}`}>
                {grinder.label}
              </div>
              <div className={`text-[10px] font-bold uppercase tracking-[.4px] ${isActive ? 'text-white/80' : 'text-white/55'}`}>
                {grinder.roastLevel.charAt(0).toUpperCase() + grinder.roastLevel.slice(1)}
              </div>

            </button>
          )
        })}
      </div>

      {/* Label row */}
      <div className="relative z-10 flex items-center justify-between mb-[2px]">
        <div className="text-[12px] font-semibold text-white/55 uppercase tracking-[1px]">
          Grind Setting
        </div>
        <div className="flex items-center gap-[5px] text-[11px] text-white/40">
          <div className="w-[6px] h-[6px] rounded-full bg-white/50 animate-pulse" />
          Live
        </div>
      </div>

      {/* Big number or empty state */}
      {result ? (
        <div className="relative z-10 text-[96px] font-black text-white tracking-[-5px] leading-none mb-1 tabular-nums">
          {result.displayValue}
        </div>
      ) : (
        <div className="relative z-10 text-[18px] font-semibold text-white/40 py-10 text-center">
          Select a grinder to get a recommendation
        </div>
      )}

      {result && selectedGrinder && selectedBean && (
        <>
          {/* Meta row */}
          <div className="relative z-10 flex items-center gap-2 text-[13px] text-white/50 mb-[18px]">
            <span>
              {selectedGrinder.grinderType.charAt(0).toUpperCase() + selectedGrinder.grinderType.slice(1)}
            </span>
            <span className="bg-white/[.12] rounded-full px-2 py-[2px] text-[11px] font-semibold text-white/70">
              Grinder {selectedGrinder.label}
            </span>
            <span className="text-white/30">
              Baseline {selectedBean.baselineGrinds[selectedGrinder.id]?.toFixed(1) ?? selectedGrinder.baselineGrind.toFixed(1)}
            </span>
          </div>

          {/* Decorative bar chart */}
          <div className="relative z-10 flex items-end gap-[3px] h-12 mb-[14px] opacity-70">
            {CHART_BARS.map((h, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t-[3px] min-h-[6px]
                  ${i === 15 ? 'bg-white/85' : i >= 12 ? 'bg-white/60' : 'bg-white/20'}`}
                style={{ height: h }}
              />
            ))}
          </div>

          {/* Adjustment chips */}
          <div className="relative z-10 flex items-center gap-2 flex-wrap">
            <Badge
              icon="🌡"
              value={fmt(result.adjustments.dTemp)}
              variant={result.adjustments.dTemp > 0.02 ? 'pos' : result.adjustments.dTemp < -0.02 ? 'neg' : 'zero'}
            />
            <Badge
              icon="💧"
              value={fmt(result.adjustments.dHumidity)}
              variant={result.adjustments.dHumidity > 0.02 ? 'pos' : result.adjustments.dHumidity < -0.02 ? 'neg' : 'zero'}
            />
            <Badge
              icon="⚖️"
              value={fmt(result.adjustments.dAgtron)}
              variant={result.adjustments.dAgtron > 0 ? 'pos' : result.adjustments.dAgtron < 0 ? 'neg' : 'zero'}
            />
            <div className="ml-auto bg-black/40 border border-white/[.18] rounded-full px-3 py-[5px] text-xs font-extrabold text-white">
              {fmt(result.adjustments.dTemp + result.adjustments.dHumidity + result.adjustments.dAgtron)}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

import { useAppStore } from '@/store/useAppStore'
import { useSensor } from '@/hooks/useSensor'
import { calculateGrind } from '@/utils/grindCalculator'
import { GrinderSelector } from '@/components/grinder/GrinderSelector'
import { GrindRecommendation } from '@/components/calculator/GrindRecommendation'
import { ShotFeedback } from '@/components/feedback/ShotFeedback'
import type { BeanProfile } from '@/types/bean'

const ROAST_EMOJI: Record<string, string> = {
  light: '☀',
  medium: '⛅',
  dark: '🌑',
  'very-dark': '🌑',
}

const AGTRON_CLS = (roastLevel: string): string => {
  if (roastLevel === 'light')  return 'bg-[rgba(251,191,36,.12)] text-[#fbbf24] border-[rgba(251,191,36,.2)]'
  if (roastLevel === 'medium') return 'bg-[rgba(180,110,60,.15)] text-[#d4845a] border-[rgba(180,110,60,.2)]'
  return 'bg-[rgba(100,60,20,.2)] text-[#a0663c] border-[rgba(100,60,20,.3)]'
}

function BeanCard({ bean }: { bean: BeanProfile }) {
  const { selectedBean, selectedGrinder, sensor, grinders, setSelectedBean } = useAppStore()
  const isSelected = selectedBean?.id === bean.id

  const temp     = sensor.reading?.temperature ?? 25
  const humidity = sensor.reading?.humidity    ?? 60

  // Show live calculation when a grinder is selected; fall back to the bean's
  // baseline for the first grinder in the store (or '—' if store is empty).
  const grindDisplay = selectedGrinder
    ? calculateGrind(bean, selectedGrinder, temp, humidity).displayValue
    : bean.baselineGrinds[grinders[0]?.id ?? '']?.toString() ?? '—'

  function handleSelect() {
    // Tapping a bean sets selectedBean only — grinder selection is unaffected.
    setSelectedBean(bean)
  }

  return (
    <button
      onClick={handleSelect}
      className={`relative bg-[var(--card)] border-[1.5px] rounded-[var(--r)] p-4 text-left transition-all duration-[180ms] overflow-hidden select-none w-full
        ${isSelected
          ? 'border-[var(--red)] bg-[var(--card2)] shadow-[0_0_0_1px_var(--red),0_8px_24px_rgba(0,0,0,.4)]'
          : 'border-[var(--border)] hover:border-[var(--border2)] hover:bg-[var(--card2)]'
        }`}
    >
      {/* Top row */}
      <div className="flex items-center justify-between mb-[10px]">
        <div
          className={`w-9 h-9 rounded-[10px] flex items-center justify-center text-[18px] border border-[var(--border2)] flex-shrink-0
            ${isSelected ? 'bg-[var(--red-soft)] border-[rgba(204,36,36,.3)]' : 'bg-[var(--card3)]'}`}
        >
          🫘
        </div>
        <div className="flex flex-col items-end gap-[3px]">
          <span className={`text-[10px] font-bold uppercase tracking-[.4px] ${isSelected ? 'text-[#ff8080]' : 'text-[var(--muted)]'}`}>
            {bean.isActive ? 'Active ●' : 'Baseline'}
          </span>
          <span className="text-[10px] text-[var(--muted2)]">Agt {bean.agtron}</span>
        </div>
      </div>

      <div className="text-[13px] font-bold leading-[1.2] mb-[2px] truncate text-white">
        {bean.name}
      </div>
      <div className="text-[10px] text-[var(--muted)] mb-[10px]">
        {bean.origin} · {bean.roastLevel.charAt(0).toUpperCase() + bean.roastLevel.slice(1)}
      </div>

      <div className={`text-[30px] font-black tracking-[-1px] leading-none tabular-nums ${isSelected ? 'text-white' : 'text-[var(--text)]'}`}>
        {grindDisplay}
      </div>
      {selectedGrinder && (
        <div className="text-[10px] text-[var(--muted)] mt-[2px]">
          {selectedGrinder.grinderType} · grinder {selectedGrinder.label}
        </div>
      )}

      <div className={`inline-flex items-center gap-[3px] text-[10px] font-bold px-[7px] py-[2px] rounded-full border mt-1 ${AGTRON_CLS(bean.roastLevel)}`}>
        {ROAST_EMOJI[bean.roastLevel]} {bean.roastLevel.charAt(0).toUpperCase() + bean.roastLevel.slice(1)} · Agt {bean.agtron}
      </div>
    </button>
  )
}

/**
 * PRD §F-01, F-02, F-03, F-04
 * Primary barista screen — grinder selection, grind recommendation, sensor status, shot feedback.
 */
export default function Dashboard() {
  useSensor()

  const { beans, selectedBean } = useAppStore()

  if (!selectedBean) return null

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-3xl mx-auto flex flex-col gap-[14px] px-4 pt-4 pb-[224px]">
        <GrinderSelector />
        <GrindRecommendation />
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[1px] text-[var(--muted)] mb-[10px]">
            Beans
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>
          <div className="grid grid-cols-2 gap-[10px]">
            {beans.map(bean => (
              <BeanCard key={bean.id} bean={bean} />
            ))}
          </div>
        </div>
      </div>
      <ShotFeedback />
    </div>
  )
}

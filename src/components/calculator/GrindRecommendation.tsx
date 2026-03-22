import { useAppStore } from '@/store/useAppStore'
import { calculateGrind } from '@/utils/grindCalculator'

interface GaugeArcProps {
  pct: number
  gradientId: string
  gradientColors: [string, string]
}

function GaugeArc({ pct, gradientId, gradientColors }: GaugeArcProps) {
  const dasharray = 119.4
  const dashoffset = dasharray * (1 - Math.min(Math.max(pct, 0), 1))
  return (
    <svg viewBox="0 0 100 56" width="90" height="50" className="block mx-auto overflow-visible">
      <path
        d="M12 52 A38 38 0 0 1 88 52"
        fill="none" stroke="#2a2a30" strokeWidth="9" strokeLinecap="round"
      />
      <path
        d="M12 52 A38 38 0 0 1 88 52"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={dasharray}
        strokeDashoffset={dashoffset}
      />
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor={gradientColors[0]} />
          <stop offset="100%" stopColor={gradientColors[1]} />
        </linearGradient>
      </defs>
    </svg>
  )
}

function valueColor(v: number): string {
  if (v > 0.02)  return 'text-[#ffb080]'
  if (v < -0.02) return 'text-[#90c8ff]'
  return 'text-[var(--muted)]'
}

export function GrindRecommendation() {
  const { selectedGrinder, selectedBean, sensor } = useAppStore()

  if (!selectedGrinder || !selectedBean) return null

  const temp     = sensor.reading?.temperature ?? 25
  const humidity = sensor.reading?.humidity    ?? 60
  const { adjustments } = calculateGrind(selectedBean, selectedGrinder, temp, humidity)

  const fmt = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(2)

  const gauges = [
    {
      title: '🌡 Temperature',
      sub: `${temp >= selectedBean.baselineTemp ? '+' : ''}${(temp - selectedBean.baselineTemp).toFixed(1)}°C from baseline`,
      pct: 0.5 + adjustments.dTemp / 0.5,
      gradientId: 'gTemp',
      gradientColors: ['#ff8050', '#ffb080'] as [string, string],
      value: fmt(adjustments.dTemp),
      valueClass: valueColor(adjustments.dTemp),
    },
    {
      title: '💧 Humidity',
      sub: `${humidity >= selectedBean.baselineHumidity ? '+' : ''}${(humidity - selectedBean.baselineHumidity).toFixed(1)}% from baseline`,
      pct: 0.5 + adjustments.dHumidity / 0.25,
      gradientId: 'gHum',
      gradientColors: ['#60a5fa', '#93c5fd'] as [string, string],
      value: fmt(adjustments.dHumidity),
      valueClass: valueColor(adjustments.dHumidity),
    },
    {
      title: '⚖️ Agtron',
      sub: `Agtron ${selectedBean.agtron} — ${selectedBean.agtron >= 65 ? 'Light → −0.5' : selectedBean.agtron <= 45 ? 'Dark → +0.5' : 'neutral'}`,
      pct: adjustments.dAgtron === -0.5 ? 0.15 : adjustments.dAgtron === 0.5 ? 0.85 : 0.5,
      gradientId: 'gAgt',
      gradientColors: ['#a259ff', '#c084fc'] as [string, string],
      value: fmt(adjustments.dAgtron),
      valueClass: valueColor(adjustments.dAgtron),
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-[10px]">
      {gauges.map(g => (
        <div
          key={g.gradientId}
          className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--r)] p-4 text-center hover:border-[var(--border2)] transition-colors"
        >
          <div className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-[.8px] mb-[2px]">
            {g.title}
          </div>
          <div className="text-[10px] text-[var(--muted2)] mb-[10px]">{g.sub}</div>
          <GaugeArc pct={g.pct} gradientId={g.gradientId} gradientColors={g.gradientColors} />
          <div className={`text-[22px] font-black tracking-[-0.5px] leading-none mt-[6px] tabular-nums ${g.valueClass}`}>
            {g.value}
          </div>
          <div className="text-[10px] text-[var(--muted)] mt-[3px]">adjustment</div>
        </div>
      ))}
    </div>
  )
}

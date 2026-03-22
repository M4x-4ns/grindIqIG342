# Dashboard Frontend Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the GrindIQ Dashboard page — grinder selector, grind recommendation, adjustment gauges, bean selector, sensor status, and shot feedback — as isolated React components wired to Zustand, using the HTML mockup's design language.

**Architecture:** Fill existing component slot structure (`grinder/`, `calculator/`, `sensor/`, `feedback/`, `ui/`). Mock seed data is loaded into Zustand on Dashboard mount. Sensor is already mocked via `VITE_DEV_SENSOR_BYPASS=true`. No new test files (core logic is covered by `grindCalculator.test.ts`). Phase 2 page stubs (`ShotLog.tsx`, `BeanProfiles.tsx`) already exist as skeletons — no need to create them.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v3 (arbitrary values + CSS vars), Zustand 5, `calculateGrind` from existing `utils/grindCalculator.ts`.

---

## Chunk 1: Foundation

### Task 1: Add design tokens to `src/index.css`

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Replace the entire contents of `src/index.css` with the following**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg:        #0c0c0e;
  --bg2:       #111113;
  --card:      #161618;
  --card2:     #1c1c1f;
  --card3:     #202024;
  --border:    rgba(255,255,255,0.06);
  --border2:   rgba(255,255,255,0.10);
  --red:       #cc2424;
  --red2:      #a81c1c;
  --red-glow:  rgba(204,36,36,0.35);
  --red-soft:  rgba(204,36,36,0.14);
  --green:     #22c55e;
  --blue:      #60a5fa;
  --text:      #e4e4ea;
  --muted:     #7a7a8c;
  --muted2:    #4e4e5e;
  --r:         16px;
  --r-sm:      10px;
  --r-lg:      22px;
}

@layer base {
  html { font-size: 16px; }
  body {
    @apply antialiased;
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, 'SF Pro Display', 'Inter', 'Segoe UI', sans-serif;
    -webkit-font-smoothing: antialiased;
    overscroll-behavior: none;
  }
}

@keyframes sensor-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(34,197,94,.6); }
  70%  { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
  100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
}
```

- [ ] **Step 2: Start dev server and confirm dark background**

```bash
npm run dev
```
Expected: page background is `#0c0c0e` (very dark, near black), not the old `bg-gray-950`.

---

### Task 2: Create `src/data/mockData.ts`

**Files:**
- Create: `src/data/mockData.ts` (new directory `src/data/` will be created by the file write)

- [ ] **Step 1: Create the file**

```ts
import type { GrinderConfig } from '@/types/grinder'
import type { BeanProfile } from '@/types/bean'

export const MOCK_GRINDERS: GrinderConfig[] = [
  {
    id: 'grinder-a',
    label: 'A',
    roastLevel: 'light',
    grinderType: 'stepped',
    baselineGrind: 18,
    tempCoefficient: 0.15,
    humidityCoefficient: 0.05,
    isActive: true,
  },
  {
    id: 'grinder-b',
    label: 'B',
    roastLevel: 'medium',
    grinderType: 'stepless',
    baselineGrind: 22,
    tempCoefficient: 0.15,
    humidityCoefficient: 0.05,
    isActive: true,
  },
  {
    id: 'grinder-c',
    label: 'C',
    roastLevel: 'dark',
    grinderType: 'stepped',
    baselineGrind: 24,
    tempCoefficient: 0.15,
    humidityCoefficient: 0.05,
    isActive: true,
  },
]

export const MOCK_BEANS: BeanProfile[] = [
  {
    id: 'bean-1',
    name: 'Ethiopia Yirgacheffe',
    origin: 'Ethiopia',
    agtron: 78,
    roastLevel: 'light',
    grinderId: 'grinder-a',
    baselineGrind: 18,
    baselineTemp: 25,
    baselineHumidity: 60,
    isActive: false,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'bean-2',
    name: 'Colombia Huila',
    origin: 'Colombia',
    agtron: 58,
    roastLevel: 'medium',
    grinderId: 'grinder-b',
    baselineGrind: 22,
    baselineTemp: 25,
    baselineHumidity: 60,
    isActive: true,
    createdAt: '2026-01-02T00:00:00Z',
  },
  {
    id: 'bean-3',
    name: 'Sumatra Mandheling',
    origin: 'Indonesia',
    agtron: 40,
    roastLevel: 'dark',
    grinderId: 'grinder-c',
    baselineGrind: 24,
    baselineTemp: 25,
    baselineHumidity: 60,
    isActive: false,
    createdAt: '2026-01-03T00:00:00Z',
  },
  {
    id: 'bean-4',
    name: 'Kenya AA Kirinyaga',
    origin: 'Kenya',
    agtron: 70,
    roastLevel: 'light',
    grinderId: 'grinder-b',
    baselineGrind: 19.5,
    baselineTemp: 25,
    baselineHumidity: 60,
    isActive: false,
    createdAt: '2026-01-04T00:00:00Z',
  },
]
```

- [ ] **Step 2: Run TypeScript check**

```bash
npm run typecheck
```
Expected: no errors.

---

### Task 3: Fix `setSelectedGrinder` in `src/store/useAppStore.ts`

**Files:**
- Modify: `src/store/useAppStore.ts`

The current action resets `selectedBean` to null whenever the grinder changes. This breaks grind calculation when the user taps grinder tabs while a bean is already selected.

- [ ] **Step 1: Change the `setSelectedGrinder` action**

Find:
```ts
setSelectedGrinder: (grinder) => set({ selectedGrinder: grinder, selectedBean: null }),
```

Replace with:
```ts
setSelectedGrinder: (grinder) => set({ selectedGrinder: grinder }),
```

- [ ] **Step 2: Run TypeScript check**

```bash
npm run typecheck
```
Expected: no errors.

---

### Task 4: Create `src/components/ui/Badge.tsx`

Used by `GrinderSelector` for the adjustment chips (🌡 +0.42, 💧 +0.21, ⚖️ 0.00).

**Files:**
- Create: `src/components/ui/Badge.tsx`
- Modify: `src/components/ui/index.ts`

- [ ] **Step 1: Create Badge component**

```tsx
interface BadgeProps {
  icon: string
  value: string
  variant: 'pos' | 'neg' | 'zero'
}

const variantStyles: Record<BadgeProps['variant'], string> = {
  pos:  'border-[rgba(255,160,100,.3)] text-[#ffb080]',
  neg:  'border-[rgba(100,180,255,.3)] text-[#90c8ff]',
  zero: 'text-white/40',
}

export function Badge({ icon, value, variant }: BadgeProps) {
  return (
    <div
      className={`flex items-center gap-[5px] bg-black/30 border border-white/10 rounded-full px-[10px] py-[5px] text-xs font-bold whitespace-nowrap ${variantStyles[variant]}`}
    >
      <span className="text-[11px]">{icon}</span>
      {value}
    </div>
  )
}
```

- [ ] **Step 2: Replace the contents of `src/components/ui/index.ts`**

```ts
export { Badge } from './Badge'
```

- [ ] **Step 3: Run TypeScript check**

```bash
npm run typecheck
```
Expected: no errors.

---

### Task 5: Commit Chunk 1

- [ ] **Step 1: Run full typecheck before committing**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 2: Stage and commit**

```bash
git add src/index.css src/data/mockData.ts src/store/useAppStore.ts src/components/ui/Badge.tsx src/components/ui/index.ts
git commit -m "feat: add design tokens, mock data, Badge component, fix grinder store action"
```

---

## Chunk 2: Feature Components

### Task 6: Create `src/components/grinder/GrinderSelector.tsx`

The main red gradient card. Contains grinder A/B/C tabs (sourced from the Zustand `grinders` array), big grind number, meta row, decorative bar chart, and adjustment chips.

**Files:**
- Create: `src/components/grinder/GrinderSelector.tsx`
- Modify: `src/components/grinder/index.ts`

- [ ] **Step 1: Create the component**

```tsx
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

      {/* Grinder tabs — read from store, not from mock data directly */}
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
              <div className={`text-[9px] mt-[1px] ${isActive ? 'text-white/55' : 'text-white/35'}`}>
                {grinder.grinderType.charAt(0).toUpperCase() + grinder.grinderType.slice(1)}
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
              Baseline {selectedBean.baselineGrind.toFixed(1)}
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
```

- [ ] **Step 2: Replace the contents of `src/components/grinder/index.ts`**

```ts
export { GrinderSelector } from './GrinderSelector'
```

- [ ] **Step 3: Run TypeScript check**

```bash
npm run typecheck
```
Expected: no errors.

---

### Task 7: Create `src/components/calculator/GrindRecommendation.tsx`

Three-column gauge row for temperature, humidity, and agtron adjustments with SVG arc gauges. Returns `null` if no grinder or bean is selected.

**Files:**
- Create: `src/components/calculator/GrindRecommendation.tsx`
- Modify: `src/components/calculator/index.ts`

- [ ] **Step 1: Create the component**

```tsx
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
```

- [ ] **Step 2: Replace the contents of `src/components/calculator/index.ts`**

```ts
export { GrindRecommendation } from './GrindRecommendation'
```

- [ ] **Step 3: Run TypeScript check**

```bash
npm run typecheck
```
Expected: no errors.

---

### Task 8: Create `src/components/sensor/SensorStatus.tsx`

A compact pill button (for use in the app header). On click, opens a bottom-sheet modal with full sensor readings and a manual override form. Handles three states: connected, disconnected, and loading (skeleton).

**Files:**
- Create: `src/components/sensor/SensorStatus.tsx`
- Modify: `src/components/sensor/index.ts`

- [ ] **Step 1: Create the component**

```tsx
import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'

export function SensorStatus() {
  const { sensor, setSensor } = useAppStore()
  const [open, setOpen]             = useState(false)
  const [manualTemp, setManualTemp]  = useState('')
  const [manualHum,  setManualHum]   = useState('')

  const isLoading     = sensor.status === 'loading'
  const isConnected   = sensor.status === 'connected'
  const temp = sensor.reading?.temperature
  const hum  = sensor.reading?.humidity

  function applyManual() {
    const t = parseFloat(manualTemp)
    const h = parseFloat(manualHum)
    if (!isNaN(t) && !isNaN(h)) {
      setSensor({
        status: 'connected',
        reading: { temperature: t, humidity: h, timestamp: new Date().toISOString() },
        lastUpdated: new Date().toISOString(),
        isManualOverride: true,
      })
      setOpen(false)
      setManualTemp('')
      setManualHum('')
    }
  }

  return (
    <>
      {/* Compact pill for header */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-[9px] bg-[var(--card2)] border border-[var(--border2)] rounded-full px-[14px] py-[8px] pl-[10px] hover:border-white/20 transition-colors"
      >
        {isLoading ? (
          <div className="w-[9px] h-[9px] rounded-full bg-[var(--muted)] animate-pulse" />
        ) : (
          <div
            className={`w-[9px] h-[9px] rounded-full flex-shrink-0 ${isConnected ? 'bg-[var(--green)]' : 'bg-[var(--red)]'}`}
            style={isConnected ? { animation: 'sensor-pulse 2.2s infinite' } : {}}
          />
        )}
        <div className="flex flex-col text-left">
          {isLoading ? (
            <span className="text-[13px] font-bold text-[var(--muted)] leading-none animate-pulse">
              Loading…
            </span>
          ) : (
            <span className="text-[13px] font-bold text-white leading-none">
              {isConnected && temp != null && hum != null
                ? `${temp.toFixed(1)}°C · ${Math.round(hum)}%`
                : 'Disconnected'}
            </span>
          )}
          <span className="text-[10px] text-[var(--muted)] mt-[2px]">
            {sensor.isManualOverride ? 'Manual' : 'ESP32 · Live'}
          </span>
        </div>
      </button>

      {/* Bottom-sheet modal */}
      {open && (
        <div
          className="fixed inset-0 bg-black/65 backdrop-blur-[6px] z-50 flex items-end justify-center"
          onClick={e => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="bg-[var(--card2)] border border-[var(--border2)] rounded-t-[22px] w-full max-w-3xl px-[22px] pt-5 pb-9 max-h-[70vh] overflow-y-auto">
            <div className="w-9 h-1 bg-[var(--border2)] rounded-full mx-auto mb-5" />
            <div className="text-[17px] font-extrabold text-white mb-[18px]">
              🌡 Sensor — ESP32 + DHT22
            </div>

            {isLoading ? (
              /* Loading skeleton */
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="border-b border-[var(--border)] py-[13px] flex justify-between">
                    <div className="h-4 w-24 bg-[var(--card3)] rounded animate-pulse" />
                    <div className="h-4 w-16 bg-[var(--card3)] rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              [
                { label: 'Status',      value: isConnected ? '● Connected' : '● Disconnected', color: isConnected ? 'text-[var(--green)]' : 'text-[var(--red)]' },
                { label: 'Temperature', value: temp != null ? `${temp.toFixed(1)}°C` : '—',     color: 'text-white' },
                { label: 'Humidity',    value: hum  != null ? `${hum.toFixed(1)}%`  : '—',      color: 'text-white' },
              ].map(row => (
                <div key={row.label} className="border-b border-[var(--border)] py-[13px] flex justify-between text-[15px] last:border-b-0">
                  <span className="text-[var(--muted)]">{row.label}</span>
                  <span className={`font-bold ${row.color}`}>{row.value}</span>
                </div>
              ))
            )}

            <div className="text-[11px] text-[var(--muted)] mt-[18px] mb-2">Manual override</div>
            <div className="flex gap-[10px]">
              <input
                type="number"
                placeholder="Temp °C"
                value={manualTemp}
                onChange={e => setManualTemp(e.target.value)}
                className="flex-1 bg-[var(--card3)] border border-[var(--border2)] rounded-[10px] px-[14px] py-3 text-white text-[15px] outline-none focus:border-[var(--red)] placeholder:text-[var(--muted2)]"
              />
              <input
                type="number"
                placeholder="Humidity %"
                value={manualHum}
                onChange={e => setManualHum(e.target.value)}
                className="flex-1 bg-[var(--card3)] border border-[var(--border2)] rounded-[10px] px-[14px] py-3 text-white text-[15px] outline-none focus:border-[var(--red)] placeholder:text-[var(--muted2)]"
              />
              <button
                onClick={applyManual}
                className="bg-[var(--red)] text-white font-extrabold text-[14px] rounded-[10px] px-[18px] py-3 hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                Set
              </button>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-full mt-3 bg-[var(--card3)] border border-[var(--border)] text-[var(--text)] text-[15px] font-semibold rounded-[12px] py-[14px]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Replace the contents of `src/components/sensor/index.ts`**

```ts
export { SensorStatus } from './SensorStatus'
```

- [ ] **Step 3: Run TypeScript check**

```bash
npm run typecheck
```
Expected: no errors.

---

### Task 9: Create `src/components/feedback/ShotFeedback.tsx`

Fixed bottom bar. Interaction is two-step: (1) tap a feedback button to select it, (2) tap the enabled "Log Shot" button to persist the shot. Toast shows for 2.2 s then resets.

**Files:**
- Create: `src/components/feedback/ShotFeedback.tsx`
- Modify: `src/components/feedback/index.ts`

- [ ] **Step 1: Create the component**

```tsx
import { useState, useCallback, useEffect, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { calculateGrind } from '@/utils/grindCalculator'
import type { ShotFeedback as FeedbackType } from '@/types/shot'

const BUTTONS = [
  {
    type:       'under' as FeedbackType,
    icon:       '◀◀',
    label:      'Under',
    sub:        'Too coarse',
    defaultCls: 'bg-[rgba(96,165,250,.08)] border-[rgba(96,165,250,.2)] hover:bg-[rgba(96,165,250,.14)] hover:border-[rgba(96,165,250,.35)]',
    activeCls:  'bg-[var(--blue)] border-[var(--blue)]',
    labelColor: 'text-[var(--blue)]',
  },
  {
    type:       'perfect' as FeedbackType,
    icon:       '✓',
    label:      'Perfect',
    sub:        'Perfect Shot!',
    defaultCls: 'bg-[rgba(34,197,94,.08)] border-[rgba(34,197,94,.2)] hover:bg-[rgba(34,197,94,.14)] hover:border-[rgba(34,197,94,.35)]',
    activeCls:  'bg-[var(--green)] border-[var(--green)]',
    labelColor: 'text-[var(--green)]',
  },
  {
    type:       'over' as FeedbackType,
    icon:       '▶▶',
    label:      'Over',
    sub:        'Too fine',
    defaultCls: 'bg-[rgba(204,36,36,.08)] border-[rgba(204,36,36,.2)] hover:bg-[rgba(204,36,36,.14)] hover:border-[rgba(204,36,36,.35)]',
    activeCls:  'bg-[var(--red)] border-[var(--red)] shadow-[0_0_16px_var(--red-glow)]',
    labelColor: 'text-[var(--red)]',
  },
] as const

const TOAST_MSGS: Record<FeedbackType, string> = {
  under:   '◀◀ Shot logged — Under Extracted',
  perfect: '✓ Shot logged — Perfect Shot! 🎉',
  over:    '▶▶ Shot logged — Over Extracted',
}

export function ShotFeedback() {
  const { selectedGrinder, selectedBean, sensor, addShot } = useAppStore()
  const [selected, setSelected] = useState<FeedbackType | null>(null)
  const [toast,    setToast]    = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup timer on unmount to avoid state updates on unmounted component
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const handleLogShot = useCallback(() => {
    if (!selected || !selectedGrinder || !selectedBean) return

    const temp     = sensor.reading?.temperature ?? 25
    const humidity = sensor.reading?.humidity    ?? 60
    const result   = calculateGrind(selectedBean, selectedGrinder, temp, humidity)

    addShot({
      id:               crypto.randomUUID(),
      beanId:           selectedBean.id,
      grinderId:        selectedGrinder.id,
      recommendedGrind: result.finalGrind,
      actualGrind:      result.finalGrind,
      temp,
      humidity,
      feedback:         selected,
      createdAt:        new Date().toISOString(),
    })

    setToast(TOAST_MSGS[selected])
    timerRef.current = setTimeout(() => {
      setToast(null)
      setSelected(null)
    }, 2200)
  }, [selected, selectedGrinder, selectedBean, sensor, addShot])

  return (
    <>
      {/* Toast */}
      <div
        className={`fixed bottom-[148px] left-1/2 -translate-x-1/2 bg-[var(--card2)] border border-[var(--border2)] rounded-full px-[22px] py-[10px] text-[13px] font-semibold text-[var(--text)] whitespace-nowrap pointer-events-none z-[100] shadow-[0_6px_24px_rgba(0,0,0,.5)] transition-all duration-[250ms]
          ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
      >
        {toast}
      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl bg-[rgba(12,12,14,.9)] backdrop-blur-[20px] border-t border-[var(--border2)] px-4 pt-3 pb-6 z-30">
        <div className="text-[10px] font-bold uppercase tracking-[1px] text-[var(--muted)] text-center mb-[10px]">
          Shot Result — Log after brew
        </div>

        {/* Step 1: select feedback */}
        <div className="grid grid-cols-[1fr_1.25fr_1fr] gap-[10px] mb-[10px]">
          {BUTTONS.map(btn => {
            const isActive = selected === btn.type
            return (
              <button
                key={btn.type}
                onClick={() => setSelected(prev => prev === btn.type ? null : btn.type)}
                className={`flex flex-col items-center justify-center gap-[3px] py-[14px] px-2 rounded-[var(--r)] border-[1.5px] transition-all duration-[150ms] active:scale-[.96] select-none
                  ${isActive ? btn.activeCls : btn.defaultCls}`}
              >
                <span className="text-[20px] leading-none">{btn.icon}</span>
                <span className={`text-[14px] font-extrabold tracking-[-0.2px] ${isActive ? 'text-black' : btn.labelColor}`}>
                  {btn.label}
                </span>
                <span className={`text-[10px] font-medium ${isActive ? 'text-black/60' : 'text-[var(--muted)]'}`}>
                  {btn.sub}
                </span>
              </button>
            )
          })}
        </div>

        {/* Step 2: log shot (disabled until selection made) */}
        <button
          onClick={handleLogShot}
          disabled={!selected}
          className={`w-full py-[14px] rounded-[var(--r)] font-extrabold text-[15px] transition-all duration-[150ms] active:scale-[.99]
            ${selected
              ? 'bg-[var(--red)] text-white hover:opacity-90 shadow-[0_4px_20px_var(--red-glow)]'
              : 'bg-[var(--card3)] text-[var(--muted2)] cursor-not-allowed'
            }`}
        >
          Log Shot
        </button>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Replace the contents of `src/components/feedback/index.ts`**

```ts
export { ShotFeedback } from './ShotFeedback'
```

- [ ] **Step 3: Run TypeScript check**

```bash
npm run typecheck
```
Expected: no errors.

---

### Task 10: Commit Chunk 2

- [ ] **Step 1: Run typecheck and build before committing**

```bash
npm run typecheck && npm run build
```
Expected: both pass with no errors.

- [ ] **Step 2: Stage and commit**

```bash
git add src/components/grinder/ src/components/calculator/ src/components/sensor/ src/components/feedback/
git commit -m "feat: implement GrinderSelector, GrindRecommendation, SensorStatus, ShotFeedback components"
```

---

## Chunk 3: Dashboard Assembly

### Task 11: Rewrite `src/pages/Dashboard.tsx`

Composes all four components plus an inline bean selector grid. Loads mock data into Zustand on first mount and starts `useSensor` polling.

> `ShotLog.tsx` and `BeanProfiles.tsx` already exist as skeleton stubs — no need to create them.

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Replace the skeleton with the full implementation**

Note: `calculateGrind` is imported at the top level — no dynamic `require()`.

```tsx
import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { MOCK_GRINDERS, MOCK_BEANS } from '@/data/mockData'
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
  const { selectedBean, selectedGrinder, sensor, grinders } = useAppStore()
  const isSelected = selectedBean?.id === bean.id

  // Use the currently selected grinder for the live grind display; fall back to
  // the bean's assigned grinder when no grinder is selected yet.
  const grinder =
    selectedGrinder ??
    grinders.find(g => g.id === bean.grinderId) ??
    null

  const temp     = sensor.reading?.temperature ?? 25
  const humidity = sensor.reading?.humidity    ?? 60

  const grindDisplay = grinder
    ? calculateGrind(bean, grinder, temp, humidity).displayValue
    : bean.baselineGrind.toString()

  const assignedGrinder = grinders.find(g => g.id === bean.grinderId)

  function handleSelect() {
    // Set both bean and its assigned grinder atomically to avoid the
    // setSelectedGrinder side-effect of clearing selectedBean.
    useAppStore.setState({
      selectedBean: bean,
      selectedGrinder: assignedGrinder ?? selectedGrinder,
    })
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
      <div className="text-[10px] text-[var(--muted)] mt-[2px]">
        {assignedGrinder?.grinderType} · grinder {assignedGrinder?.label}
      </div>

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

  const { setGrinders, setBeans, selectedBean } = useAppStore()

  useEffect(() => {
    setGrinders(MOCK_GRINDERS)
    setBeans(MOCK_BEANS)
    const activeBean    = MOCK_BEANS.find(b => b.isActive) ?? MOCK_BEANS[0]
    const activeGrinder = MOCK_GRINDERS.find(g => g.id === activeBean.grinderId) ?? MOCK_GRINDERS[0]
    useAppStore.setState({ selectedBean: activeBean, selectedGrinder: activeGrinder })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!selectedBean) return null

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Scrollable body — bottom padding clears the fixed feedback bar */}
      <div className="max-w-3xl mx-auto flex flex-col gap-[14px] px-4 pt-4 pb-[160px]">

        {/* ① Grinder selector + grind number */}
        <GrinderSelector />

        {/* ② Adjustment gauges */}
        <GrindRecommendation />

        {/* ③ Bean selector */}
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[1px] text-[var(--muted)] mb-[10px]">
            Beans
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>
          <div className="grid grid-cols-2 gap-[10px]">
            {MOCK_BEANS.map(bean => (
              <BeanCard key={bean.id} bean={bean} />
            ))}
          </div>
        </div>

      </div>

      {/* Fixed feedback bar */}
      <ShotFeedback />
    </div>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npm run typecheck
```
Expected: no errors.

---

### Task 12: Update `src/App.tsx`

Replace the plain link-based nav with the mockup's sticky header: logo + tab switcher + `SensorStatus` pill. `ShotLog` and `BeanProfiles` skeleton stubs already exist in `src/pages/`.

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace `src/App.tsx` entirely**

```tsx
import { NavLink, Outlet, createBrowserRouter, RouterProvider } from 'react-router-dom'
import { SensorStatus } from '@/components/sensor/SensorStatus'
import Dashboard from '@/pages/Dashboard'
import ShotLog from '@/pages/ShotLog'
import BeanProfiles from '@/pages/BeanProfiles'

function AppShell() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Sticky header */}
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-5 py-[14px] border-b border-[var(--border)]"
        style={{
          background: 'rgba(12,12,14,0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-[9px]">
          <div
            className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center text-[18px]"
            style={{
              background: 'linear-gradient(145deg,var(--red),var(--red2))',
              boxShadow: '0 2px 12px var(--red-glow)',
            }}
          >
            ☕
          </div>
          <div>
            <div className="text-[19px] font-black tracking-[-0.5px] text-white">GrindIQ</div>
            <div className="text-[10px] text-[var(--muted)] font-medium tracking-[.3px]">Grind Calculator</div>
          </div>
        </div>

        {/* Tab nav + sensor pill */}
        <div className="flex items-center gap-[10px]">
          <div className="flex bg-[var(--card2)] border border-[var(--border2)] rounded-[10px] p-[3px] gap-[2px]">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-[14px] py-[6px] rounded-[7px] text-[12px] font-bold transition-colors
                ${isActive ? 'bg-[var(--card3)] text-white' : 'text-[var(--muted)] hover:text-white'}`
              }
            >
              ☕ Brew
            </NavLink>
            <NavLink
              to="/shots"
              className={({ isActive }) =>
                `px-[14px] py-[6px] rounded-[7px] text-[12px] font-bold transition-colors
                ${isActive ? 'bg-[var(--card3)] text-white' : 'text-[var(--muted)] hover:text-white'}`
              }
            >
              📋 Log
            </NavLink>
          </div>
          {/* SensorStatus renders as a compact pill with click-to-expand modal */}
          <SensorStatus />
        </div>
      </header>

      <Outlet />
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true,   element: <Dashboard /> },
      { path: 'shots', element: <ShotLog /> },
      { path: 'beans', element: <BeanProfiles /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 3: Verify in browser at `http://localhost:5173`**

Expected:
- Dark background
- Sticky header: ☕ GrindIQ logo, Brew/Log tab switcher, sensor pill showing `25.0°C · 60%` (mock data)
- Red gradient grind card with A/B/C tabs; B tab active; large grind number
- Three gauge cards (Temperature, Humidity, Agtron)
- 2×2 bean grid; Colombia Huila selected (red border)
- Fixed bottom bar: three feedback buttons + disabled "Log Shot" button
- Tapping a feedback button enables "Log Shot"
- Tapping "Log Shot" shows toast and resets after 2.2 s

---

### Task 13: Run tests and build

- [ ] **Step 1: Run tests**

```bash
npm run test
```
Expected: all `grindCalculator.test.ts` tests pass, no failures.

- [ ] **Step 2: Run production build**

```bash
npm run build
```
Expected: build succeeds, no TypeScript or Vite errors.

---

### Task 14: Final commit + push to staging + PR

- [ ] **Step 1: Stage all changed files**

```bash
git add src/pages/Dashboard.tsx src/App.tsx
```

If any files from Chunks 1 or 2 were not yet committed (check with `git status`), stage them too before committing.

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: implement Dashboard frontend — GrinderSelector, GrindRecommendation, SensorStatus, ShotFeedback, BeanCard, App header"
```

- [ ] **Step 3: Push branch to staging**

```bash
git push origin HEAD:staging
```

- [ ] **Step 4: Create PR from staging to main**

```bash
gh pr create --base main --head staging --title "feat: Dashboard frontend" --body "$(cat <<'EOF'
## Summary
- Implements Dashboard page matching HTML mockup design (red gradient grind card, gauge row, bean grid, fixed feedback bar)
- Components: GrinderSelector, GrindRecommendation, SensorStatus (pill + modal), ShotFeedback (select → Log Shot two-step)
- Mock seed data (3 grinders, 4 beans) loaded on mount; sensor mocked via VITE_DEV_SENSOR_BYPASS
- Shot feedback persists to Zustand store

## Test plan
- [ ] Open http://localhost:5173 — dark background, sticky header visible
- [ ] Sensor pill shows `25.0°C · 60%`; clicking opens modal with sensor rows
- [ ] Grind card shows active grind number; tap A/B/C tabs to switch grinders
- [ ] Gauge cards update temp/humidity/agtron adjustments
- [ ] Tap a bean card — Colombia Huila gets red border; grind number updates
- [ ] Tap a feedback button — it highlights; "Log Shot" button becomes red/enabled
- [ ] Tap "Log Shot" — toast appears, buttons reset after 2.2 s
- [ ] `npm run test` passes
- [ ] `npm run build` succeeds

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Merge the PR (manual step — review the PR on GitHub before merging)**

```bash
gh pr merge --squash
```

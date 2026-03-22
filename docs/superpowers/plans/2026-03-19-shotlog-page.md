# ShotLog Page Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the GrindIQ ShotLog page — red stats card, scrollable filter strip, date-grouped shot rows, and a bottom-sheet detail drawer — replacing the stub in `src/pages/ShotLog.tsx`.

**Architecture:** Components live in `src/components/shot-log/`. Shots are read from Zustand `shots`. On mount, ShotLog seeds `MOCK_SHOTS` only if the store is empty (decision C), and defensively seeds `grinders`/`beans` too (for standalone navigation). The detail drawer recomputes temperature/humidity/agtron adjustments on-the-fly via `calculateGrind` — no pre-computed values are stored in the `ShotLog` record. No new test files (core logic is covered by `grindCalculator.test.ts`).

**Tech Stack:** React 19, TypeScript, Tailwind CSS v3 (arbitrary values + CSS vars), Zustand 5, `calculateGrind` from `@/utils/grindCalculator`.

---

## Chunk 1: Foundation — CSS Tokens · Mock Data · StatsCard · FilterStrip

### Task 1: Add missing CSS tokens to `src/index.css`

The ShotLog uses `--green-soft`, `--blue-soft`, `--amber`, and `--amber-soft` which are not in the current `:root` block.

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Open `src/index.css` and add four tokens inside the `:root { … }` block, after the `--red-soft` line**

```css
  --amber:      #e8a020;
  --amber-soft: rgba(232,160,32,0.14);
  --green-soft: rgba(34,197,94,0.14);
  --blue-soft:  rgba(96,165,250,0.14);
```

The full `:root` block should look like this after the edit:

```css
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
  --amber:      #e8a020;
  --amber-soft: rgba(232,160,32,0.14);
  --green-soft: rgba(34,197,94,0.14);
  --blue-soft:  rgba(96,165,250,0.14);
  --green:     #22c55e;
  --blue:      #60a5fa;
  --text:      #e4e4ea;
  --muted:     #7a7a8c;
  --muted2:    #4e4e5e;
  --r:         16px;
  --r-sm:      10px;
  --r-lg:      22px;
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npm run typecheck
```
Expected: no errors.

---

### Task 2: Add `MOCK_SHOTS` to `src/data/mockData.ts`

18 shots spread across today, yesterday, and 2 days ago, using real `beanId`/`grinderId` values from existing mock data. Grind values for stepped grinders (`grinder-a`, `grinder-c`) are integers; for stepless (`grinder-b`) one decimal.

**Files:**
- Modify: `src/data/mockData.ts`

- [ ] **Step 1: Append to `src/data/mockData.ts`** (add the import at the top, then the constants + export at the bottom)

```ts
// ── add this import at the TOP of the file, after existing imports ──
import type { ShotLog } from '@/types/shot'
```

```ts
// ── add these at the BOTTOM of the file ──
const _MIN  = 60_000
const _HOUR = 60 * _MIN
const _DAY  = 24 * _HOUR

export const MOCK_SHOTS: ShotLog[] = [
  // ── Today ──
  { id: 'shot-01', beanId: 'bean-2', grinderId: 'grinder-b', recommendedGrind: 22.5, actualGrind: 22.5, temp: 27.8, humidity: 64.2, extractionTime: 28, feedback: 'perfect', createdAt: new Date(Date.now() -  5 * _MIN ).toISOString() },
  { id: 'shot-02', beanId: 'bean-2', grinderId: 'grinder-b', recommendedGrind: 22.0, actualGrind: 22.0, temp: 27.2, humidity: 63.0, extractionTime: 31, feedback: 'under',   createdAt: new Date(Date.now() - 38 * _MIN ).toISOString() },
  { id: 'shot-03', beanId: 'bean-1', grinderId: 'grinder-a', recommendedGrind: 18,   actualGrind: 18,   temp: 26.5, humidity: 62.5, extractionTime: 27, feedback: 'perfect', createdAt: new Date(Date.now() -  1 * _HOUR).toISOString() },
  { id: 'shot-04', beanId: 'bean-4', grinderId: 'grinder-a', recommendedGrind: 20,   actualGrind: 20,   temp: 26.1, humidity: 61.8, extractionTime: 26, feedback: 'perfect', createdAt: new Date(Date.now() -  2 * _HOUR).toISOString() },
  { id: 'shot-05', beanId: 'bean-3', grinderId: 'grinder-c', recommendedGrind: 25,   actualGrind: 25,   temp: 25.8, humidity: 61.0, extractionTime: 24, feedback: 'over',    createdAt: new Date(Date.now() -  3 * _HOUR).toISOString() },
  { id: 'shot-06', beanId: 'bean-1', grinderId: 'grinder-a', recommendedGrind: 17,   actualGrind: 17,   temp: 25.4, humidity: 60.5, extractionTime: 29, feedback: 'perfect', createdAt: new Date(Date.now() -  4 * _HOUR).toISOString() },
  { id: 'shot-07', beanId: 'bean-2', grinderId: 'grinder-b', recommendedGrind: 21.8, actualGrind: 21.8, temp: 25.0, humidity: 60.0, extractionTime: 30, feedback: 'perfect', createdAt: new Date(Date.now() -  5 * _HOUR).toISOString() },
  { id: 'shot-08', beanId: 'bean-4', grinderId: 'grinder-a', recommendedGrind: 20,   actualGrind: 20,   temp: 24.7, humidity: 59.2, extractionTime: 25, feedback: 'under',   createdAt: new Date(Date.now() -  6 * _HOUR).toISOString() },
  { id: 'shot-09', beanId: 'bean-3', grinderId: 'grinder-c', recommendedGrind: 24,   actualGrind: 24,   temp: 24.3, humidity: 58.8, extractionTime: 28, feedback: 'perfect', createdAt: new Date(Date.now() -  7 * _HOUR).toISOString() },
  { id: 'shot-10', beanId: 'bean-2', grinderId: 'grinder-b', recommendedGrind: 21.5, actualGrind: 21.5, temp: 24.0, humidity: 58.0, extractionTime: 27, feedback: 'perfect', createdAt: new Date(Date.now() -  8 * _HOUR).toISOString() },
  // ── Yesterday ──
  { id: 'shot-11', beanId: 'bean-1', grinderId: 'grinder-a', recommendedGrind: 17,   actualGrind: 17,   temp: 28.2, humidity: 65.0, extractionTime: 26, feedback: 'over',    createdAt: new Date(Date.now() -  1 * _DAY             ).toISOString() },
  { id: 'shot-12', beanId: 'bean-4', grinderId: 'grinder-a', recommendedGrind: 21,   actualGrind: 21,   temp: 27.6, humidity: 63.8, extractionTime: 29, feedback: 'perfect', createdAt: new Date(Date.now() -  1 * _DAY - 1 * _HOUR).toISOString() },
  { id: 'shot-13', beanId: 'bean-3', grinderId: 'grinder-c', recommendedGrind: 25,   actualGrind: 25,   temp: 27.0, humidity: 63.0, extractionTime: 28, feedback: 'perfect', createdAt: new Date(Date.now() -  1 * _DAY - 2 * _HOUR).toISOString() },
  { id: 'shot-14', beanId: 'bean-2', grinderId: 'grinder-b', recommendedGrind: 22.3, actualGrind: 22.3, temp: 26.5, humidity: 62.0, extractionTime: 31, feedback: 'under',   createdAt: new Date(Date.now() -  1 * _DAY - 3 * _HOUR).toISOString() },
  // ── 2 days ago ──
  { id: 'shot-15', beanId: 'bean-1', grinderId: 'grinder-a', recommendedGrind: 18,   actualGrind: 18,   temp: 26.0, humidity: 61.5, extractionTime: 27, feedback: 'perfect', createdAt: new Date(Date.now() -  2 * _DAY             ).toISOString() },
  { id: 'shot-16', beanId: 'bean-4', grinderId: 'grinder-a', recommendedGrind: 20,   actualGrind: 20,   temp: 25.5, humidity: 61.0, extractionTime: 27, feedback: 'perfect', createdAt: new Date(Date.now() -  2 * _DAY - 1 * _HOUR).toISOString() },
  { id: 'shot-17', beanId: 'bean-3', grinderId: 'grinder-c', recommendedGrind: 24,   actualGrind: 24,   temp: 25.1, humidity: 60.2, extractionTime: 26, feedback: 'perfect', createdAt: new Date(Date.now() -  2 * _DAY - 2 * _HOUR).toISOString() },
  { id: 'shot-18', beanId: 'bean-2', grinderId: 'grinder-b', recommendedGrind: 21.9, actualGrind: 21.9, temp: 24.8, humidity: 59.8, extractionTime: 29, feedback: 'over',    createdAt: new Date(Date.now() -  2 * _DAY - 3 * _HOUR).toISOString() },
]
```

- [ ] **Step 2: Run TypeScript check**

```bash
npm run typecheck
```
Expected: no errors.

---

### Task 3: Create `src/components/shot-log/StatsCard.tsx`

Red gradient card (same gradient as GrinderSelector). Shows today's shot count, perfect-rate %, segmented feedback bar + legend, and a mini bar chart of the last 12 shots. Bar heights are deterministic (derived from shot id) to avoid jitter on re-render.

**Files:**
- Create: `src/components/shot-log/StatsCard.tsx`

- [ ] **Step 1: Create the file**

```tsx
import type { ShotLog } from '@/types/shot'

interface StatsCardProps { shots: ShotLog[] }

function dayKey(d: Date): string { return d.toISOString().slice(0, 10) }

/** Deterministic bar height: "shot-03" → 3 → 10 + ((3*7) % 22) = 31 */
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
```

- [ ] **Step 2: Run TypeScript check**

```bash
npm run typecheck
```
Expected: no errors.

---

### Task 4: Create `src/components/shot-log/FilterStrip.tsx`

Horizontally scrollable row of pills. Feedback section (All / Perfect / Under / Over) + a vertical divider + dynamic grinder chips derived from the Zustand store. Active grinder chips are amber-coloured.

**Files:**
- Create: `src/components/shot-log/FilterStrip.tsx`

- [ ] **Step 1: Create the file**

```tsx
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
  { key: 'perfect', label: '✓ Perfect',  activeCls: 'bg-[var(--green-soft)] border-[rgba(34,197,94,.35)] text-[var(--green)]' },
  { key: 'under',   label: '◀◀ Under',   activeCls: 'bg-[var(--blue-soft)]  border-[rgba(96,165,250,.35)] text-[var(--blue)]'  },
  { key: 'over',    label: '▶▶ Over',    activeCls: 'bg-[var(--red-soft)]   border-[rgba(204,36,36,.35)]  text-[#ff8080]'       },
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
```

- [ ] **Step 2: Run TypeScript check**

```bash
npm run typecheck
```
Expected: no errors.

---

## Chunk 2: Interactive — ShotRow · DetailDrawer · Page · Wiring

### Task 5: Create `src/components/shot-log/ShotRow.tsx`

Single shot card: left-side colour accent (CSS `::before`), decorative sparkline SVG, feedback icon, bean info row, time/temp/humidity/extraction sub-row, and the grind number on the right. Tapping calls `onClick`.

Sparkline points are deterministic (seeded from shot id) to avoid layout jitter.

**Files:**
- Create: `src/components/shot-log/ShotRow.tsx`

- [ ] **Step 1: Create the file**

```tsx
import type { ShotLog } from '@/types/shot'
import type { BeanProfile } from '@/types/bean'
import type { GrinderConfig } from '@/types/grinder'

interface ShotRowProps {
  shot:    ShotLog
  bean:    BeanProfile    | undefined
  grinder: GrinderConfig  | undefined
  onClick: () => void
}

const FB_ICON:  Record<string, string> = { perfect: '✓', under: '◀◀', over: '▶▶' }
const FB_LABEL: Record<string, string> = { perfect: 'Perfect', under: 'Under', over: 'Over' }

/** Grind display: stepless → one decimal, stepped → integer */
export function fmtGrind(grind: number, grinderType: string): string {
  return grinderType === 'stepless' ? grind.toFixed(1) : String(Math.round(grind))
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

/** Deterministic sparkline: seed from numeric part of shot id */
function sparkPoints(id: string): string {
  const seed = parseInt(id.replace(/\D/g, ''), 10) || 1
  return Array.from({ length: 9 }, (_, i) => {
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
```

- [ ] **Step 2: Run TypeScript check**

```bash
npm run typecheck
```
Expected: no errors.

---

### Task 6: Create `src/components/shot-log/DetailDrawer.tsx`

Bottom-sheet modal with: drag handle, 80px grind hero, grinder type/label subtitle, bean name + date+time, 3-column adjustment mini-gauges (recomputed live), detail rows, close button.

Adjustments are recomputed with `calculateGrind(bean, grinder, shot.temp, shot.humidity)` — if bean or grinder is not found in the store (unlikely with mock data), the gauges section is simply hidden.

**Files:**
- Create: `src/components/shot-log/DetailDrawer.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { calculateGrind } from '@/utils/grindCalculator'
import type { ShotLog } from '@/types/shot'
import type { BeanProfile } from '@/types/bean'
import type { GrinderConfig } from '@/types/grinder'
import { fmtGrind } from './ShotRow'

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
            {grinder?.grinderType ?? '—'} · Grinder {grinder?.label ?? '—'}
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
          { label: 'Grinder',     value: `Grinder ${grinder?.label ?? '—'} (${grinder?.grinderType ?? '—'})`,    extra: '' },
          { label: 'Temperature', value: `${shot.temp.toFixed(1)}°C`,                                             extra: '' },
          { label: 'Humidity',    value: `${shot.humidity.toFixed(1)}%`,                                           extra: '' },
          { label: 'Extraction',  value: shot.extractionTime != null ? `${shot.extractionTime}s` : '—',           extra: '' },
          { label: 'Feedback',    value: FB_LABEL[shot.feedback] ?? shot.feedback,                                 extra: FB_COLOR[shot.feedback] ?? '' },
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
```

- [ ] **Step 2: Run TypeScript check**

```bash
npm run typecheck
```
Expected: no errors.

---

### Task 7: Rewrite `src/pages/ShotLog.tsx`

Replace the placeholder stub. Manages `feedback` filter state and `grinderIds` Set. Seeds mock data if store is empty. Groups shots by ISO date key. Renders StatsCard → FilterStrip → date-grouped ShotRows → DetailDrawer.

**Files:**
- Modify: `src/pages/ShotLog.tsx`

- [ ] **Step 1: Replace the entire file contents**

```tsx
import { useState, useCallback, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { MOCK_SHOTS, MOCK_GRINDERS, MOCK_BEANS } from '@/data/mockData'
import { StatsCard }    from '@/components/shot-log/StatsCard'
import { FilterStrip }  from '@/components/shot-log/FilterStrip'
import type { FeedbackFilter } from '@/components/shot-log/FilterStrip'
import { ShotRow }      from '@/components/shot-log/ShotRow'
import { DetailDrawer } from '@/components/shot-log/DetailDrawer'
import type { ShotLog as ShotLogEntry } from '@/types/shot'

function dayKey(d: Date): string { return d.toISOString().slice(0, 10) }

function fmtDateHeader(iso: string): string {
  const d    = new Date(iso)
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

/**
 * PRD §F-05 — Shot Log
 * Historical shots grouped by date, filterable by feedback + grinder.
 */
export default function ShotLog() {
  const { shots, setShots, grinders, setGrinders, beans, setBeans } = useAppStore()

  // Seed on mount — only if store is empty (decision C)
  useEffect(() => {
    if (shots.length    === 0) setShots(MOCK_SHOTS)
    if (grinders.length === 0) setGrinders(MOCK_GRINDERS)
    if (beans.length    === 0) setBeans(MOCK_BEANS)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [feedback,   setFeedback]   = useState<FeedbackFilter>('all')
  const [grinderIds, setGrinderIds] = useState<Set<string>>(new Set())
  const [activeShot, setActiveShot] = useState<ShotLogEntry | null>(null)

  const toggleGrinder = useCallback((id: string) => {
    setGrinderIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  // Filter
  const filtered = shots.filter(s => {
    if (feedback !== 'all' && s.feedback !== feedback) return false
    if (grinderIds.size > 0 && !grinderIds.has(s.grinderId)) return false
    return true
  })

  // Group by day (preserve insertion order — shots array is newest-first)
  const groupMap = new Map<string, ShotLogEntry[]>()
  for (const s of filtered) {
    const k = dayKey(new Date(s.createdAt))
    if (!groupMap.has(k)) groupMap.set(k, [])
    groupMap.get(k)!.push(s)
  }
  const groups = Array.from(groupMap.entries()).map(([key, rows]) => ({
    key,
    label: fmtDateHeader(rows[0].createdAt),
    shots: rows,
  }))

  const activeBean    = activeShot ? beans.find(b => b.id === activeShot.beanId)       : undefined
  const activeGrinder = activeShot ? grinders.find(g => g.id === activeShot.grinderId) : undefined

  return (
    <div className="min-h-screen pb-10" style={{ background: 'var(--bg)' }}>
      <div className="max-w-3xl mx-auto">

        {/* Stats card */}
        <div className="px-4 pt-4">
          <StatsCard shots={shots} />
        </div>

        {/* Filter strip */}
        <div className="px-4">
          <FilterStrip
            feedback={feedback}
            grinderIds={grinderIds}
            onFeedback={setFeedback}
            onToggleGrinder={toggleGrinder}
          />
        </div>

        {/* Shot list */}
        <div className="px-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-[60px] text-center">
              <div className="text-[48px] opacity-30 mb-4">🔍</div>
              <div className="text-[15px] text-[var(--muted)] leading-[1.7]">
                No shots match this filter.<br />Try adjusting the filters above.
              </div>
            </div>
          ) : (
            groups.map(group => {
              const perfInGroup = group.shots.filter(s => s.feedback === 'perfect').length
              return (
                <div key={group.key} className="mt-5">
                  {/* Date header */}
                  <div className="flex items-center gap-[10px] mb-[10px]">
                    <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-[.8px] whitespace-nowrap">
                      {group.label}
                    </span>
                    <div className="flex-1 h-px bg-[var(--border)]" />
                    <span className="text-[10px] text-[var(--muted)] bg-[var(--card2)] border border-[var(--border)] rounded-full px-[9px] py-[2px] whitespace-nowrap">
                      {group.shots.length} shots · {perfInGroup} perfect
                    </span>
                  </div>

                  {/* Rows */}
                  <div className="flex flex-col gap-2">
                    {group.shots.map(shot => (
                      <ShotRow
                        key={shot.id}
                        shot={shot}
                        bean={beans.find(b => b.id === shot.beanId)}
                        grinder={grinders.find(g => g.id === shot.grinderId)}
                        onClick={() => setActiveShot(shot)}
                      />
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>

      </div>

      {/* Detail drawer */}
      <DetailDrawer
        shot={activeShot}
        bean={activeBean}
        grinder={activeGrinder}
        onClose={() => setActiveShot(null)}
      />
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

### Task 8: Update `src/components/shot-log/index.ts` + typecheck + build + commit

**Files:**
- Modify: `src/components/shot-log/index.ts`

- [ ] **Step 1: Replace the entire file**

```ts
export { StatsCard }           from './StatsCard'
export { FilterStrip }         from './FilterStrip'
export type { FeedbackFilter } from './FilterStrip'
export { ShotRow, fmtGrind }   from './ShotRow'
export { DetailDrawer }        from './DetailDrawer'
```

- [ ] **Step 2: Run full TypeScript check**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 3: Run production build**

```bash
npm run build
```
Expected: build succeeds with no errors.

- [ ] **Step 4: Commit all changes**

```bash
git add src/index.css \
        src/data/mockData.ts \
        src/components/shot-log/StatsCard.tsx \
        src/components/shot-log/FilterStrip.tsx \
        src/components/shot-log/ShotRow.tsx \
        src/components/shot-log/DetailDrawer.tsx \
        src/components/shot-log/index.ts \
        src/pages/ShotLog.tsx
git commit -m "feat: implement ShotLog page — stats card, filter strip, shot rows, detail drawer"
```

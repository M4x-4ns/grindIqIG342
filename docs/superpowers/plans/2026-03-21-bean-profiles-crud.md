# Bean Profiles CRUD Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the BeanProfiles page — a 2-column card grid with side-drawer for add/edit/delete — and migrate the data model from `grinderId + baselineGrind` to `baselineGrinds: Record<string, number>`.

**Architecture:** Migrate the data model first (types → calculator → mock data), then add store actions, then migrate Dashboard, then build UI bottom-up (BeanCard → BeanForm → BeanDrawer → BeanProfiles page). Each layer builds on the previous; TypeScript errors guide the migration sequence.

**Tech Stack:** React 19, TypeScript 5, Zustand 5, Vitest + @testing-library/react + @testing-library/user-event, Tailwind CSS v3, react-router-dom

---

## Pre-flight: Install testing dependencies

If `@testing-library/react` and `@testing-library/user-event` are not already installed:

```bash
cd C:\Users\m4x00\GrindIQ\grindiq
npm install --save-dev @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

Then check `vite.config.ts` — if the `test` block does not have `environment: 'jsdom'` and `setupFiles`, add them:
```typescript
test: {
  environment: 'jsdom',
  setupFiles: ['./src/test-setup.ts'],
}
```
Create `src/test-setup.ts` if it doesn't exist:
```typescript
import '@testing-library/jest-dom'
```

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/types/bean.ts` | Modify | Remove `grinderId`/`baselineGrind`; add `baselineGrinds: Record<string, number>` |
| `src/utils/grindCalculator.ts` | Modify | Use `bean.baselineGrinds[grinder.id] ?? grinder.baselineGrind` |
| `src/utils/grindCalculator.test.ts` | Modify | Update `mockBean` fixture — remove `grinderId`/`baselineGrind`; add `baselineGrinds` |
| `src/data/mockData.ts` | Modify | Replace `grinderId + baselineGrind` on each `MOCK_BEANS` entry with `baselineGrinds` |
| `src/store/useAppStore.ts` | Modify | Add `addBean`, `updateBean`, `deleteBean` actions |
| `src/store/useAppStore.test.ts` | Create | Unit tests for the three new store actions |
| `src/pages/Dashboard.tsx` | Modify | 7 migrations: remove `grinderId` refs, conditional seeding, use `beans` from store |
| `src/components/grinder/GrinderSelector.tsx` | Modify | Replace `selectedBean.baselineGrind.toFixed(1)` with `baselineGrinds` lookup |
| `src/App.tsx` | Modify | Add `🫘 Beans` NavLink to tab bar |
| `src/components/bean-profile/index.ts` | Create | Re-exports |
| `src/components/bean-profile/BeanCard.tsx` | Create | Card in the 2-col grid — active dot, roast badge, agtron, grind chips |
| `src/components/bean-profile/BeanCard.test.tsx` | Create | Active/hidden states, grind chips use grinders prop |
| `src/components/bean-profile/BeanForm.tsx` | Create | All form fields, validation, confirm-delete flow |
| `src/components/bean-profile/BeanForm.test.tsx` | Create | Validation, save payload shape, hide/delete callbacks |
| `src/components/bean-profile/BeanDrawer.tsx` | Create | Sticky header + close button, wraps BeanForm, wires store actions |
| `src/components/bean-profile/BeanDrawer.test.tsx` | Create | Edit/add mode titles, close button |
| `src/pages/BeanProfiles.tsx` | Replace entirely | Page shell: 2-col grid + drawer state + conditional seeding |
| `src/pages/BeanProfiles.test.tsx` | Create | Page-level: card renders, drawer open/close, switch-bean-while-open |

---

## Chunk 1: Data Foundation

### Task 1: Update BeanProfile type and grind calculator

**Files:**
- Modify: `src/types/bean.ts`
- Modify: `src/utils/grindCalculator.ts`
- Modify: `src/utils/grindCalculator.test.ts`

- [ ] **Step 1: Replace `src/types/bean.ts`**

```typescript
import type { RoastLevel } from './grinder'

export interface BeanProfile {
  id: string
  name: string
  origin: string
  agtron: number
  roastLevel: RoastLevel
  baselineGrinds: Record<string, number>  // key = GrinderConfig.id
  baselineTemp: number      // °C, recommended 25
  baselineHumidity: number  // %
  targetExtractionTime?: number  // seconds; retained but not exposed in form
  isActive: boolean
  createdAt: string
}
```

- [ ] **Step 2: Update `src/utils/grindCalculator.ts` — fix the baseline lookup**

Find line 40 (currently `const raw = bean.baselineGrind + dTemp + dHumidity + dAgtron`) and replace with:

```typescript
  const baseline = bean.baselineGrinds[grinder.id] ?? grinder.baselineGrind
  const raw = baseline + dTemp + dHumidity + dAgtron
```

- [ ] **Step 3: Update `src/utils/grindCalculator.test.ts` — fix mockBean fixture**

Replace the `mockBean` constant (keep everything else — `mockGrinderStepped`, `mockGrinderStepless`, all describe blocks):

```typescript
const mockBean: BeanProfile = {
  id: 'b1',
  name: 'Ethiopia Yirgacheffe',
  origin: 'Ethiopia',
  agtron: 75,         // Light roast boundary — dAgtron = -0.5
  roastLevel: 'light',
  baselineGrinds: { 'a': 20 },   // key = mockGrinderStepped.id
  baselineTemp: 25,
  baselineHumidity: 60,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
}
```

(Remove `grinderId: 'a'` and `baselineGrind: 20`. The `darkBean` and `medBean` spread expressions in the test body need no change — they only override `agtron`.)

- [ ] **Step 4: Run the existing grind calculator tests**

```bash
cd C:\Users\m4x00\GrindIQ\grindiq && npx vitest run src/utils/grindCalculator.test.ts
```

Expected: all 7 tests PASS. (Behaviour unchanged — `baselineGrinds['a']` returns 20, same result as before.)

- [ ] **Step 5: Run tsc to see the scope of remaining migration work**

```bash
npx tsc --noEmit
```

Expected: errors in `Dashboard.tsx`, `GrinderSelector.tsx`, `mockData.ts` — these are fixed in Tasks 2–4. Note the count.

- [ ] **Step 6: Commit**

```bash
git add src/types/bean.ts src/utils/grindCalculator.ts src/utils/grindCalculator.test.ts
git commit -m "feat: migrate BeanProfile to baselineGrinds map; update grind calculator"
```

---

### Task 2: Update mock data

**Files:**
- Modify: `src/data/mockData.ts`

- [ ] **Step 1: Replace the `MOCK_BEANS` array in `src/data/mockData.ts`**

Replace the entire `MOCK_BEANS` constant (leave `MOCK_GRINDERS` and `MOCK_SHOTS` untouched):

```typescript
export const MOCK_BEANS: BeanProfile[] = [
  {
    id: 'bean-1',
    name: 'Ethiopia Yirgacheffe',
    origin: 'Ethiopia',
    agtron: 78,
    roastLevel: 'light',
    baselineGrinds: { 'grinder-a': 18, 'grinder-b': 22, 'grinder-c': 24 },
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
    baselineGrinds: { 'grinder-a': 19, 'grinder-b': 22, 'grinder-c': 25 },
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
    baselineGrinds: { 'grinder-a': 17, 'grinder-b': 21, 'grinder-c': 24 },
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
    baselineGrinds: { 'grinder-a': 19.5, 'grinder-b': 23, 'grinder-c': 25 },
    baselineTemp: 25,
    baselineHumidity: 60,
    isActive: false,
    createdAt: '2026-01-04T00:00:00Z',
  },
]
```

- [ ] **Step 2: Run tsc — confirm mock data errors are gone**

```bash
npx tsc --noEmit
```

Expected: errors now only in `Dashboard.tsx` and `GrinderSelector.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/data/mockData.ts
git commit -m "feat: update MOCK_BEANS to use baselineGrinds per grinder"
```

---

## Chunk 2: Store CRUD Actions

### Task 3: Add bean CRUD actions to the Zustand store

**Files:**
- Modify: `src/store/useAppStore.ts`
- Create: `src/store/useAppStore.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/store/useAppStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from './useAppStore'
import type { BeanProfile } from '@/types/bean'

const makeBean = (id: string): BeanProfile => ({
  id,
  name: `Bean ${id}`,
  origin: 'Ethiopia',
  agtron: 70,
  roastLevel: 'light',
  baselineGrinds: { 'grinder-a': 18 },
  baselineTemp: 25,
  baselineHumidity: 60,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
})

beforeEach(() => {
  useAppStore.setState({ beans: [], selectedBean: null })
})

describe('addBean', () => {
  it('prepends the new bean to the beans array', () => {
    const existing = makeBean('b1')
    useAppStore.setState({ beans: [existing] })
    const newBean = makeBean('b2')
    useAppStore.getState().addBean(newBean)
    expect(useAppStore.getState().beans).toEqual([newBean, existing])
  })
})

describe('updateBean', () => {
  it('replaces the bean with matching id', () => {
    const bean = makeBean('b1')
    useAppStore.setState({ beans: [bean] })
    const updated = { ...bean, name: 'Updated' }
    useAppStore.getState().updateBean(updated)
    expect(useAppStore.getState().beans[0].name).toBe('Updated')
  })

  it('also updates selectedBean when id matches', () => {
    const bean = makeBean('b1')
    useAppStore.setState({ beans: [bean], selectedBean: bean })
    const updated = { ...bean, name: 'Updated' }
    useAppStore.getState().updateBean(updated)
    expect(useAppStore.getState().selectedBean?.name).toBe('Updated')
  })

  it('does not change selectedBean when id does not match', () => {
    const beanA = makeBean('b1')
    const beanB = makeBean('b2')
    useAppStore.setState({ beans: [beanA, beanB], selectedBean: beanA })
    useAppStore.getState().updateBean({ ...beanB, name: 'Updated B' })
    expect(useAppStore.getState().selectedBean?.name).toBe('Bean b1')
  })
})

describe('deleteBean', () => {
  it('removes the bean with matching id', () => {
    const beanA = makeBean('b1')
    const beanB = makeBean('b2')
    useAppStore.setState({ beans: [beanA, beanB] })
    useAppStore.getState().deleteBean('b1')
    expect(useAppStore.getState().beans).toEqual([beanB])
  })

  it('clears selectedBean when deleted id matches', () => {
    const bean = makeBean('b1')
    useAppStore.setState({ beans: [bean], selectedBean: bean })
    useAppStore.getState().deleteBean('b1')
    expect(useAppStore.getState().selectedBean).toBeNull()
  })

  it('does not clear selectedBean when deleted id does not match', () => {
    const beanA = makeBean('b1')
    const beanB = makeBean('b2')
    useAppStore.setState({ beans: [beanA, beanB], selectedBean: beanA })
    useAppStore.getState().deleteBean('b2')
    expect(useAppStore.getState().selectedBean?.id).toBe('b1')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/store/useAppStore.test.ts
```

Expected: FAIL — `addBean`, `updateBean`, `deleteBean` are not functions on the store state.

- [ ] **Step 3: Add the three actions to `src/store/useAppStore.ts`**

In the `AppState` interface, add after `setSensor`:
```typescript
  addBean: (bean: BeanProfile) => void
  updateBean: (bean: BeanProfile) => void
  deleteBean: (id: string) => void
```

In the `create(...)` implementation, add after `setSensor`:
```typescript
  addBean: (bean) =>
    set((state) => ({ beans: [bean, ...state.beans] })),

  updateBean: (bean) =>
    set((state) => ({
      beans: state.beans.map((b) => (b.id === bean.id ? bean : b)),
      selectedBean:
        state.selectedBean?.id === bean.id ? bean : state.selectedBean,
    })),

  deleteBean: (id) =>
    set((state) => ({
      beans: state.beans.filter((b) => b.id !== id),
      selectedBean: state.selectedBean?.id === id ? null : state.selectedBean,
    })),
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/store/useAppStore.test.ts
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/useAppStore.ts src/store/useAppStore.test.ts
git commit -m "feat: add addBean, updateBean, deleteBean store actions"
```

---

## Chunk 3: Dashboard Migration + Navigation

### Task 4: Migrate Dashboard.tsx and GrinderSelector.tsx

**Files:**
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/components/grinder/GrinderSelector.tsx`

There are 7 specific changes to make across these two files. Make them one at a time, running tsc after the last one to confirm 0 errors.

**Dashboard.tsx — Change 1: Remove `assignedGrinder`, fix `handleSelect`**

In the `BeanCard` inner component, replace the entire component with this version:

```tsx
function BeanCard({ bean }: { bean: BeanProfile }) {
  const { selectedBean, selectedGrinder, sensor, grinders } = useAppStore()
  const isSelected = selectedBean?.id === bean.id

  const temp     = sensor.reading?.temperature ?? 25
  const humidity = sensor.reading?.humidity    ?? 60

  // Show live calculation when a grinder is selected; fall back to the bean's
  // baseline for the first grinder in the store (or '—' if store is empty).
  const grindDisplay = selectedGrinder
    ? calculateGrind(bean, selectedGrinder, temp, humidity).displayValue
    : (bean.baselineGrinds[grinders[0]?.id ?? ''])?.toString() ?? '—'

  function handleSelect() {
    // Tapping a bean sets selectedBean only — grinder selection is unaffected.
    useAppStore.setState({ selectedBean: bean })
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
        {selectedGrinder?.grinderType} · grinder {selectedGrinder?.label}
      </div>

      <div className={`inline-flex items-center gap-[3px] text-[10px] font-bold px-[7px] py-[2px] rounded-full border mt-1 ${AGTRON_CLS(bean.roastLevel)}`}>
        {ROAST_EMOJI[bean.roastLevel]} {bean.roastLevel.charAt(0).toUpperCase() + bean.roastLevel.slice(1)} · Agt {bean.agtron}
      </div>
    </button>
  )
}
```

**Dashboard.tsx — Change 2: Make seeding conditional and use `beans` from store**

Replace the `Dashboard` default export function body:

```tsx
export default function Dashboard() {
  useSensor()

  const { setGrinders, setBeans, grinders, beans, selectedBean } = useAppStore()

  useEffect(() => {
    if (grinders.length === 0) setGrinders(MOCK_GRINDERS)
    if (beans.length === 0) {
      setBeans(MOCK_BEANS)
      const activeBean = MOCK_BEANS.find(b => b.isActive) ?? MOCK_BEANS[0]
      useAppStore.setState({ selectedBean: activeBean, selectedGrinder: MOCK_GRINDERS[0] })
    } else if (!selectedBean) {
      // Beans were added from BeanProfiles page but no bean is selected yet
      useAppStore.setState({ selectedBean: beans.find(b => b.isActive) ?? beans[0] })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
```

Key changes:
- `grinders` and `beans` are now destructured from the store
- Seeding is conditional: `if (grinders.length === 0)` / `if (beans.length === 0)`
- Initial grinder auto-select no longer uses `activeBean.grinderId`; defaults to `MOCK_GRINDERS[0]`
- `{beans.map(bean => ...)}` instead of `{MOCK_BEANS.map(bean => ...)}`

**GrinderSelector.tsx — Change: Fix baseline display**

In `GrinderSelector.tsx`, inside the `result && selectedGrinder && selectedBean &&` block, find:
```tsx
<span className="text-white/30">
  Baseline {selectedBean.baselineGrind.toFixed(1)}
</span>
```

Replace with:
```tsx
<span className="text-white/30">
  Baseline {selectedBean.baselineGrinds[selectedGrinder.id]?.toFixed(1) ?? selectedGrinder.baselineGrind.toFixed(1)}
</span>
```

- [ ] **Step 1: Apply all three changes above (BeanCard rewrite, Dashboard body, GrinderSelector)**

- [ ] **Step 2: Run tsc — verify 0 errors**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Run all existing tests**

```bash
npx vitest run
```

Expected: all tests PASS (grindCalculator ×7, store ×6).

- [ ] **Step 4: Verify grind display fallback in browser**

Open `☕ Brew`, dismiss the grinder selection (if a grinder is pre-selected, deselect it by refreshing the page before a grinder has been auto-selected). Confirm that each bean card shows the baseline grind value from `baselineGrinds[grinders[0].id]` rather than a crash or undefined. This satisfies the spec Testing requirement: "Dashboard.tsx grind display falls back correctly when no grinder is selected."

- [ ] **Step 5: Commit**

```bash
git add src/pages/Dashboard.tsx src/components/grinder/GrinderSelector.tsx
git commit -m "feat: migrate Dashboard and GrinderSelector to baselineGrinds"
```

---

### Task 5: Add Beans nav tab to App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add the `🫘 Beans` NavLink**

In `src/App.tsx`, find the tab bar `<div>` that contains the `☕ Brew` and `📋 Log` NavLinks. After the `📋 Log` NavLink closing tag, insert:

```tsx
<NavLink
  to="/beans"
  className={({ isActive }) =>
    `px-[14px] py-[6px] rounded-[7px] text-[12px] font-bold transition-colors
    ${isActive ? 'bg-[var(--card3)] text-white' : 'text-[var(--muted)] hover:text-white'}`
  }
>
  🫘 Beans
</NavLink>
```

The route `{ path: 'beans', element: <BeanProfiles /> }` already exists in the router — no router change needed.

> **Important:** The `<div>` containing the two existing NavLinks is the nav pill container (line 38 in the current `App.tsx`): `<div className="flex bg-[var(--card2)] border border-[var(--border2)] rounded-[10px] p-[3px] gap-[2px]">`. Insert the new NavLink **before the closing `</div>` of this container**, not after it — placing it after would put the Beans tab outside the pill styling.

- [ ] **Step 2: Check the browser — three tabs visible**

With `npm run dev` running, confirm the header shows: `☕ Brew · 📋 Log · 🫘 Beans` all inside the same pill container. Clicking Beans navigates to `/beans` (currently the static mockup — that's fine for now).

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add Beans nav tab to app header"
```

---

## Chunk 4: BeanCard Component

### Task 6: BeanCard component + tests

**Files:**
- Create: `src/components/bean-profile/BeanCard.tsx`
- Create: `src/components/bean-profile/BeanCard.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/bean-profile/BeanCard.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BeanCard } from './BeanCard'
import type { BeanProfile } from '@/types/bean'
import type { GrinderConfig } from '@/types/grinder'

const grinders: GrinderConfig[] = [
  { id: 'grinder-a', label: 'Junior',   roastLevel: 'light',  grinderType: 'stepped',   baselineGrind: 18, tempCoefficient: 0.15, humidityCoefficient: 0.05, isActive: true },
  { id: 'grinder-b', label: 'Zentis',   roastLevel: 'medium', grinderType: 'stepless',  baselineGrind: 22, tempCoefficient: 0.15, humidityCoefficient: 0.05, isActive: true },
  { id: 'grinder-c', label: 'Timemore', roastLevel: 'dark',   grinderType: 'stepped',   baselineGrind: 24, tempCoefficient: 0.15, humidityCoefficient: 0.05, isActive: true },
]

const activeBean: BeanProfile = {
  id: 'b1',
  name: 'Ethiopia Yirgacheffe',
  origin: 'Ethiopia',
  agtron: 78,
  roastLevel: 'light',
  baselineGrinds: { 'grinder-a': 18, 'grinder-b': 22, 'grinder-c': 24 },
  baselineTemp: 25,
  baselineHumidity: 60,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
}

const hiddenBean: BeanProfile = { ...activeBean, id: 'b2', isActive: false }

describe('BeanCard', () => {
  it('renders bean name and origin', () => {
    render(<BeanCard bean={activeBean} grinders={grinders} onClick={vi.fn()} />)
    expect(screen.getByText('Ethiopia Yirgacheffe')).toBeTruthy()
    expect(screen.getByText('Ethiopia')).toBeTruthy()
  })

  it('renders agtron number', () => {
    render(<BeanCard bean={activeBean} grinders={grinders} onClick={vi.fn()} />)
    expect(screen.getByText('78')).toBeTruthy()
  })

  it('renders grind chips using label prefix + value from grinders prop', () => {
    render(<BeanCard bean={activeBean} grinders={grinders} onClick={vi.fn()} />)
    // Each chip shows first 2 chars of grinder label + the value
    expect(screen.getByText(/Jr/)).toBeTruthy()
    expect(screen.getByText(/Ze/)).toBeTruthy()
    expect(screen.getByText(/Ti/)).toBeTruthy()
    // Values
    expect(screen.getByText('18')).toBeTruthy()
    expect(screen.getByText('22')).toBeTruthy()
    expect(screen.getByText('24')).toBeTruthy()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<BeanCard bean={activeBean} grinders={grinders} onClick={onClick} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('applies reduced opacity for hidden bean', () => {
    const { container } = render(<BeanCard bean={hiddenBean} grinders={grinders} onClick={vi.fn()} />)
    const button = container.firstChild as HTMLElement
    // Hidden card should have opacity style (0.45) or an opacity class applied
    const opacityStyle = button.style.opacity
    const hasOpacityClass = button.className.includes('opacity')
    expect(opacityStyle === '0.45' || hasOpacityClass).toBe(true)
  })

  it('applies grinder accent colour to chip label prefixes', () => {
    const { container } = render(<BeanCard bean={activeBean} grinders={grinders} onClick={vi.fn()} />)
    // Grinder-a (index 0) should have colour #fbbf24
    const coloredSpans = container.querySelectorAll('[style*="color"]')
    expect(coloredSpans.length).toBeGreaterThan(0)
    expect((coloredSpans[0] as HTMLElement).style.color).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/components/bean-profile/BeanCard.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/components/bean-profile/BeanCard.tsx`**

```tsx
import type { BeanProfile } from '@/types/bean'
import type { GrinderConfig } from '@/types/grinder'

// Accent colours indexed by grinder position — matches BeanForm constants
const GRINDER_COLORS = ['#fbbf24', '#d4845a', '#a0663c']

const ROAST_EMOJI: Record<string, string> = {
  light: '☀',
  medium: '⛅',
  dark: '🌑',
  'very-dark': '🌑',
}

const ROAST_BADGE_CLS: Record<string, string> = {
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
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/components/bean-profile/BeanCard.test.tsx
```

Expected: all 5 tests PASS.

> **Troubleshooting:** If `toHaveBeenCalledOnce` is not found, ensure `@testing-library/jest-dom` is imported in `test-setup.ts`. If grind chip values like `18`, `22`, `24` clash with other text on screen, use `getAllByText` instead of `getByText`.

- [ ] **Step 5: Commit**

```bash
git add src/components/bean-profile/BeanCard.tsx src/components/bean-profile/BeanCard.test.tsx
git commit -m "feat: add BeanCard component with grind chips"
```

---

## Chunk 5: BeanForm Component

### Task 7: BeanForm component + tests

**Files:**
- Create: `src/components/bean-profile/BeanForm.tsx`
- Create: `src/components/bean-profile/BeanForm.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/bean-profile/BeanForm.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BeanForm } from './BeanForm'
import type { BeanProfile } from '@/types/bean'
import type { GrinderConfig } from '@/types/grinder'

const grinders: GrinderConfig[] = [
  { id: 'grinder-a', label: 'Junior', roastLevel: 'light', grinderType: 'stepped', baselineGrind: 18, tempCoefficient: 0.15, humidityCoefficient: 0.05, isActive: true },
]

const existingBean: BeanProfile = {
  id: 'b1',
  name: 'Ethiopia Yirgacheffe',
  origin: 'Ethiopia',
  agtron: 78,
  roastLevel: 'light',
  baselineGrinds: { 'grinder-a': 18 },
  baselineTemp: 25,
  baselineHumidity: 60,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
}

// --- Add mode ---
describe('BeanForm — add mode', () => {
  it('shows "Add Bean" primary button', () => {
    render(<BeanForm grinders={grinders} onSave={vi.fn()} />)
    expect(screen.getByRole('button', { name: /add bean/i })).toBeTruthy()
  })

  it('primary button is disabled when required fields are empty', () => {
    render(<BeanForm grinders={grinders} onSave={vi.fn()} />)
    expect(screen.getByRole('button', { name: /add bean/i })).toBeDisabled()
  })

  it('does not show Hide or Delete buttons in add mode', () => {
    render(<BeanForm grinders={grinders} onSave={vi.fn()} />)
    expect(screen.queryByText(/hide bean/i)).toBeNull()
    expect(screen.queryByText(/delete permanently/i)).toBeNull()
  })

  it('calls onSave with a generated UUID and all fields when valid form is submitted', async () => {
    const onSave = vi.fn()
    render(<BeanForm grinders={grinders} onSave={onSave} />)
    await userEvent.type(screen.getByLabelText(/^name$/i), 'New Bean')
    await userEvent.type(screen.getByLabelText(/^origin$/i), 'Ethiopia')
    await userEvent.clear(screen.getByLabelText(/^agtron$/i))
    await userEvent.type(screen.getByLabelText(/^agtron$/i), '70')
    await userEvent.clear(screen.getByLabelText(/^junior$/i))
    await userEvent.type(screen.getByLabelText(/^junior$/i), '18')
    await userEvent.clear(screen.getByLabelText(/temp/i))
    await userEvent.type(screen.getByLabelText(/temp/i), '25')
    await userEvent.clear(screen.getByLabelText(/humidity/i))
    await userEvent.type(screen.getByLabelText(/humidity/i), '60')
    await userEvent.click(screen.getByRole('button', { name: /add bean/i }))
    expect(onSave).toHaveBeenCalledOnce()
    const [savedBean] = onSave.mock.calls[0] as [BeanProfile]
    expect(savedBean.name).toBe('New Bean')
    expect(savedBean.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/)  // UUID prefix
    expect(savedBean.createdAt).toBeTruthy()
    expect(savedBean.baselineGrinds['grinder-a']).toBe(18)
  })
})

// --- Edit mode ---
describe('BeanForm — edit mode', () => {
  it('pre-fills name and origin from initialBean', () => {
    render(<BeanForm initialBean={existingBean} grinders={grinders} onSave={vi.fn()} />)
    expect((screen.getByLabelText(/^name$/i) as HTMLInputElement).value).toBe('Ethiopia Yirgacheffe')
    expect((screen.getByLabelText(/^origin$/i) as HTMLInputElement).value).toBe('Ethiopia')
  })

  it('shows "Save Changes" button in edit mode', () => {
    render(<BeanForm initialBean={existingBean} grinders={grinders} onSave={vi.fn()} />)
    expect(screen.getByRole('button', { name: /save changes/i })).toBeTruthy()
  })

  it('shows Hide and Delete buttons in edit mode', () => {
    render(<BeanForm initialBean={existingBean} grinders={grinders} onSave={vi.fn()} onHide={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText(/hide bean/i)).toBeTruthy()
    expect(screen.getByText(/delete permanently/i)).toBeTruthy()
  })

  it('calls onHide when Hide button clicked', async () => {
    const onHide = vi.fn()
    render(<BeanForm initialBean={existingBean} grinders={grinders} onSave={vi.fn()} onHide={onHide} onDelete={vi.fn()} />)
    await userEvent.click(screen.getByText(/hide bean/i))
    expect(onHide).toHaveBeenCalledOnce()
  })

  it('shows confirmation text after first Delete click', async () => {
    render(<BeanForm initialBean={existingBean} grinders={grinders} onSave={vi.fn()} onHide={vi.fn()} onDelete={vi.fn()} />)
    await userEvent.click(screen.getByText(/delete permanently/i))
    expect(screen.getByText(/are you sure/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /confirm delete/i })).toBeTruthy()
  })

  it('calls onDelete after Confirm Delete clicked', async () => {
    const onDelete = vi.fn()
    render(<BeanForm initialBean={existingBean} grinders={grinders} onSave={vi.fn()} onHide={vi.fn()} onDelete={onDelete} />)
    await userEvent.click(screen.getByText(/delete permanently/i))
    await userEvent.click(screen.getByRole('button', { name: /confirm delete/i }))
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('cancels confirmation state when clicking outside the confirm row', async () => {
    render(
      <div>
        <BeanForm initialBean={existingBean} grinders={grinders} onSave={vi.fn()} onHide={vi.fn()} onDelete={vi.fn()} />
        <div data-testid="outside">Outside</div>
      </div>
    )
    await userEvent.click(screen.getByText(/delete permanently/i))
    expect(screen.getByText(/are you sure/i)).toBeTruthy()
    // Click the outside element — triggers the mousedown handler
    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(screen.queryByText(/are you sure/i)).toBeNull()
  })
})

// --- Validation ---
describe('BeanForm — validation', () => {
  it('shows agtron error on blur when value is out of range', async () => {
    render(<BeanForm grinders={grinders} onSave={vi.fn()} />)
    const agtronInput = screen.getByLabelText(/^agtron$/i)
    await userEvent.type(agtronInput, '200')
    fireEvent.blur(agtronInput)
    expect(screen.getByText(/0.*100/i)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/components/bean-profile/BeanForm.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/components/bean-profile/BeanForm.tsx`**

```tsx
import { useState, useRef, useEffect } from 'react'
import type { BeanProfile } from '@/types/bean'
import type { GrinderConfig, RoastLevel } from '@/types/grinder'

// Accent colours for grinder rows — ordered by grinder list index
const GRINDER_COLORS = ['#fbbf24', '#d4845a', '#a0663c']

const ROAST_LEVELS: { value: RoastLevel; label: string }[] = [
  { value: 'light',     label: '☀ Light'  },
  { value: 'medium',    label: '⛅ Med'   },
  { value: 'dark',      label: '🌑 Dark'  },
  { value: 'very-dark', label: '🌑 V.Dark' },
]

type FormValues = {
  name: string
  origin: string
  agtron: string
  roastLevel: RoastLevel
  baselineGrinds: Record<string, string>
  baselineTemp: string
  baselineHumidity: string
  isActive: boolean
}

type FormErrors = Partial<Record<string, string>>

interface BeanFormProps {
  initialBean?: BeanProfile
  grinders: GrinderConfig[]
  onSave: (bean: BeanProfile) => void
  onHide?: () => void
  onDelete?: () => void
}

function initValues(bean: BeanProfile | undefined, grinders: GrinderConfig[]): FormValues {
  if (bean) {
    return {
      name: bean.name,
      origin: bean.origin,
      agtron: String(bean.agtron),
      roastLevel: bean.roastLevel,
      baselineGrinds: Object.fromEntries(
        grinders.map((g) => [g.id, String(bean.baselineGrinds[g.id] ?? '')])
      ),
      baselineTemp: String(bean.baselineTemp),
      baselineHumidity: String(bean.baselineHumidity),
      isActive: bean.isActive,
    }
  }
  return {
    name: '',
    origin: '',
    agtron: '',
    roastLevel: 'medium',
    baselineGrinds: Object.fromEntries(grinders.map((g) => [g.id, ''])),
    baselineTemp: '',
    baselineHumidity: '',
    isActive: true,
  }
}

function validate(values: FormValues, grinders: GrinderConfig[]): FormErrors {
  const errors: FormErrors = {}
  if (!values.name.trim()) errors.name = 'Required'
  if (!values.origin.trim()) errors.origin = 'Required'
  const agt = Number(values.agtron)
  if (!values.agtron || isNaN(agt) || !Number.isInteger(agt) || agt < 0 || agt > 100)
    errors.agtron = 'Must be an integer 0–100'
  grinders.forEach((g) => {
    const raw = values.baselineGrinds[g.id]
    const val = Number(raw)
    if (!raw || isNaN(val) || val <= 0) {
      errors[`grind_${g.id}`] = 'Required, > 0'
    } else if (Math.round(val * 10) / 10 !== val) {
      errors[`grind_${g.id}`] = 'Max 1 decimal place'
    }
  })
  const temp = Number(values.baselineTemp)
  if (!values.baselineTemp || isNaN(temp) || temp < -40 || temp > 80)
    errors.baselineTemp = 'Must be −40 to 80'
  const hum = Number(values.baselineHumidity)
  if (!values.baselineHumidity || isNaN(hum) || hum < 0 || hum > 100)
    errors.baselineHumidity = 'Must be 0–100'
  return errors
}

function allRequiredFilled(values: FormValues, grinders: GrinderConfig[]): boolean {
  if (!values.name.trim() || !values.origin.trim() || !values.agtron) return false
  if (grinders.some((g) => !values.baselineGrinds[g.id])) return false
  if (!values.baselineTemp || !values.baselineHumidity) return false
  return true
}

export function BeanForm({ initialBean, grinders, onSave, onHide, onDelete }: BeanFormProps) {
  const isEditMode = !!initialBean
  const [values, setValues] = useState<FormValues>(() => initValues(initialBean, grinders))
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)
  const confirmRef = useRef<HTMLDivElement>(null)

  // Dismiss confirm-delete when clicking anywhere outside the confirmation row
  useEffect(() => {
    if (!confirmDelete) return
    function handleClickOutside(e: MouseEvent) {
      if (confirmRef.current && !confirmRef.current.contains(e.target as Node)) {
        setConfirmDelete(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [confirmDelete])

  const isSaveEnabled =
    allRequiredFilled(values, grinders) &&
    Object.keys(validate(values, grinders)).length === 0

  function handleBlur(field: string) {
    setTouched((t) => ({ ...t, [field]: true }))
    setErrors(validate(values, grinders))
  }

  function handleSubmit() {
    const errs = validate(values, grinders)
    setErrors(errs)
    setTouched(Object.keys(errs).reduce<Record<string, boolean>>((a, k) => ({ ...a, [k]: true }), {}))
    if (Object.keys(errs).length > 0) return
    const bean: BeanProfile = {
      ...(initialBean ?? {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      }),
      name: values.name.trim(),
      origin: values.origin.trim(),
      agtron: parseInt(values.agtron, 10),
      roastLevel: values.roastLevel,
      baselineGrinds: Object.fromEntries(
        grinders.map((g) => [g.id, parseFloat(values.baselineGrinds[g.id])])
      ),
      baselineTemp: parseFloat(values.baselineTemp),
      baselineHumidity: parseFloat(values.baselineHumidity),
      isActive: values.isActive,
    }
    onSave(bean)
  }

  const inputCls = 'w-full bg-[var(--card3)] border border-[var(--border)] rounded-[7px] px-[9px] py-[7px] text-[12px] text-[var(--text)] outline-none focus:border-[var(--red)]'
  const labelCls = 'block text-[9px] text-[var(--text2)] uppercase tracking-[.5px] mb-[3px]'
  const sectionCls = 'text-[9px] font-bold uppercase tracking-[.8px] text-[var(--text3)] mt-[12px] mb-[7px] flex items-center gap-[6px]'

  return (
    <div className="flex flex-col">
      {/* Name */}
      <div className="mb-[9px]">
        <label htmlFor="bf-name" className={labelCls}>Name</label>
        <input
          id="bf-name"
          aria-label="Name"
          className={inputCls}
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          onBlur={() => handleBlur('name')}
          placeholder="e.g. Ethiopia Yirgacheffe"
        />
        {touched.name && errors.name && <p className="text-[10px] text-[var(--red)] mt-[2px]">{errors.name}</p>}
      </div>

      {/* Origin + Agtron row */}
      <div className="flex gap-[7px] mb-[9px]">
        <div style={{ flex: '1.4' }}>
          <label htmlFor="bf-origin" className={labelCls}>Origin</label>
          <input
            id="bf-origin"
            aria-label="Origin"
            className={inputCls}
            value={values.origin}
            onChange={(e) => setValues((v) => ({ ...v, origin: e.target.value }))}
            onBlur={() => handleBlur('origin')}
            placeholder="e.g. Ethiopia"
          />
          {touched.origin && errors.origin && <p className="text-[10px] text-[var(--red)] mt-[2px]">{errors.origin}</p>}
        </div>
        <div style={{ flex: '1' }}>
          <label htmlFor="bf-agtron" className={labelCls}>Agtron</label>
          <input
            id="bf-agtron"
            aria-label="Agtron"
            type="number"
            className={inputCls}
            value={values.agtron}
            onChange={(e) => setValues((v) => ({ ...v, agtron: e.target.value }))}
            onBlur={() => handleBlur('agtron')}
            placeholder="0–100"
          />
          {touched.agtron && errors.agtron && <p className="text-[10px] text-[var(--red)] mt-[2px]">{errors.agtron}</p>}
        </div>
      </div>

      {/* Roast Level */}
      <div className="mb-[9px]">
        <div className={labelCls}>Roast Level</div>
        <div className="flex gap-[5px] mt-[3px]">
          {ROAST_LEVELS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setValues((v) => ({ ...v, roastLevel: value }))}
              className={`flex-1 rounded-[6px] py-[5px] px-[4px] text-[9px] text-center border transition-colors
                ${values.roastLevel === value
                  ? 'bg-[var(--red-soft)] border-[var(--red)] text-[var(--text)]'
                  : 'bg-[var(--card3)] border-[var(--border)] text-[var(--text2)]'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Baseline Grind section */}
      <div className={sectionCls}>
        Baseline Grind
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>
      {grinders.map((g, i) => (
        <div key={g.id} className="flex items-center bg-[var(--card3)] border border-[var(--border)] rounded-[8px] px-[9px] py-[7px] mb-[6px] gap-[8px]">
          <div
            className="w-[8px] h-[8px] rounded-full flex-shrink-0"
            style={{ background: GRINDER_COLORS[i] ?? '#9a9aa8' }}
          />
          <span className="text-[11px] text-[var(--text2)] flex-1">{g.label}</span>
          <input
            aria-label={g.label}
            type="number"
            step="0.5"
            className="bg-transparent text-[14px] font-bold text-[var(--text)] text-right w-[50px] outline-none"
            value={values.baselineGrinds[g.id] ?? ''}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                baselineGrinds: { ...v.baselineGrinds, [g.id]: e.target.value },
              }))
            }
            onBlur={() => handleBlur(`grind_${g.id}`)}
            placeholder="0"
          />
          <span className="text-[10px] text-[var(--text3)]">steps</span>
          {touched[`grind_${g.id}`] && errors[`grind_${g.id}`] && (
            <p className="text-[10px] text-[var(--red)]">{errors[`grind_${g.id}`]}</p>
          )}
        </div>
      ))}

      {/* Baseline Conditions */}
      <div className={sectionCls} style={{ marginTop: '4px' }}>
        Baseline Conditions
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>
      <div className="flex gap-[7px] mb-[9px]">
        <div className="flex-1">
          <label htmlFor="bf-temp" className={labelCls}>Temp (°C)</label>
          <input
            id="bf-temp"
            aria-label="Temp"
            type="number"
            className={inputCls}
            value={values.baselineTemp}
            onChange={(e) => setValues((v) => ({ ...v, baselineTemp: e.target.value }))}
            onBlur={() => handleBlur('baselineTemp')}
            placeholder="25"
          />
          {touched.baselineTemp && errors.baselineTemp && <p className="text-[10px] text-[var(--red)] mt-[2px]">{errors.baselineTemp}</p>}
        </div>
        <div className="flex-1">
          <label htmlFor="bf-humidity" className={labelCls}>Humidity (%)</label>
          <input
            id="bf-humidity"
            aria-label="Humidity"
            type="number"
            className={inputCls}
            value={values.baselineHumidity}
            onChange={(e) => setValues((v) => ({ ...v, baselineHumidity: e.target.value }))}
            onBlur={() => handleBlur('baselineHumidity')}
            placeholder="60"
          />
          {touched.baselineHumidity && errors.baselineHumidity && <p className="text-[10px] text-[var(--red)] mt-[2px]">{errors.baselineHumidity}</p>}
        </div>
      </div>

      {/* Active toggle */}
      <div className="flex items-center justify-between bg-[var(--card3)] border border-[var(--border)] rounded-[8px] px-[10px] py-[8px] mb-[9px]">
        <span className="text-[12px] text-[var(--text)]">Active</span>
        <button
          type="button"
          onClick={() => setValues((v) => ({ ...v, isActive: !v.isActive }))}
          className={`w-[32px] h-[18px] rounded-[9px] relative transition-colors ${values.isActive ? 'bg-[#4ade80]' : 'bg-[var(--text3)]'}`}
        >
          <span
            className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all ${values.isActive ? 'right-[2px]' : 'left-[2px]'}`}
          />
        </button>
      </div>

      {/* Primary action */}
      <button
        type="button"
        disabled={!isSaveEnabled}
        onClick={handleSubmit}
        className="w-full bg-[var(--red)] rounded-[9px] py-[10px] text-[13px] font-bold text-white mt-[4px] disabled:opacity-40"
      >
        {isEditMode ? 'Save Changes' : 'Add Bean'}
      </button>

      {/* Edit-only: Hide */}
      {isEditMode && onHide && (
        <button
          type="button"
          onClick={onHide}
          className="w-full text-center mt-[8px] text-[11px] text-[var(--text3)]"
        >
          Hide Bean Profile
        </button>
      )}

      {/* Edit-only: Delete (with confirm flow) */}
      {isEditMode && onDelete && !confirmDelete && (
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="w-full text-center mt-[4px] text-[11px] text-[var(--red)] opacity-60"
        >
          Delete Permanently
        </button>
      )}
      {isEditMode && onDelete && confirmDelete && (
        <div ref={confirmRef} className="mt-[8px] bg-[rgba(204,36,36,0.1)] border border-[rgba(204,36,36,0.3)] rounded-[8px] px-[10px] py-[8px]">
          <p className="text-[11px] text-[var(--text2)] mb-[7px]">Are you sure? This cannot be undone.</p>
          <div className="flex gap-[7px]">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="flex-1 text-[11px] text-[var(--text3)] bg-[var(--card3)] border border-[var(--border)] rounded-[7px] py-[6px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex-1 text-[11px] text-white bg-[var(--red)] rounded-[7px] py-[6px] font-bold"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/components/bean-profile/BeanForm.test.tsx
```

Expected: all 10 tests PASS.

> **Troubleshooting:** If `aria-label` lookups for "Junior" don't match, ensure the `aria-label` prop on the grinder input equals `g.label` exactly. If the save button stays disabled during the test despite filling all fields, add a `console.log(validate(values, grinders))` in `handleSubmit` to see which validation is failing.

- [ ] **Step 5: Commit**

```bash
git add src/components/bean-profile/BeanForm.tsx src/components/bean-profile/BeanForm.test.tsx
git commit -m "feat: add BeanForm component with validation and confirm-delete flow"
```

---

## Chunk 6: BeanDrawer + BeanProfiles Page

### Task 8: BeanDrawer component + tests

**Files:**
- Create: `src/components/bean-profile/BeanDrawer.tsx`
- Create: `src/components/bean-profile/BeanDrawer.test.tsx`
- Create: `src/components/bean-profile/index.ts`

- [ ] **Step 1: Write failing tests**

Create `src/components/bean-profile/BeanDrawer.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BeanDrawer } from './BeanDrawer'
import type { BeanProfile } from '@/types/bean'
import type { GrinderConfig } from '@/types/grinder'

// Mock the store — BeanDrawer reads addBean/updateBean/deleteBean from it
vi.mock('@/store/useAppStore', () => ({
  useAppStore: vi.fn(() => ({
    addBean: vi.fn(),
    updateBean: vi.fn(),
    deleteBean: vi.fn(),
  })),
}))

const grinders: GrinderConfig[] = [
  { id: 'grinder-a', label: 'Junior', roastLevel: 'light', grinderType: 'stepped', baselineGrind: 18, tempCoefficient: 0.15, humidityCoefficient: 0.05, isActive: true },
]

const bean: BeanProfile = {
  id: 'b1',
  name: 'Ethiopia Yirgacheffe',
  origin: 'Ethiopia',
  agtron: 78,
  roastLevel: 'light',
  baselineGrinds: { 'grinder-a': 18 },
  baselineTemp: 25,
  baselineHumidity: 60,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
}

describe('BeanDrawer', () => {
  it('shows "Edit Bean Profile" title in edit mode', () => {
    render(<BeanDrawer mode="edit" bean={bean} grinders={grinders} onClose={vi.fn()} />)
    expect(screen.getByText('Edit Bean Profile')).toBeTruthy()
  })

  it('shows bean name as subtitle in edit mode', () => {
    render(<BeanDrawer mode="edit" bean={bean} grinders={grinders} onClose={vi.fn()} />)
    expect(screen.getByText('Ethiopia Yirgacheffe')).toBeTruthy()
  })

  it('shows "New Bean Profile" title in add mode', () => {
    render(<BeanDrawer mode="add" grinders={grinders} onClose={vi.fn()} />)
    expect(screen.getByText('New Bean Profile')).toBeTruthy()
  })

  it('calls onClose when ✕ button is clicked', async () => {
    const onClose = vi.fn()
    render(<BeanDrawer mode="add" grinders={grinders} onClose={onClose} />)
    await userEvent.click(screen.getByLabelText('Close drawer'))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/components/bean-profile/BeanDrawer.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/components/bean-profile/BeanDrawer.tsx`**

```tsx
import { useAppStore } from '@/store/useAppStore'
import { BeanForm } from './BeanForm'
import type { BeanProfile } from '@/types/bean'
import type { GrinderConfig } from '@/types/grinder'

interface BeanDrawerProps {
  mode: 'add' | 'edit'
  bean?: BeanProfile
  grinders: GrinderConfig[]
  onClose: () => void
}

export function BeanDrawer({ mode, bean, grinders, onClose }: BeanDrawerProps) {
  const { addBean, updateBean, deleteBean } = useAppStore()

  function handleSave(saved: BeanProfile) {
    if (mode === 'add') {
      addBean(saved)
    } else {
      updateBean(saved)
    }
    onClose()
  }

  function handleHide() {
    if (!bean) return
    updateBean({ ...bean, isActive: false })
    onClose()
  }

  function handleDelete() {
    if (!bean) return
    deleteBean(bean.id)
    onClose()
  }

  return (
    <div className="flex flex-col h-full bg-[var(--card2)] border-l border-[var(--border)]">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-[var(--card2)] border-b border-[var(--border)] px-[14px] py-[12px] flex items-start justify-between">
        <div>
          <div className="text-[14px] font-bold text-[var(--text)]">
            {mode === 'add' ? 'New Bean Profile' : 'Edit Bean Profile'}
          </div>
          {mode === 'edit' && bean && (
            <div className="text-[11px] text-[var(--text2)] mt-[1px]">{bean.name}</div>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close drawer"
          className="text-[18px] text-[var(--text3)] leading-none ml-2 flex-shrink-0"
        >
          ✕
        </button>
      </div>

      {/* Scrollable form body */}
      <div className="flex-1 overflow-y-auto px-[14px] py-[14px]">
        <BeanForm
          initialBean={mode === 'edit' ? bean : undefined}
          grinders={grinders}
          onSave={handleSave}
          onHide={mode === 'edit' ? handleHide : undefined}
          onDelete={mode === 'edit' ? handleDelete : undefined}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `src/components/bean-profile/index.ts`**

```typescript
export { BeanCard } from './BeanCard'
export { BeanDrawer } from './BeanDrawer'
export { BeanForm } from './BeanForm'
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npx vitest run src/components/bean-profile/BeanDrawer.test.tsx
```

Expected: all 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/bean-profile/BeanDrawer.tsx src/components/bean-profile/BeanDrawer.test.tsx src/components/bean-profile/index.ts
git commit -m "feat: add BeanDrawer component and bean-profile index re-exports"
```

---

### Task 9 (pre-step): Add BeanProfiles page-level test for drawer card switching

The spec requires: "BeanDrawer switches bean when a different card is clicked while open (no close/reopen)." This behavior lives in `BeanProfiles.tsx` (calling `setDrawer({ mode: 'edit', bean })`), not in `BeanDrawer`. Add a page-level test.

**Files:**
- Create: `src/pages/BeanProfiles.test.tsx`

> Write this test **after** `BeanProfiles.tsx` is written (Task 9). The test goes here to keep the structure clean; create the file at the same time as the page.

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAppStore } from '@/store/useAppStore'
import { MOCK_BEANS, MOCK_GRINDERS } from '@/data/mockData'

// BeanProfiles uses react-router-dom's Outlet context — wrap in MemoryRouter
import { MemoryRouter } from 'react-router-dom'
import BeanProfiles from './BeanProfiles'

// Seed store before rendering
beforeEach(() => {
  useAppStore.setState({ beans: MOCK_BEANS, grinders: MOCK_GRINDERS, selectedBean: null, selectedGrinder: null })
})

describe('BeanProfiles page', () => {
  it('renders all bean cards', () => {
    render(<MemoryRouter><BeanProfiles /></MemoryRouter>)
    expect(screen.getByText('Ethiopia Yirgacheffe')).toBeTruthy()
    expect(screen.getByText('Colombia Huila')).toBeTruthy()
  })

  it('opens drawer when a card is clicked', async () => {
    render(<MemoryRouter><BeanProfiles /></MemoryRouter>)
    await userEvent.click(screen.getByText('Colombia Huila'))
    expect(screen.getByText('Edit Bean Profile')).toBeTruthy()
  })

  it('switches drawer bean when a different card is clicked while drawer is open', async () => {
    render(<MemoryRouter><BeanProfiles /></MemoryRouter>)
    // Open drawer on first bean
    await userEvent.click(screen.getByText('Ethiopia Yirgacheffe'))
    expect(screen.getByText('Edit Bean Profile')).toBeTruthy()
    // Click a different bean — drawer should switch without closing
    await userEvent.click(screen.getByText('Colombia Huila'))
    // Drawer should still be open, showing the new bean name in the subtitle
    expect(screen.getByText('Edit Bean Profile')).toBeTruthy()
    // The subtitle now shows Colombia Huila — confirm by finding multiple instances
    const colHuilaText = screen.getAllByText('Colombia Huila')
    expect(colHuilaText.length).toBeGreaterThan(0)
  })

  it('closes drawer when ✕ is clicked', async () => {
    render(<MemoryRouter><BeanProfiles /></MemoryRouter>)
    await userEvent.click(screen.getByText('Colombia Huila'))
    await userEvent.click(screen.getByLabelText('Close drawer'))
    expect(screen.queryByText('Edit Bean Profile')).toBeNull()
  })
})
```

Add `src/pages/BeanProfiles.test.tsx` to the File Map entry as well. Add it to the commit in Task 9 Step 5.

---

### Task 9: Replace BeanProfiles page

**Files:**
- Replace: `src/pages/BeanProfiles.tsx`

> The current file is a static mockup. Replace it entirely — the local types and local mock data inside it are not used going forward.

- [ ] **Step 1: Replace `src/pages/BeanProfiles.tsx` with the full implementation**

```tsx
import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { MOCK_BEANS, MOCK_GRINDERS } from '@/data/mockData'
import { BeanCard, BeanDrawer } from '@/components/bean-profile'
import type { BeanProfile } from '@/types/bean'

type DrawerState =
  | null
  | { mode: 'add' }
  | { mode: 'edit'; bean: BeanProfile }

export default function BeanProfiles() {
  const { beans, grinders, setBeans, setGrinders } = useAppStore()

  // Seed store on first mount — same pattern as Dashboard
  useEffect(() => {
    if (grinders.length === 0) setGrinders(MOCK_GRINDERS)
    if (beans.length === 0) setBeans(MOCK_BEANS)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [drawer, setDrawer] = useState<DrawerState>(null)

  const activeCount = beans.filter((b) => b.isActive).length
  const hiddenCount = beans.filter((b) => !b.isActive).length

  function handleCardClick(bean: BeanProfile) {
    // If drawer is already open, switch to the new bean in place — no close/reopen
    setDrawer({ mode: 'edit', bean })
  }

  const drawerIsOpen = drawer !== null

  return (
    <div
      className="flex overflow-hidden"
      style={{ background: 'var(--bg)', height: 'calc(100vh - 57px)' }}
    >
      {/* Left: grid area */}
      <div
        className="flex-1 overflow-y-auto px-4 pt-4 pb-8"
        style={{ opacity: drawerIsOpen ? 0.4 : 1, transition: 'opacity 180ms' }}
      >
        {/* Page header */}
        <div className="flex items-center justify-between mb-[14px]">
          <div>
            <h1 className="text-[18px] font-black text-white">Bean Profiles</h1>
            <p className="text-[11px] text-[var(--text2)]">
              {activeCount} active · {hiddenCount} hidden
            </p>
          </div>
          <button
            onClick={() => setDrawer({ mode: 'add' })}
            className="bg-[var(--red)] text-white text-[12px] font-bold px-[14px] py-[7px] rounded-[9px]"
          >
            + Add Bean
          </button>
        </div>

        {/* 2-column card grid */}
        <div className="grid grid-cols-2 gap-[9px]">
          {beans.map((bean) => (
            <BeanCard
              key={bean.id}
              bean={bean}
              grinders={grinders}
              isSelected={
                drawer !== null &&
                drawer.mode === 'edit' &&
                drawer.bean.id === bean.id
              }
              onClick={() => handleCardClick(bean)}
            />
          ))}
          {/* Ghost "add" card — only when drawer is closed */}
          {!drawerIsOpen && (
            <button
              onClick={() => setDrawer({ mode: 'add' })}
              className="border-[1.5px] border-dashed border-[var(--border2)] rounded-[13px] p-3 text-[var(--text3)] text-[13px] flex items-center justify-center min-h-[120px] hover:border-[var(--red)] hover:text-[var(--red)] transition-colors"
            >
              + Add Bean
            </button>
          )}
        </div>
      </div>

      {/* Right: drawer — 300 px fixed; full-width overlay on mobile */}
      {drawerIsOpen && (
        <div className="flex-shrink-0 h-full overflow-hidden sm:relative sm:w-[300px] absolute right-0 top-0 w-full z-10">
          <BeanDrawer
            mode={drawer.mode}
            bean={drawer.mode === 'edit' ? drawer.bean : undefined}
            grinders={grinders}
            onClose={() => setDrawer(null)}
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run tsc — 0 errors**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: all tests PASS (grindCalculator ×7, store ×6, BeanCard ×5, BeanForm ×10, BeanDrawer ×4).

- [ ] **Step 4: Smoke-test in browser**

With `npm run dev` running, verify:
1. `🫘 Beans` tab visible in nav; clicking it goes to `/beans`
2. Grid shows 4 bean cards with grind chips (`Jr`/`Ze`/`Ti`) and correct values
3. Click a card → drawer opens on the right at 300 px; grid dims to ~40% opacity
4. Clicking a different card while drawer is open switches the drawer (no animation gap)
5. ✕ closes the drawer; grid returns to full opacity
6. "Save Changes" updates the card immediately
7. "+ Add Bean" → drawer opens in add mode (no Hide/Delete buttons)
8. Fill valid form → "Add Bean" → new bean prepended to grid, drawer closes
9. Edit a bean → "Hide Bean Profile" → card goes semi-transparent; stats counter updates
10. Edit a bean → "Delete Permanently" → confirmation row appears → "Confirm Delete" → bean disappears
11. Navigate to `☕ Brew` and back to `🫘 Beans` — beans are preserved (conditional seeding)

- [ ] **Step 5: Commit**

```bash
git add src/pages/BeanProfiles.tsx src/pages/BeanProfiles.test.tsx
git commit -m "feat: implement BeanProfiles CRUD page with side drawer"
```

---

## Chunk 7: Final Verification

### Task 10: Full test suite + typecheck

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```

Expected: all tests PASS — zero failures, zero skipped. (grindCalculator ×7, store ×6, BeanCard ×6, BeanForm ×11, BeanDrawer ×4, BeanProfiles ×4)

- [ ] **Step 2: TypeScript check (app)**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: TypeScript check (API)**

```bash
npx tsc -p tsconfig.api.json
```

Expected: 0 errors (API files were not touched).

- [ ] **Step 4: Inform user**

Feature is complete on branch `feature/bean-profiles`. Inform the user:
- Branch name: `feature/bean-profiles`
- They can squash-merge into `develop` themselves, or ask to merge directly.

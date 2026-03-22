# GrindIQ Frontend — Accomplishments (2026-03-19)

## What Was Built

### PR #2 — Dashboard Page (GrindIQ Barista Screen)

**Merged:** `8fcfba2`

Full implementation of the primary barista screen from the `mockup-dashboard.html` design.

**New files:**
- `src/index.css` — Design token system via CSS custom properties (`--bg`, `--card`, `--red`, `--green`, `--muted`, etc.) + `sensor-pulse` keyframe
- `src/data/mockData.ts` — 3 grinders (A/light/stepped, B/medium/stepless, C/dark/stepped) + 4 beans (Ethiopia Yirgacheffe, Colombia Huila [active], Sumatra Mandheling, Kenya AA Kirinyaga)
- `src/components/ui/Badge.tsx` — Adjustment chip with `pos` / `neg` / `zero` variants
- `src/components/grinder/GrinderSelector.tsx` — Red gradient card: dynamic grinder tabs from Zustand store, 96px live grind number, decorative bar chart, adjustment chips
- `src/components/calculator/GrindRecommendation.tsx` — 3-column SVG arc gauge row (Temperature / Humidity / Agtron) with live calculations
- `src/components/sensor/SensorStatus.tsx` — Compact header pill + bottom-sheet modal (loading skeleton, connected/disconnected states, manual override inputs)
- `src/components/feedback/ShotFeedback.tsx` — Fixed bottom bar with two-step flow: select Under/Perfect/Over → tap "Log Shot" to persist
- `src/pages/Dashboard.tsx` — Full page: seeds mock data on mount, composes all components + inline `BeanCard` 2×2 grid
- `src/App.tsx` — `createBrowserRouter` with `AppShell` (sticky blur header: logo + NavLink tabs + SensorStatus pill) and `Outlet`

**Key decisions:**
- Hybrid mock data — same shape as future API types, swappable via env flag
- Sensor reads from existing `useSensor` hook (`VITE_DEV_SENSOR_BYPASS=true`)
- Two-step shot feedback UX (select then log) to prevent accidental logging
- `setSelectedGrinder` does NOT reset `selectedBean` (fixed store action)
- Bean selection sets both `selectedBean` + `selectedGrinder` atomically

---

### PR #3 — ShotLog Page

**Merged:** `29bd43c`

Full implementation of the shot history screen from the `mockup-shotlog.html` design.

**New files:**
- `src/components/shot-log/StatsCard.tsx` — Red gradient card: today's shot count, perfect-rate %, segmented feedback bar, mini bar chart of last 12 shots
- `src/components/shot-log/FilterStrip.tsx` — Horizontally scrollable pill strip: All / Perfect / Under / Over feedback filters + dynamic grinder chips (derived from Zustand store, not hardcoded)
- `src/components/shot-log/ShotRow.tsx` — Shot row with colour-accent left bar, bean name, grinder tag, feedback badge, grind number display
- `src/components/shot-log/DetailDrawer.tsx` — Bottom-sheet drawer: 80px grind hero, live-recomputed adjustment gauges (3×SVG arc), 5 detail rows (feedback, grinder, bean, temp, humidity), close button
- `src/components/shot-log/formatGrind.ts` — `fmtGrind()` utility: stepped grinders → integer, stepless → 1 decimal place
- `src/components/shot-log/index.ts` — Barrel exports
- `src/pages/ShotLog.tsx` — Full page: seeds 18 mock shots across 3 days only when store is empty, date-grouped list, filter state, drawer state

**Key decisions:**
- Seed mock shots only if store is empty — real shots from Dashboard show if present
- Grinder filter chips are dynamic from the store (not hardcoded A/B/C)
- Adjustment gauges in detail drawer recompute live from stored `temp`/`humidity` + bean baselines via `calculateGrind()`

---

## Architecture Summary

```
src/
├── data/mockData.ts          — Grinders, beans, shots (mock seed)
├── store/useAppStore.ts      — Zustand: grinders, beans, sensor, shots, selection
├── hooks/useSensor.ts        — ESP32 DHT22 (mocked in dev)
├── utils/grindCalculator.ts  — Core calculation logic (tested)
├── components/
│   ├── ui/Badge.tsx          — Adjustment chip
│   ├── grinder/              — GrinderSelector
│   ├── calculator/           — GrindRecommendation (gauges)
│   ├── sensor/               — SensorStatus (pill + modal)
│   ├── feedback/             — ShotFeedback (log bar)
│   └── shot-log/             — StatsCard, FilterStrip, ShotRow, DetailDrawer
└── pages/
    ├── Dashboard.tsx         — Primary barista screen
    └── ShotLog.tsx           — Shot history page
```

## Tests

- `grindCalculator.test.ts` — 9 tests, all passing
- Build: Vite production build clean (no type errors)

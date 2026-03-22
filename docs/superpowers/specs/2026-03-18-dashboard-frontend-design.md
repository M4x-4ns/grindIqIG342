# GrindIQ Dashboard Frontend — Design Spec
**Date:** 2026-03-18
**Status:** Approved

---

## Overview

Implement the Dashboard page of the GrindIQ React app by filling the existing component slot architecture. The Dashboard is the primary barista screen (PRD §F-01–F-04): grinder selection, environmental sensor display, grind recommendation, and shot feedback logging.

**Scope:** Dashboard page only (ShotLog and BeanProfiles are Phase 2).

---

## Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Data strategy | Hybrid mock | Works standalone; same shape as API types; swappable via env flag |
| Component structure | Fill existing slots | Matches project architecture; each unit is independently testable |
| Shot logging | Persist to Zustand store | Feeds ShotLog page when built in Phase 2 |
| Sensor | Use existing `useSensor` hook | `VITE_DEV_SENSOR_BYPASS=true` already set in `.env.local` |

---

## File Structure

```
src/
├── components/
│   ├── ui/
│   │   ├── Card.tsx              # Dark container with border
│   │   ├── Button.tsx            # Variants: primary | ghost | feedback
│   │   └── Badge.tsx             # Adjustment tags e.g. "+0.25 temp"
│   ├── grinder/
│   │   └── GrinderSelector.tsx   # F-01: A/B/C selector cards
│   ├── sensor/
│   │   └── SensorStatus.tsx      # F-03: Temp + humidity tiles, manual fallback
│   ├── calculator/
│   │   └── GrindRecommendation.tsx  # F-02: Grind number + dTemp/dHumidity/dAgtron badges
│   └── feedback/
│       └── ShotFeedback.tsx      # F-04: Under/Perfect/Over + Log Shot
├── data/
│   └── mockData.ts               # Seed grinders (A/B/C) + one active BeanProfile
└── pages/
    └── Dashboard.tsx             # Composes all four components; loads mock data on mount
```

Each component directory's existing `index.ts` placeholder is replaced with a `.tsx` implementation file.

---

## Component Details

### `ui/Card.tsx`
Wrapper with dark background, subtle border, and padding. Accepts `title?: string` and `children`.

### `ui/Button.tsx`
Three variants:
- `primary` — amber accent fill (matches design system `--red` / action color)
- `ghost` — transparent with border
- `feedback` — large tap target, shows selected state with color highlight

### `ui/Badge.tsx`
Small pill showing an adjustment label and value. Color: green for positive, red for negative, gray for zero.

### `grinder/GrinderSelector.tsx`
Renders three grinder cards (A = Light/Stepped, B = Medium/Stepless, C = Dark/Stepped). Tapping a card calls `setSelectedGrinder(id)` on the Zustand store. Selected card has an amber border highlight.

Props: none (reads from store, writes to store).

### `sensor/SensorStatus.tsx`
- **Connected:** Shows two tiles — temperature (°C) and humidity (%).
- **Disconnected:** Shows manual number inputs for both values, writes to store via `setManualSensorReading()`.
- **Loading:** Shows skeleton tiles.

Props: none (reads `sensorState` from store).

### `calculator/GrindRecommendation.tsx`
Calls `calculateGrind(bean, grinder, temp, humidity)` from `utils/grindCalculator.ts`. Renders:
- Large grind setting number (`displayValue`)
- Three `Badge` components for `dTemp`, `dHumidity`, `dAgtron` adjustments
- Empty state if no grinder or bean is selected

Props: none (reads from store).

### `feedback/ShotFeedback.tsx`
Three feedback buttons (Under / Perfect / Over). One may be selected at a time. "Log Shot" button:
- Disabled until a feedback option is selected
- On press: writes a `ShotLog` entry to Zustand store; shows 2-second success toast
- Resets selection after logging

Props: none (reads grinder, bean, sensor, recommendation from store; calls `addShot()` on store).

---

## Data Flow

```
mockData.ts
    └── Dashboard.tsx (useEffect on mount)
            └── useAppStore.setState({ grinders, beans, selectedGrinderId, selectedBeanId })

useSensor() [polled every 30s, mocked in dev]
    └── useAppStore.sensorState

useAppStore
    ├── GrinderSelector  (read + write selectedGrinderId)
    ├── SensorStatus     (read sensorState, write manual override)
    ├── GrindRecommendation (read selectedGrinder, selectedBean, sensorState → calculate)
    └── ShotFeedback     (read recommendation + store refs → write new ShotLog)
```

---

## Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| No grinder selected | `GrindRecommendation` shows "Select a grinder to get a recommendation" |
| No active bean | Dashboard shows empty-state card: "Add a bean profile to get started" |
| Sensor disconnected | `SensorStatus` shows manual inputs; calculation still runs |
| Log Shot tapped before feedback selected | Button is disabled |

---

## Design System Mapping

Tailwind classes follow the existing dark theme in `index.css` and `tailwind.config.js`:
- Background: `bg-gray-950` (page), `bg-gray-900` (cards)
- Border: `border-gray-800`
- Text: `text-gray-100` (primary), `text-gray-400` (secondary)
- Accent / selected: `border-amber-400`, `text-amber-400`
- Feedback positive: `bg-green-900 text-green-300`
- Feedback negative: `bg-red-900 text-red-300`

---

## Out of Scope

- ShotLog page (Phase 2)
- BeanProfiles page (Phase 2)
- Real API calls (hybrid mock; wired later)
- New unit tests (existing `grindCalculator.test.ts` covers core logic)

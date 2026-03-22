# Bean Profiles CRUD — Design Spec

**Date:** 2026-03-21
**Status:** Approved
**Branch:** `feature/bean-profiles`
**PRD ref:** §F-07

---

## Overview

Implement the BeanProfiles page: a 2-column card grid with a side-drawer for add/edit. The page is owner/manager-facing — baristas view bean cards on the Dashboard; managers create and maintain them here.

---

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| List layout | 2-column card grid | Matches Dashboard bean cards; scannable at a glance |
| Add/edit flow | Side drawer (right) | Stays on same screen; no navigation; list dims behind drawer |
| Card content | Active dot · roast badge · name · origin · agtron · grind chips | Chips show all three baselines without opening the drawer |
| Form — grind section | Labelled grinder rows with colour dot | Compact, clear which value belongs to which machine |
| Data model | `baselineGrinds: Record<string, number>` | Replaces single `grinderId + baselineGrind`; each bean calibrated per machine |
| Store seeding | Seed from mock data when store is empty | Same pattern as Dashboard and ShotLog |

---

## Data Model Change

`src/types/bean.ts` — remove `grinderId` and `baselineGrind`, add `baselineGrinds`:

```typescript
// Before
interface BeanProfile {
  grinderId: string
  baselineGrind: number
  targetExtractionTime?: number
  // ...
}

// After
interface BeanProfile {
  baselineGrinds: Record<string, number>  // key = GrinderConfig.id
  targetExtractionTime?: number  // retained as optional; not shown in form, undefined on new beans
  // grinderId and baselineGrind removed; all other fields unchanged
}
```

`baselineGrinds` maps grinder IDs to their baseline grind value for this bean:
```typescript
// Example
{ 'grinder-a': 18, 'grinder-b': 22, 'grinder-c': 24 }
```

If a grinder ID is missing from the map, the grind calculator falls back to `grinder.baselineGrind`.

> **Note:** `targetExtractionTime` is retained on the type as optional and not exposed in the form. New beans have it set to `undefined`. Existing beans retain their value untouched.

---

## Grind Calculator Update

`src/utils/grindCalculator.ts` — update the baseline lookup:

```typescript
// Before
const baseline = bean.baselineGrind

// After
const baseline = bean.baselineGrinds[grinder.id] ?? grinder.baselineGrind
```

Also update `grindCalculator.test.ts` — the `mockBean` fixture uses `grinderId: 'a'` and `baselineGrind: 20`. Replace with `baselineGrinds: { 'a': 20 }` and remove `grinderId`.

---

## Mock Data Update

`src/data/mockData.ts` — replace `grinderId + baselineGrind` on each `MOCK_BEANS` entry with:
```typescript
baselineGrinds: {
  'grinder-a': <junior baseline>,
  'grinder-b': <zentis baseline>,
  'grinder-c': <timemore baseline>,
}
```
Remove `grinderId` from every mock bean entry.

---

## Dashboard Migration

`src/pages/Dashboard.tsx` and related components reference the removed fields. All of the following must be updated:

| Location | Old reference | Replacement |
|---|---|---|
| `Dashboard.tsx` `BeanCard` `assignedGrinder` | `grinders.find(g => g.id === bean.grinderId)` | Remove `assignedGrinder` — use `selectedGrinder` instead throughout the card |
| `Dashboard.tsx` `BeanCard` meta row | `{assignedGrinder?.grinderType} · grinder {assignedGrinder?.label}` | `{selectedGrinder?.grinderType} · grinder {selectedGrinder?.label}` (or hide when no grinder selected) |
| `Dashboard.tsx` grind display fallback | `bean.baselineGrind.toString()` | `bean.baselineGrinds[selectedGrinder?.id ?? grinders[0]?.id]?.toString() ?? '—'` |
| `Dashboard.tsx` `handleSelect` | Auto-selects `bean.grinderId` grinder on bean tap | Remove: bean tap no longer auto-selects a grinder; selected grinder is unchanged |
| `Dashboard.tsx` `useEffect` initial mount | `MOCK_GRINDERS.find(g => g.id === activeBean.grinderId)` for auto-grinder selection | Remove this lookup; do not auto-select a grinder based on the active bean on mount |
| `Dashboard.tsx` `useEffect` seeding | `setGrinders(MOCK_GRINDERS)` and `setBeans(MOCK_BEANS)` run unconditionally | **Must be made conditional:** `if (grinders.length === 0) setGrinders(MOCK_GRINDERS)` / `if (beans.length === 0) setBeans(MOCK_BEANS)` — otherwise navigating to the Dashboard overwrites any beans created or edited on the BeanProfiles page |
| `GrinderSelector.tsx` baseline display | `selectedBean.baselineGrind.toFixed(1)` | `selectedBean.baselineGrinds[grinder.id]?.toFixed(1) ?? grinder.baselineGrind.toFixed(1)` |

> **Behaviour change:** Previously, tapping a bean on the Dashboard auto-selected that bean's assigned grinder. With this change, tapping a bean only sets `selectedBean`; the grinder selection is unaffected.

---

## Store Changes

`src/store/useAppStore.ts` — add two actions alongside the existing `setBeans`:

| Action | Signature | Behaviour |
|---|---|---|
| `addBean` | `(bean: BeanProfile) => void` | Prepends to `beans` array |
| `updateBean` | `(bean: BeanProfile) => void` | Replaces the entry with matching `id`; also updates `selectedBean` if its `id` matches |

Hide is implemented as `updateBean` with `isActive: false`.

| Action | Signature | Behaviour |
|---|---|---|
| `deleteBean` | `(id: string) => void` | Removes the entry with matching `id` from `beans`; also clears `selectedBean` if its `id` matches |

> **Note:** `updateBean` must also update `selectedBean` when `bean.id === state.selectedBean?.id`, to keep the Dashboard grind display in sync.
>
> **Note:** `deleteBean` must clear `selectedBean` when `bean.id === state.selectedBean?.id`, to prevent Dashboard from referencing a deleted bean.

---

## Component Structure

> **Note:** The current `src/pages/BeanProfiles.tsx` is a static mockup used during design review. It will be replaced entirely by the implementation — its local types and mock data are not authoritative.

```
src/
├── pages/
│   └── BeanProfiles.tsx          # Page shell — layout, drawer open/close state
├── components/
│   └── bean-profile/
│       ├── index.ts              # Re-exports
│       ├── BeanCard.tsx          # One card in the grid
│       ├── BeanDrawer.tsx        # Drawer container (header + close, wraps BeanForm)
│       └── BeanForm.tsx          # All form fields; used for both add and edit
```

---

## Layout

```
┌────────────────────────────────────────────────────────────┐
│  Bean Profiles    [4 active · 1 hidden]        [+ Add Bean] │  ← page header
├──────────────────────────────────┬─────────────────────────┤
│  BeanCard  │  BeanCard           │                         │
│  BeanCard  │  BeanCard           │  BeanDrawer             │  ← 300 px fixed width
│  BeanCard  │  [+ ghost]          │  (edit or add)          │
│  (dimmed 40% opacity when open)  │                         │
└──────────────────────────────────┴─────────────────────────┘
```

- Drawer width: `300px` fixed. On viewports `< 640px`, the drawer goes full-width and overlays the grid (position absolute).
- Grid dims to `opacity: 0.4` when the drawer is open, but **keeps `pointer-events` active** so the user can tap a different card to switch beans without closing the drawer first.
- Clicking a card while the drawer is open switches the drawer to that bean (no close/reopen animation).
- ✕ button or completing an action closes the drawer and restores full grid opacity.

---

## BeanCard

Displays per bean (active and hidden):

| Element | Detail |
|---|---|
| Active dot | Green `#4ade80` when active, `var(--text3)` when hidden |
| Roast badge | Coloured pill — Light / Medium / Dark / V.Dark |
| Name | `13px font-bold` |
| Origin | `10px var(--muted)` |
| Agtron | Large `20px font-black` number + "Agtron" label |
| Grind chips | One chip per grinder: `Jr 18 · Ze 22 · Ti 24` — labels and colours resolved from `grinders` store array |
| Hidden state | `opacity: 0.45` on the whole card |

Grind chip rendering: iterate `grinders` from the store; look up `bean.baselineGrinds[g.id]`; display `g.label.slice(0,2)` + value. Skip the chip defensively if the entry is missing (should not happen for well-formed beans — all three baselines are required by the form).

---

## BeanDrawer + BeanForm

**Header:** title ("Edit Bean Profile" or "New Bean Profile"), bean name subtitle, ✕ close button. Sticky on scroll.

**Form fields in order:**

1. **Name** — text input, full width
2. **Origin** — text input, flex 1.4 | **Agtron** — number input, flex 1
3. **Roast Level** — 4-button inline picker. Button labels map to `RoastLevel` values: Light→`light`, Medium→`medium`, Dark→`dark`, V.Dark→`very-dark`. Selected state uses `var(--red-soft)` bg + `var(--red)` border. Default for new beans: `medium`.
4. **Baseline Grind** — section header with horizontal rule, then one row per grinder (iterated from `grinders` store):
   - Colour dot (resolved from grinder accent colour in component constants)
   - Grinder name
   - Number input (right-aligned)
   - "steps" unit label
5. **Baseline Conditions** — section header, then two inputs side by side: Temp (°C) · Humidity (%)
6. **Active toggle** — full-width row with label left, pill toggle right. Green when active. Default for new beans: `true`.

**Footer (sticky):**
- Primary: **Save Changes** (edit) / **Add Bean** (add) — `var(--red)` full-width button. Disabled while any required field is empty or invalid.
- Secondary: **Hide Bean Profile** — text-only, `var(--text3)`, edit mode only. Not shown on add form.
- Tertiary: **Delete Permanently** — text-only, `var(--red)` at reduced opacity (`opacity: 0.6`), edit mode only. Not shown on add form. Requires a confirmation step: clicking once shows an inline confirmation row ("Are you sure? This cannot be undone. [Confirm Delete]") before dispatching `deleteBean`. Closes the drawer on confirm.

> **Grinders in form:** Iterate the `grinders` array from the store to render the Baseline Grind rows. If the store's `grinders` is empty, seed it from `MOCK_GRINDERS` on page mount (same approach as seeding beans).

**`id` and `createdAt` generation:** The `BeanForm` component generates `id: crypto.randomUUID()` and `createdAt: new Date().toISOString()` when constructing the new bean payload before calling `onSave`.

---

## CRUD Behaviour

| Operation | Trigger | Store action |
|---|---|---|
| **Create** | "+ Add Bean" → fill form → Save | `addBean(newBean)` — `BeanForm` generates `id` + `createdAt` |
| **Read** | Page mounts; seeds `MOCK_BEANS` if `beans.length === 0`; seeds `MOCK_GRINDERS` if `grinders.length === 0` | `setBeans`, `setGrinders` |
| **Update** | Tap card → edit → Save | `updateBean(editedBean)` |
| **Hide** | "Hide Bean Profile" link in drawer | `updateBean({ ...bean, isActive: false })`, closes drawer |
| **Delete** | "Delete Permanently" → confirm step → "Confirm Delete" | `deleteBean(bean.id)`, closes drawer |

---

## Validation

| Field | Rule |
|---|---|
| Name | Required, non-empty string |
| Origin | Required, non-empty string |
| Agtron | Required, integer 0–100 |
| Roast Level | Required, one of `light / medium / dark / very-dark`. Default: `medium` |
| Baseline grind (each) | Required for all grinders, number > 0, up to 1 decimal place. The form always shows one input per grinder — all three must be filled. The calculator's `?? grinder.baselineGrind` fallback is defensive only. |
| Baseline temp | Required, number −40–80 |
| Baseline humidity | Required, number 0–100 |

Inline error messages appear below each invalid field on blur or on failed save attempt. Save button is disabled while any required field is empty.

---

## Testing

- `BeanCard` renders active and hidden states correctly
- `BeanCard` grind chips resolve labels and colours from `grinders` array (not from bean)
- `BeanForm` validates all fields; calls `onSave` with correct payload; `onHide` sets `isActive: false`
- `BeanDrawer` switches bean when a different card is clicked while open (no close/reopen)
- Store `addBean` prepends; `updateBean` replaces by id and updates `selectedBean` if matched
- Store `deleteBean` removes by id and clears `selectedBean` if matched
- `BeanForm` confirm-delete flow: first click shows inline confirmation; second click dispatches `deleteBean` and closes drawer; clicking elsewhere cancels confirmation state
- `grindCalculator` uses `bean.baselineGrinds[grinder.id]` and falls back to `grinder.baselineGrind`
- Update `grindCalculator.test.ts` mock bean: replace `grinderId`/`baselineGrind` with `baselineGrinds: { 'a': 20 }`
- `Dashboard.tsx` grind display falls back correctly when no grinder is selected

---

## Navigation

`src/App.tsx` — add a third `NavLink` to the tab bar between "📋 Log" and the `<SensorStatus />` pill:

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

---

## Out of Scope

- Persistence (Vercel Postgres) — Phase 3 backlog
- Reorder / drag-and-drop
- Image / photo per bean
- Barista-facing view (handled by Dashboard)

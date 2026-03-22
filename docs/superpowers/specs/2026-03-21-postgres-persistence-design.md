# GrindIQ — PostgreSQL Persistence Design

**Date:** 2026-03-21
**Feature:** Persist beans, grinders, and shot logs to Vercel PostgreSQL
**Branch:** `feature/postgres-persistence`

---

## Problem

All application data (beans, grinders, shot logs) is held exclusively in Zustand in-memory state, seeded from `src/data/mockData.ts` on each page load. A browser refresh or device restart wipes all user data.

## Solution

Add Vercel Serverless API routes backed by the existing Neon PostgreSQL database (`@vercel/postgres` is already installed). Zustand remains the client-side cache — components are unchanged. On app mount, a single `hydrateFromApi()` call fetches all data and populates the store.

---

## Scope

- **In scope:** beans CRUD, grinders read + upsert (seed only), shot log create + read, DB migration, first-launch grinder seeding, loading/saving states
- **Out of scope:** auth, user accounts, soft-delete audit log, pagination beyond 200 shots, grinder create/delete from UI, `baristaId` persistence (field exists in type but is not stored in DB)

---

## 1. Database Schema

Extends the existing `sensor_readings` table. Migration runs via `scripts/migrate.ts`.

### `grinders`

```sql
CREATE TABLE IF NOT EXISTS grinders (
  id                   TEXT PRIMARY KEY,
  label                TEXT NOT NULL,
  roast_level          TEXT NOT NULL,
  grinder_type         TEXT NOT NULL,
  baseline_grind       NUMERIC(5,2) NOT NULL,
  temp_coefficient     NUMERIC(5,4) NOT NULL,
  humidity_coefficient NUMERIC(5,4) NOT NULL,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

`created_at` exists in the DB for auditing but is **not** included in the `GrinderConfig` TypeScript interface. `mapGrinderRow` omits it when constructing the returned object.

### `beans`

```sql
CREATE TABLE IF NOT EXISTS beans (
  id                     TEXT PRIMARY KEY,
  name                   TEXT NOT NULL,
  origin                 TEXT NOT NULL,
  agtron                 INTEGER NOT NULL,
  roast_level            TEXT NOT NULL,
  baseline_grinds        JSONB NOT NULL DEFAULT '{}',
  baseline_temp          NUMERIC(5,2) NOT NULL,
  baseline_humidity      NUMERIC(5,2) NOT NULL,
  target_extraction_time INTEGER,
  is_active              BOOLEAN NOT NULL DEFAULT true,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

`baseline_grinds` is `JSONB` — mirrors `Record<string, number>` exactly, no join table required.

### `shot_logs`

```sql
CREATE TABLE IF NOT EXISTS shot_logs (
  id                TEXT PRIMARY KEY,
  bean_id           TEXT NOT NULL REFERENCES beans(id) ON DELETE CASCADE,
  grinder_id        TEXT NOT NULL REFERENCES grinders(id),
  recommended_grind NUMERIC(5,2) NOT NULL,
  actual_grind      NUMERIC(5,2) NOT NULL,
  temp              NUMERIC(5,2) NOT NULL,
  humidity          NUMERIC(5,2) NOT NULL,
  extraction_time   INTEGER,
  feedback          TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- `bean_id` → `ON DELETE CASCADE`: deleting a bean removes its shot logs
- `grinder_id` → no cascade: historical shots survive grinder config edits
- `feedback` values: `'under' | 'perfect' | 'over'`
- `barista_id` is **not** stored — `ShotLog.baristaId` is out of scope and `mapShotRow` returns `baristaId: undefined`

---

## 2. API Routes

Seven Vercel Serverless functions. All return `application/json`. Errors return `{ error: string }`.

### File layout

```
api/
├── _lib/
│   └── db.ts                  # Row mappers: snake_case DB rows → camelCase TS types
├── beans/
│   ├── index.ts               # GET /api/beans   — list all
│   │                          # POST /api/beans  — create one
│   └── [id].ts                # PUT /api/beans/:id    — full replace
│                              # DELETE /api/beans/:id — hard delete
├── grinders/
│   └── index.ts               # GET /api/grinders      — list all
│                              # POST /api/grinders     — upsert by id (seed use only)
└── shots/
    └── index.ts               # GET /api/shots  — list all, newest first, LIMIT 200
                               # POST /api/shots — create one
```

### Route table

| Route | Method | Request body | Success response |
|---|---|---|---|
| `/api/beans` | GET | — | `BeanProfile[]` (200) |
| `/api/beans` | POST | `BeanProfile` | `BeanProfile` (201) |
| `/api/beans/:id` | PUT | `BeanProfile` | `BeanProfile` (200) |
| `/api/beans/:id` | DELETE | — | `{ id: string }` (200) |
| `/api/grinders` | GET | — | `GrinderConfig[]` (200) |
| `/api/grinders` | POST | `GrinderConfig` | `GrinderConfig` (200) |
| `/api/shots` | GET | — | `ShotLog[]` (200) |
| `/api/shots` | POST | `ShotLog` | `ShotLog` (201) |

`POST /api/grinders` returns `200` (not `201`) because it is an upsert — it may update an existing row. This is a deliberate deviation from the `201` convention used for pure creates. No access restriction is applied — this is acceptable for a single-user, single-device app.

### Error codes

| Code | Meaning |
|---|---|
| 400 | Missing or invalid fields |
| 404 | Record not found (PUT / DELETE) |
| 405 | Wrong HTTP method |
| 500 | Database error |

### `api/_lib/db.ts` — shared row mapper

Converts snake_case Postgres rows to camelCase TypeScript types. Each resource gets a dedicated mapper function:

```typescript
mapGrinderRow(row): GrinderConfig
// Omits created_at — not part of GrinderConfig interface

mapBeanRow(row): BeanProfile
// Parses baseline_grinds JSONB → Record<string, number>
// Maps created_at → createdAt

mapShotRow(row): ShotLog
// Returns baristaId: undefined (not stored)
// Maps created_at → createdAt
```

---

## 3. Frontend Changes

### `src/services/apiService.ts` — full replacement of entity methods

The existing file contains `beanApi`, `grinderApi`, and `shotLogApi` object groups that use `PATCH` and conflict with the new route shapes. These are **removed entirely** and replaced with the following flat functions alongside the existing sensor methods:

```typescript
// Beans
fetchBeans(): Promise<BeanProfile[]>
createBean(bean: BeanProfile): Promise<BeanProfile>
updateBean(bean: BeanProfile): Promise<BeanProfile>   // PUT /api/beans/:id
deleteBean(id: string): Promise<void>

// Grinders
fetchGrinders(): Promise<GrinderConfig[]>
updateGrinder(grinder: GrinderConfig): Promise<GrinderConfig>  // POST /api/grinders (upsert)

// Shots
fetchShots(): Promise<ShotLog[]>
createShot(shot: ShotLog): Promise<ShotLog>
```

All use the existing Axios instance. On non-2xx, Axios throws — callers handle errors.

### `src/store/useAppStore.ts` — loading state + async actions

New state fields:

```typescript
isLoading: boolean      // true during initial hydration
isSaving: boolean       // true during any create/update/delete call
error: string | null    // set on hydration or mutation failure
```

New async actions (replace current synchronous equivalents):

```typescript
hydrateFromApi(): Promise<void>
// Guard: if (get().isLoading) return — prevents double-invoke in React Strict Mode
// Sets isLoading: true → calls fetchGrinders + fetchBeans + fetchShots in parallel (Promise.all)
// → populates store → isLoading: false
// On failure: sets error, isLoading: false

createBean(bean: BeanProfile): Promise<void>
updateBean(bean: BeanProfile): Promise<void>
deleteBean(id: string): Promise<void>
saveShot(shot: ShotLog): Promise<void>
// Each: isSaving: true → API call → update store slice → isSaving: false
// On failure: sets error, rethrows so calling component can react
```

Synchronous `addBean`, `updateBean`, `deleteBean`, `addShot` are **removed** from the store. `setGrinders`, `setBeans`, `setShots` remain for internal use by `hydrateFromApi`.

### `src/App.tsx` / `AppShell` — hydration on mount

`App.tsx` renders only `<RouterProvider router={router} />` and cannot call hooks directly. The `useEffect` and loading guard go in **`AppShell`** — the layout component that wraps all routes:

```typescript
// Inside AppShell component body:
const { hydrateFromApi, isLoading } = useAppStore()

useEffect(() => { hydrateFromApi() }, [])

if (isLoading) return <FullScreenSpinner />
```

Replaces all per-page `if (beans.length === 0) setBeans(MOCK_BEANS)` seeding guards in Dashboard, BeanProfiles, and ShotLog.

### `src/data/mockData.ts` — demoted

- `MOCK_GRINDERS` moves to `scripts/seed.ts`
- `MOCK_BEANS` and `MOCK_SHOTS` are deleted
- `mockData.ts` is deleted entirely

### Call site corrections

- **`BeanDrawer.tsx`** is the component that calls `addBean`, `updateBean`, `deleteBean` from the store. It has three store call sites that must all be migrated to async:
  - `handleSave` — calls `addBean` (new bean) or `updateBean` (edit). Replace with async `createBean` / `updateBean`.
  - `handleHide` — calls `updateBean({ ...bean, isActive: false })`. Replace with async `updateBean` (awaited, with `isSaving` lifecycle).
  - `handleDelete` — calls `deleteBean`. Replace with async `deleteBean`.
  - `BeanDrawer` reads `isSaving` from the store and passes it to `<BeanForm isSaving={isSaving} />` and disables its own footer buttons while true.
- **`BeanForm.tsx`** only calls `onSave(bean)` (a prop callback) — it needs no store subscription. An `isSaving?: boolean` prop is added to `BeanFormProps`. `BeanDrawer` passes `isSaving={isSaving}` and the submit button's `disabled` condition becomes `!isSaveEnabled || !!isSaving`.
- **`ShotFeedback.tsx`** calls `addShot` synchronously and fires a success toast immediately after. After migration to `saveShot`, the toast must fire **after** the promise resolves, not before. On rejection, show an error toast instead.

### Loading / saving UI

| State | Component | Behaviour |
|---|---|---|
| `isLoading: true` | `AppShell` | Full-screen spinner, router outlet hidden |
| `isSaving: true` | `BeanDrawer` | Footer save/delete buttons disabled |
| `isSaving: true` | `ShotFeedback` | Submit button disabled |
| `error` set | Any | Inline error message below the form |

---

## 4. Migration & Seeding

### `scripts/migrate.ts` — extended

Adds `CREATE TABLE IF NOT EXISTS` statements for `grinders`, `beans`, `shot_logs` in dependency order (grinders first, then beans, then shot_logs). Idempotent — safe to re-run.

**Important:** The existing `migrate.ts` calls `process.exit(0)` after the `sensor_readings` table block. This call must be **moved to the very end of the file**, after all three new table blocks and after the seed call, so execution is not terminated early.

### `scripts/seed.ts` — new file

Seeds the 3 grinders on first launch using **direct `sql` template literals** (not `POST /api/grinders`, which requires a running server):

```typescript
// 1. Check: SELECT COUNT(*) FROM grinders
// 2. If count === 0: INSERT INTO grinders (...) VALUES (...) ON CONFLICT (id) DO NOTHING
//    for each of the 3 MOCK_GRINDERS entries
// 3. If count > 0: no-op (idempotent)
```

Called at the end of `migrate.ts` before `process.exit(0)`. Single command handles both schema and seed: `npm run db:migrate`.

---

## 5. Testing

| File | What is tested |
|---|---|
| `api/beans/index.test.ts` | GET returns list; POST creates and returns row; 405 on wrong method |
| `api/beans/[id].test.ts` | PUT updates; DELETE removes; 404 on missing id |
| `api/grinders/index.test.ts` | GET returns list; POST upserts; 405 on wrong method |
| `api/shots/index.test.ts` | GET returns newest-first list; POST creates; 405 on wrong method |
| `src/store/useAppStore.test.ts` | `hydrateFromApi` populates store; double-invoke guard (isLoading); `createBean`/`updateBean`/`deleteBean`/`saveShot` update store on success; `isSaving` flag lifecycle |

API route tests mock `@vercel/postgres` using `vi.mock`. Store tests mock `apiService`.

**Note:** The existing `useAppStore.test.ts` tests for the synchronous `addBean`, `updateBean`, `deleteBean` actions are **replaced entirely** by the new async action tests above.

---

## 6. File Map

### New files

| File | Purpose |
|---|---|
| `api/_lib/db.ts` | Row mapper helpers |
| `api/beans/index.ts` | GET + POST beans |
| `api/beans/[id].ts` | PUT + DELETE bean |
| `api/grinders/index.ts` | GET + POST (upsert) grinders |
| `api/shots/index.ts` | GET + POST shots |
| `scripts/seed.ts` | First-launch grinder seed (direct SQL) |
| `api/beans/index.test.ts` | Bean list/create route tests |
| `api/beans/[id].test.ts` | Bean update/delete route tests |
| `api/grinders/index.test.ts` | Grinder route tests |
| `api/shots/index.test.ts` | Shot route tests |

### Modified files

| File | Change |
|---|---|
| `scripts/migrate.ts` | Add 3 `CREATE TABLE IF NOT EXISTS` blocks; move `process.exit(0)` to end; call `seed()` |
| `src/services/apiService.ts` | Remove `beanApi`/`grinderApi`/`shotLogApi`; add 8 new flat API functions |
| `src/store/useAppStore.ts` | Add loading state + async actions; remove sync `addBean`/`updateBean`/`deleteBean`/`addShot` |
| `src/store/useAppStore.test.ts` | Replace sync-action tests with async-action + isSaving/isLoading tests |
| `src/App.tsx` / `AppShell` | Add `hydrateFromApi()` on mount + full-screen spinner in `AppShell` |
| `src/pages/Dashboard.tsx` | Remove mock seeding guard |
| `src/pages/BeanProfiles.tsx` | Remove mock seeding guard |
| `src/pages/ShotLog.tsx` | Remove mock seeding guard |
| `src/components/bean-profile/BeanDrawer.tsx` | Call async `createBean`/`updateBean`/`deleteBean`; disable footer on `isSaving` |
| `src/components/bean-profile/BeanForm.tsx` | Disable submit button on `isSaving` |
| `src/components/feedback/ShotFeedback.tsx` | Replace `addShot` with `saveShot`; move toast to post-resolve; show error toast on rejection |

### Deleted files

| File | Reason |
|---|---|
| `src/data/mockData.ts` | Data moves to DB; grinders move to `scripts/seed.ts`; mock beans/shots dropped |

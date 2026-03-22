# PostgreSQL Persistence Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace in-memory Zustand mock-seeding with persistent Vercel PostgreSQL storage for beans, grinders, and shot logs.

**Architecture:** Seven Vercel Serverless API routes (REST) backed by Neon PostgreSQL. Zustand remains the client-side cache, hydrated once on app mount via `hydrateFromApi()`. All mutations go API-first, then update the store on success. The existing `api/sensor.ts` pattern (default export handler, `@vercel/postgres` sql template, VercelRequest/VercelResponse) is followed exactly.

**Tech Stack:** `@vercel/postgres` (already installed), `@vercel/node` types, Vitest + `vi.mock`, Zustand 5, React 19, TypeScript 5, `tsx` for scripts.

---

## Pre-flight: Branch Verification + tsconfig

### Task 0: Verify branch and extend tsconfig to cover `api/` and `scripts/`

**Files:**
- Modify: `tsconfig.node.json`

The default `tsconfig.node.json` only includes `vite.config.ts` and `vitest.config.ts`. The `api/` and `scripts/` directories are not covered, so `npx tsc --noEmit` would silently skip them. Add them now so every subsequent typecheck in this plan is meaningful.

- [ ] **Step 1: Verify you are on the correct branch**

```bash
git status && git branch
```

Expected: `* feature/postgres-persistence`. If not, run `git checkout feature/postgres-persistence`.

- [ ] **Step 2: Extend `tsconfig.node.json` include array**

Open `tsconfig.node.json`. The current `include` is:
```json
"include": ["vite.config.ts", "vitest.config.ts"]
```

Replace with:
```json
"include": ["vite.config.ts", "vitest.config.ts", "api/**/*", "scripts/**/*"]
```

- [ ] **Step 3: Verify tsconfig change compiles**

```bash
npx tsc -p tsconfig.node.json --noEmit
```

Expected: 0 errors (no `api/` or `scripts/` files exist yet — that's fine).

- [ ] **Step 4: Commit**

```bash
git add tsconfig.node.json
git commit -m "chore: extend tsconfig.node.json to include api/ and scripts/ for type checking"
```

---

## Chunk 1: DB Layer — Migration, Seed, Row Mappers

### Task 1: Extend `scripts/migrate.ts` and create `scripts/seed.ts`

**Files:**
- Modify: `scripts/migrate.ts`
- Create: `scripts/seed.ts`

No unit tests for these (they run against a real DB). Verified by `npx tsc --noEmit`.

- [ ] **Step 1: Rewrite `scripts/migrate.ts`**

Replace the entire file content. The key change: move `process.exit(0)` to the very end, after all tables are created and `seed()` is called.

```typescript
import { sql } from '@vercel/postgres'
import { seed } from './seed'

async function migrate(): Promise<void> {
  console.log('Running migration…')

  await sql`
    CREATE TABLE IF NOT EXISTS sensor_readings (
      id          serial      PRIMARY KEY,
      temperature float       NOT NULL,
      humidity    float       NOT NULL,
      created_at  timestamptz DEFAULT now()
    )
  `
  console.log('✓ sensor_readings table ready')

  await sql`
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
    )
  `
  console.log('✓ grinders table ready')

  await sql`
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
    )
  `
  console.log('✓ beans table ready')

  await sql`
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
    )
  `
  console.log('✓ shot_logs table ready')

  await seed()

  process.exit(0)
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
```

- [ ] **Step 2: Create `scripts/seed.ts`**

Uses direct `sql` template literals — NOT the API route (which isn't running at migration time). The seed is idempotent: checks row count before inserting.

```typescript
import { sql } from '@vercel/postgres'

const GRINDERS = [
  {
    id: 'grinder-a',
    label: 'Junior',
    roast_level: 'light',
    grinder_type: 'stepped',
    baseline_grind: 18,
    temp_coefficient: 0.15,
    humidity_coefficient: 0.05,
  },
  {
    id: 'grinder-b',
    label: 'Zentis',
    roast_level: 'medium',
    grinder_type: 'stepless',
    baseline_grind: 22,
    temp_coefficient: 0.15,
    humidity_coefficient: 0.05,
  },
  {
    id: 'grinder-c',
    label: 'Timemore',
    roast_level: 'dark',
    grinder_type: 'stepped',
    baseline_grind: 24,
    temp_coefficient: 0.15,
    humidity_coefficient: 0.05,
  },
]

export async function seed(): Promise<void> {
  console.log('Running seed…')

  const { rows } = await sql`SELECT COUNT(*)::int AS count FROM grinders`
  if ((rows[0] as { count: number }).count > 0) {
    console.log('✓ grinders already seeded — skipping')
    return
  }

  for (const g of GRINDERS) {
    await sql`
      INSERT INTO grinders
        (id, label, roast_level, grinder_type, baseline_grind, temp_coefficient, humidity_coefficient)
      VALUES
        (${g.id}, ${g.label}, ${g.roast_level}, ${g.grinder_type},
         ${g.baseline_grind}, ${g.temp_coefficient}, ${g.humidity_coefficient})
      ON CONFLICT (id) DO NOTHING
    `
  }

  console.log(`✓ seeded ${GRINDERS.length} grinders`)
}
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 errors (there will be errors about missing api files — that is expected until later tasks complete; focus on scripts/ errors only being 0).

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate.ts scripts/seed.ts
git commit -m "feat: extend migration with grinders/beans/shot_logs tables and seed"
```

---

### Task 2: Create `api/_lib/db.ts` row mappers

**Files:**
- Create: `api/_lib/db.ts`

These are pure functions — no DB calls, no side effects. Tested implicitly through API route tests in later chunks.

- [ ] **Step 1: Create `api/_lib/db.ts`**

Converts snake_case Postgres rows to camelCase TypeScript shapes. Use relative paths to reach `src/types/` (the `@` alias is only valid in `src/` at Vercel build time).

```typescript
import type { GrinderConfig } from '../../src/types/grinder'
import type { BeanProfile } from '../../src/types/bean'
import type { ShotLog } from '../../src/types/shot'

type Row = Record<string, unknown>

export function mapGrinderRow(row: Row): GrinderConfig {
  return {
    id:                  row['id'] as string,
    label:               row['label'] as string,
    roastLevel:          row['roast_level'] as GrinderConfig['roastLevel'],
    grinderType:         row['grinder_type'] as GrinderConfig['grinderType'],
    baselineGrind:       Number(row['baseline_grind']),
    tempCoefficient:     Number(row['temp_coefficient']),
    humidityCoefficient: Number(row['humidity_coefficient']),
    isActive:            row['is_active'] as boolean,
    // created_at intentionally omitted — not part of GrinderConfig interface
  }
}

export function mapBeanRow(row: Row): BeanProfile {
  return {
    id:                    row['id'] as string,
    name:                  row['name'] as string,
    origin:                row['origin'] as string,
    agtron:                Number(row['agtron']),
    roastLevel:            row['roast_level'] as BeanProfile['roastLevel'],
    baselineGrinds:        row['baseline_grinds'] as Record<string, number>,
    baselineTemp:          Number(row['baseline_temp']),
    baselineHumidity:      Number(row['baseline_humidity']),
    targetExtractionTime:  row['target_extraction_time'] != null
                             ? Number(row['target_extraction_time'])
                             : undefined,
    isActive:              row['is_active'] as boolean,
    createdAt:             row['created_at'] as string,
  }
}

export function mapShotRow(row: Row): ShotLog {
  return {
    id:               row['id'] as string,
    beanId:           row['bean_id'] as string,
    grinderId:        row['grinder_id'] as string,
    recommendedGrind: Number(row['recommended_grind']),
    actualGrind:      Number(row['actual_grind']),
    temp:             Number(row['temp']),
    humidity:         Number(row['humidity']),
    extractionTime:   row['extraction_time'] != null
                        ? Number(row['extraction_time'])
                        : undefined,
    feedback:         row['feedback'] as ShotLog['feedback'],
    baristaId:        undefined, // not persisted in DB — out of scope
    createdAt:        row['created_at'] as string,
  }
}
```

- [ ] **Step 2: Typecheck `api/` via the node tsconfig**

```bash
npx tsc -p tsconfig.node.json --noEmit
```

Expected: 0 errors in `api/_lib/db.ts`. Other api route files are not yet created — that is fine.

- [ ] **Step 3: Commit**

```bash
git add api/_lib/db.ts
git commit -m "feat: add DB row mapper helpers for grinders, beans, shot_logs"
```

---

## Chunk 2: API Routes — Grinders + Beans

### Task 3: `api/grinders/index.ts` with tests

**Files:**
- Create: `api/grinders/index.ts`
- Create: `api/grinders/index.test.ts`

The pattern to follow exactly: `api/sensor.ts` — default export handler function, `VercelRequest`/`VercelResponse` from `@vercel/node`, `sql` from `@vercel/postgres`, method guard at top, try/catch around DB calls.

- [ ] **Step 1: Write the failing tests**

Create `api/grinders/index.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

// Mock @vercel/postgres — sql is a tagged template literal; vi.fn() handles it
// because tagged templates call the function with (strings, ...values)
const mockSql = vi.fn()
vi.mock('@vercel/postgres', () => ({ sql: mockSql }))

import handler from './index'

// Helper: build a minimal mock VercelRequest
function makeReq(method: string, body?: unknown): VercelRequest {
  return { method, body } as unknown as VercelRequest
}

// Helper: build a chainable mock VercelResponse
// Handlers call res.status(n).json({...}) — status() must return res itself
function makeRes() {
  const res = { status: vi.fn(), json: vi.fn() }
  res.status.mockReturnValue(res)
  return res as unknown as VercelResponse & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }
}

const mockGrinderRow = {
  id: 'grinder-a',
  label: 'Junior',
  roast_level: 'light',
  grinder_type: 'stepped',
  baseline_grind: '18.00',
  temp_coefficient: '0.1500',
  humidity_coefficient: '0.0500',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/grinders', () => {
  it('returns mapped grinder list with 200', async () => {
    mockSql.mockResolvedValue({ rows: [mockGrinderRow] })
    const req = makeReq('GET')
    const res = makeRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'grinder-a', label: 'Junior', baselineGrind: 18 }),
      ])
    )
  })

  it('returns 500 on DB error', async () => {
    mockSql.mockRejectedValue(new Error('DB down'))
    const req = makeReq('GET')
    const res = makeRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

describe('POST /api/grinders', () => {
  it('upserts and returns grinder with 200', async () => {
    mockSql.mockResolvedValue({ rows: [mockGrinderRow] })
    const req = makeReq('POST', {
      id: 'grinder-a',
      label: 'Junior',
      roastLevel: 'light',
      grinderType: 'stepped',
      baselineGrind: 18,
      tempCoefficient: 0.15,
      humidityCoefficient: 0.05,
      isActive: true,
    })
    const res = makeRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'grinder-a' })
    )
  })

  it('returns 400 when required fields are missing', async () => {
    const req = makeReq('POST', { id: 'grinder-a' }) // missing label etc.
    const res = makeRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })
})

describe('unsupported method', () => {
  it('returns 405', async () => {
    const req = makeReq('DELETE')
    const res = makeRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run api/grinders/index.test.ts
```

Expected: FAIL — `Cannot find module './index'`

- [ ] **Step 3: Implement `api/grinders/index.ts`**

```typescript
import { sql } from '@vercel/postgres'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { mapGrinderRow } from '../_lib/db'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'GET') {
    try {
      const { rows } = await sql`SELECT * FROM grinders ORDER BY created_at`
      res.status(200).json(rows.map(mapGrinderRow))
    } catch (err) {
      console.error('GET /api/grinders error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
    return
  }

  if (req.method === 'POST') {
    const body = req.body as Record<string, unknown> | null
    const { id, label, roastLevel, grinderType, baselineGrind, tempCoefficient, humidityCoefficient, isActive } = body ?? {}

    if (!id || !label || !roastLevel || !grinderType || baselineGrind == null || tempCoefficient == null || humidityCoefficient == null) {
      res.status(400).json({ error: 'Missing required fields' })
      return
    }

    try {
      const { rows } = await sql`
        INSERT INTO grinders
          (id, label, roast_level, grinder_type, baseline_grind, temp_coefficient, humidity_coefficient, is_active)
        VALUES
          (${id as string}, ${label as string}, ${roastLevel as string}, ${grinderType as string},
           ${baselineGrind as number}, ${tempCoefficient as number}, ${humidityCoefficient as number},
           ${(isActive ?? true) as boolean})
        ON CONFLICT (id) DO UPDATE SET
          label                = EXCLUDED.label,
          roast_level          = EXCLUDED.roast_level,
          grinder_type         = EXCLUDED.grinder_type,
          baseline_grind       = EXCLUDED.baseline_grind,
          temp_coefficient     = EXCLUDED.temp_coefficient,
          humidity_coefficient = EXCLUDED.humidity_coefficient,
          is_active            = EXCLUDED.is_active
        RETURNING *
      `
      res.status(200).json(mapGrinderRow(rows[0] as Record<string, unknown>))
    } catch (err) {
      console.error('POST /api/grinders error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run api/grinders/index.test.ts
```

Expected: PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add api/grinders/index.ts api/grinders/index.test.ts
git commit -m "feat: add GET + POST /api/grinders serverless route"
```

---

### Task 4: `api/beans/index.ts` (GET + POST) with tests

**Files:**
- Create: `api/beans/index.ts`
- Create: `api/beans/index.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `api/beans/index.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const mockSql = vi.fn()
vi.mock('@vercel/postgres', () => ({ sql: mockSql }))

import handler from './index'

function makeReq(method: string, body?: unknown): VercelRequest {
  return { method, body } as unknown as VercelRequest
}

function makeRes() {
  const res = { status: vi.fn(), json: vi.fn() }
  res.status.mockReturnValue(res)
  return res as unknown as VercelResponse & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }
}

const mockBeanRow = {
  id: 'bean-1',
  name: 'Ethiopia Yirgacheffe',
  origin: 'Ethiopia',
  agtron: 78,
  roast_level: 'light',
  baseline_grinds: { 'grinder-a': 18 },
  baseline_temp: '25.00',
  baseline_humidity: '60.00',
  target_extraction_time: null,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => vi.clearAllMocks())

describe('GET /api/beans', () => {
  it('returns mapped bean list with 200', async () => {
    mockSql.mockResolvedValue({ rows: [mockBeanRow] })
    const res = makeRes()

    await handler(makeReq('GET'), res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'bean-1', name: 'Ethiopia Yirgacheffe', agtron: 78 }),
      ])
    )
  })

  it('returns 500 on DB error', async () => {
    mockSql.mockRejectedValue(new Error('DB down'))
    const res = makeRes()

    await handler(makeReq('GET'), res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

describe('POST /api/beans', () => {
  it('creates a bean and returns 201', async () => {
    mockSql.mockResolvedValue({ rows: [mockBeanRow] })
    const res = makeRes()
    const body = {
      id: 'bean-1',
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

    await handler(makeReq('POST', body), res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'bean-1' })
    )
  })

  it('returns 400 when required fields are missing', async () => {
    const res = makeRes()

    await handler(makeReq('POST', { name: 'Incomplete' }), res)

    expect(res.status).toHaveBeenCalledWith(400)
  })
})

describe('unsupported method', () => {
  it('returns 405', async () => {
    const res = makeRes()

    await handler(makeReq('PATCH'), res)

    expect(res.status).toHaveBeenCalledWith(405)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run api/beans/index.test.ts
```

Expected: FAIL — `Cannot find module './index'`

- [ ] **Step 3: Implement `api/beans/index.ts`**

```typescript
import { sql } from '@vercel/postgres'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { mapBeanRow } from '../_lib/db'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'GET') {
    try {
      const { rows } = await sql`SELECT * FROM beans ORDER BY created_at DESC`
      res.status(200).json(rows.map(r => mapBeanRow(r as Record<string, unknown>)))
    } catch (err) {
      console.error('GET /api/beans error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
    return
  }

  if (req.method === 'POST') {
    const body = req.body as Record<string, unknown> | null
    const { id, name, origin, agtron, roastLevel, baselineGrinds, baselineTemp, baselineHumidity, isActive, createdAt } = body ?? {}

    if (!id || !name || !origin || agtron == null || !roastLevel || !baselineGrinds || baselineTemp == null || baselineHumidity == null) {
      res.status(400).json({ error: 'Missing required fields' })
      return
    }

    try {
      const { rows } = await sql`
        INSERT INTO beans
          (id, name, origin, agtron, roast_level, baseline_grinds, baseline_temp, baseline_humidity, is_active, created_at)
        VALUES
          (${id as string}, ${name as string}, ${origin as string}, ${agtron as number},
           ${roastLevel as string}, ${JSON.stringify(baselineGrinds)},
           ${baselineTemp as number}, ${baselineHumidity as number},
           ${(isActive ?? true) as boolean}, ${(createdAt ?? new Date().toISOString()) as string})
        RETURNING *
      `
      res.status(201).json(mapBeanRow(rows[0] as Record<string, unknown>))
    } catch (err) {
      console.error('POST /api/beans error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run api/beans/index.test.ts
```

Expected: PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add api/beans/index.ts api/beans/index.test.ts
git commit -m "feat: add GET + POST /api/beans serverless route"
```

---

### Task 5: `api/beans/[id].ts` (PUT + DELETE) with tests

**Files:**
- Create: `api/beans/[id].ts`
- Create: `api/beans/[id].test.ts`

Note: Vercel routes `api/beans/[id].ts` to `/api/beans/:id`. The `id` is available at `req.query.id`.

- [ ] **Step 1: Write the failing tests**

Create `api/beans/[id].test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const mockSql = vi.fn()
vi.mock('@vercel/postgres', () => ({ sql: mockSql }))

import handler from './[id]'

function makeReq(method: string, id: string, body?: unknown): VercelRequest {
  return { method, body, query: { id } } as unknown as VercelRequest
}

function makeRes() {
  const res = { status: vi.fn(), json: vi.fn() }
  res.status.mockReturnValue(res)
  return res as unknown as VercelResponse & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }
}

const mockBeanRow = {
  id: 'bean-1',
  name: 'Ethiopia Yirgacheffe',
  origin: 'Ethiopia',
  agtron: 78,
  roast_level: 'light',
  baseline_grinds: { 'grinder-a': 18 },
  baseline_temp: '25.00',
  baseline_humidity: '60.00',
  target_extraction_time: null,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => vi.clearAllMocks())

describe('PUT /api/beans/:id', () => {
  it('updates and returns the bean with 200', async () => {
    mockSql.mockResolvedValue({ rows: [mockBeanRow] })
    const res = makeRes()
    const body = {
      id: 'bean-1',
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

    await handler(makeReq('PUT', 'bean-1', body), res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'bean-1' }))
  })

  it('returns 404 when bean does not exist', async () => {
    mockSql.mockResolvedValue({ rows: [] }) // no rows returned from UPDATE
    const res = makeRes()

    await handler(makeReq('PUT', 'missing-id', { name: 'x', origin: 'x', agtron: 50, roastLevel: 'light', baselineGrinds: {}, baselineTemp: 25, baselineHumidity: 60, isActive: true }), res)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('returns 400 when required fields are missing', async () => {
    const res = makeRes()

    await handler(makeReq('PUT', 'bean-1', { name: 'Only name' }), res)

    expect(res.status).toHaveBeenCalledWith(400)
  })
})

describe('DELETE /api/beans/:id', () => {
  it('deletes the bean and returns { id } with 200', async () => {
    mockSql.mockResolvedValue({ rows: [{ id: 'bean-1' }] })
    const res = makeRes()

    await handler(makeReq('DELETE', 'bean-1'), res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ id: 'bean-1' })
  })

  it('returns 404 when bean does not exist', async () => {
    mockSql.mockResolvedValue({ rows: [] })
    const res = makeRes()

    await handler(makeReq('DELETE', 'missing-id'), res)

    expect(res.status).toHaveBeenCalledWith(404)
  })
})

describe('unsupported method', () => {
  it('returns 405', async () => {
    const res = makeRes()

    await handler(makeReq('POST', 'bean-1'), res)

    expect(res.status).toHaveBeenCalledWith(405)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run "api/beans/\[id\].test.ts"
```

Expected: FAIL — `Cannot find module './[id]'`

- [ ] **Step 3: Implement `api/beans/[id].ts`**

```typescript
import { sql } from '@vercel/postgres'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { mapBeanRow } from '../_lib/db'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const id = req.query['id'] as string

  if (req.method === 'PUT') {
    const body = req.body as Record<string, unknown> | null
    const { name, origin, agtron, roastLevel, baselineGrinds, baselineTemp, baselineHumidity, isActive, createdAt } = body ?? {}

    if (!name || !origin || agtron == null || !roastLevel || !baselineGrinds || baselineTemp == null || baselineHumidity == null) {
      res.status(400).json({ error: 'Missing required fields' })
      return
    }

    try {
      const { rows } = await sql`
        UPDATE beans SET
          name             = ${name as string},
          origin           = ${origin as string},
          agtron           = ${agtron as number},
          roast_level      = ${roastLevel as string},
          baseline_grinds  = ${JSON.stringify(baselineGrinds)},
          baseline_temp    = ${baselineTemp as number},
          baseline_humidity = ${baselineHumidity as number},
          is_active        = ${(isActive ?? true) as boolean},
          created_at       = ${(createdAt ?? new Date().toISOString()) as string}
        WHERE id = ${id}
        RETURNING *
      `
      if (rows.length === 0) {
        res.status(404).json({ error: 'Bean not found' })
        return
      }
      res.status(200).json(mapBeanRow(rows[0] as Record<string, unknown>))
    } catch (err) {
      console.error('PUT /api/beans/:id error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
    return
  }

  if (req.method === 'DELETE') {
    try {
      const { rows } = await sql`
        DELETE FROM beans WHERE id = ${id} RETURNING id
      `
      if (rows.length === 0) {
        res.status(404).json({ error: 'Bean not found' })
        return
      }
      res.status(200).json({ id: rows[0]['id'] })
    } catch (err) {
      console.error('DELETE /api/beans/:id error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run "api/beans/\[id\].test.ts"
```

Expected: PASS — 6 tests

- [ ] **Step 5: Run full test suite to check for regressions**

```bash
npx vitest run
```

Expected: All existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add "api/beans/[id].ts" "api/beans/[id].test.ts"
git commit -m "feat: add PUT + DELETE /api/beans/:id serverless route"
```

---

## Chunk 3: API Routes — Shots

### Task 6: `api/shots/index.ts` with tests

**Files:**
- Create: `api/shots/index.ts`
- Create: `api/shots/index.test.ts`

Shots are append-only: GET (list) + POST (create). No PUT or DELETE.

- [ ] **Step 1: Write the failing tests**

Create `api/shots/index.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const mockSql = vi.fn()
vi.mock('@vercel/postgres', () => ({ sql: mockSql }))

import handler from './index'

function makeReq(method: string, body?: unknown): VercelRequest {
  return { method, body } as unknown as VercelRequest
}

function makeRes() {
  const res = { status: vi.fn(), json: vi.fn() }
  res.status.mockReturnValue(res)
  return res as unknown as VercelResponse & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }
}

const mockShotRow = {
  id: 'shot-1',
  bean_id: 'bean-1',
  grinder_id: 'grinder-a',
  recommended_grind: '18.00',
  actual_grind: '18.00',
  temp: '25.00',
  humidity: '60.00',
  extraction_time: 28,
  feedback: 'perfect',
  created_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => vi.clearAllMocks())

describe('GET /api/shots', () => {
  it('returns mapped shot list newest-first with 200', async () => {
    mockSql.mockResolvedValue({ rows: [mockShotRow] })
    const res = makeRes()

    await handler(makeReq('GET'), res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'shot-1', beanId: 'bean-1', feedback: 'perfect' }),
      ])
    )
  })

  it('returns 500 on DB error', async () => {
    mockSql.mockRejectedValue(new Error('DB down'))
    const res = makeRes()

    await handler(makeReq('GET'), res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

describe('POST /api/shots', () => {
  it('creates a shot and returns 201', async () => {
    mockSql.mockResolvedValue({ rows: [mockShotRow] })
    const res = makeRes()
    const body = {
      id: 'shot-1',
      beanId: 'bean-1',
      grinderId: 'grinder-a',
      recommendedGrind: 18,
      actualGrind: 18,
      temp: 25,
      humidity: 60,
      extractionTime: 28,
      feedback: 'perfect',
      createdAt: '2026-01-01T00:00:00Z',
    }

    await handler(makeReq('POST', body), res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'shot-1' }))
  })

  it('returns 400 when required fields are missing', async () => {
    const res = makeRes()

    await handler(makeReq('POST', { beanId: 'bean-1' }), res)

    expect(res.status).toHaveBeenCalledWith(400)
  })
})

describe('unsupported method', () => {
  it('returns 405 for PUT', async () => {
    const res = makeRes()

    await handler(makeReq('PUT'), res)

    expect(res.status).toHaveBeenCalledWith(405)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run api/shots/index.test.ts
```

Expected: FAIL — `Cannot find module './index'`

- [ ] **Step 3: Implement `api/shots/index.ts`**

```typescript
import { sql } from '@vercel/postgres'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { mapShotRow } from '../_lib/db'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'GET') {
    try {
      const { rows } = await sql`
        SELECT * FROM shot_logs ORDER BY created_at DESC LIMIT 200
      `
      res.status(200).json(rows.map(r => mapShotRow(r as Record<string, unknown>)))
    } catch (err) {
      console.error('GET /api/shots error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
    return
  }

  if (req.method === 'POST') {
    const body = req.body as Record<string, unknown> | null
    const { id, beanId, grinderId, recommendedGrind, actualGrind, temp, humidity, extractionTime, feedback, createdAt } = body ?? {}

    if (!id || !beanId || !grinderId || recommendedGrind == null || actualGrind == null || temp == null || humidity == null || !feedback) {
      res.status(400).json({ error: 'Missing required fields' })
      return
    }

    try {
      const { rows } = await sql`
        INSERT INTO shot_logs
          (id, bean_id, grinder_id, recommended_grind, actual_grind, temp, humidity, extraction_time, feedback, created_at)
        VALUES
          (${id as string}, ${beanId as string}, ${grinderId as string},
           ${recommendedGrind as number}, ${actualGrind as number},
           ${temp as number}, ${humidity as number},
           ${extractionTime != null ? (extractionTime as number) : null},
           ${feedback as string},
           ${(createdAt ?? new Date().toISOString()) as string})
        RETURNING *
      `
      res.status(201).json(mapShotRow(rows[0] as Record<string, unknown>))
    } catch (err) {
      console.error('POST /api/shots error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run api/shots/index.test.ts
```

Expected: PASS — 5 tests

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add api/shots/index.ts api/shots/index.test.ts
git commit -m "feat: add GET + POST /api/shots serverless route"
```

---

## Chunk 4: Store + API Service

### Task 7: Replace `src/services/apiService.ts`

**Files:**
- Modify: `src/services/apiService.ts`

Remove the three old named-export object groups (`shotLogApi`, `beanApi`, `grinderApi`) and replace with eight flat async functions. Keep the existing Axios instance unchanged.

No new test file for this task — the service is tested indirectly through the store tests (Task 8) which mock it.

- [ ] **Step 1: Replace `src/services/apiService.ts`**

```typescript
import axios from 'axios'
import type { BeanProfile } from '@/types/bean'
import type { GrinderConfig } from '@/types/grinder'
import type { ShotLog } from '@/types/shot'

// baseURL is intentionally empty — all paths are relative (e.g. /api/beans).
// On Vercel, relative paths route to the serverless functions in api/.
// In local development, the Vite dev server proxy (vite.config.ts) forwards
// /api/* to the staging backend via API_PROXY_TARGET.
const api = axios.create({
  baseURL: '',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

// --- Grinders ---

export async function fetchGrinders(): Promise<GrinderConfig[]> {
  const { data } = await api.get<GrinderConfig[]>('/api/grinders')
  return data
}

export async function updateGrinder(grinder: GrinderConfig): Promise<GrinderConfig> {
  const { data } = await api.post<GrinderConfig>('/api/grinders', grinder)
  return data
}

// --- Beans ---

export async function fetchBeans(): Promise<BeanProfile[]> {
  const { data } = await api.get<BeanProfile[]>('/api/beans')
  return data
}

export async function createBean(bean: BeanProfile): Promise<BeanProfile> {
  const { data } = await api.post<BeanProfile>('/api/beans', bean)
  return data
}

export async function updateBean(bean: BeanProfile): Promise<BeanProfile> {
  const { data } = await api.put<BeanProfile>(`/api/beans/${bean.id}`, bean)
  return data
}

export async function deleteBean(id: string): Promise<void> {
  await api.delete(`/api/beans/${id}`)
}

// --- Shots ---

export async function fetchShots(): Promise<ShotLog[]> {
  const { data } = await api.get<ShotLog[]>('/api/shots')
  return data
}

export async function createShot(shot: ShotLog): Promise<ShotLog> {
  const { data } = await api.post<ShotLog>('/api/shots', shot)
  return data
}
```

Note: `baseURL` is hardcoded as `''` (empty string) so relative `/api/...` paths always work correctly on Vercel. The Vite dev proxy (`vite.config.ts` → `API_PROXY_TARGET`) handles forwarding `/api/*` to the staging backend during local development — no baseURL override needed. The `VITE_API_BASE_URL` env var is no longer used by the data API client.

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: TypeScript errors in `BeanDrawer.tsx` and `ShotFeedback.tsx` (they still reference removed store actions) — these are expected and will be fixed in Chunk 5. The `apiService.ts` itself should have 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/apiService.ts
git commit -m "feat: replace apiService with flat async functions for beans/grinders/shots"
```

---

### Task 8: Update `src/store/useAppStore.ts` + replace tests

**Files:**
- Modify: `src/store/useAppStore.ts`
- Modify: `src/store/useAppStore.test.ts`

Add `isLoading`, `isSaving`, `error` state. Add `hydrateFromApi`, `createBean`, `updateBean`, `deleteBean`, `saveShot` async actions. Remove sync `addBean`, `updateBean`, `deleteBean`, `addShot`.

- [ ] **Step 1: Write the failing tests**

Replace the entire `src/store/useAppStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { BeanProfile } from '@/types/bean'
import type { GrinderConfig } from '@/types/grinder'
import type { ShotLog } from '@/types/shot'

// vi.mock is hoisted — apiService module is mocked before imports resolve
vi.mock('@/services/apiService', () => ({
  fetchGrinders: vi.fn(),
  fetchBeans:    vi.fn(),
  fetchShots:    vi.fn(),
  createBean:    vi.fn(),
  updateBean:    vi.fn(),
  deleteBean:    vi.fn(),
  createShot:    vi.fn(),
}))

import { useAppStore } from './useAppStore'
import * as api from '@/services/apiService'

const makeGrinder = (id = 'grinder-a'): GrinderConfig => ({
  id,
  label: 'Junior',
  roastLevel: 'light',
  grinderType: 'stepped',
  baselineGrind: 18,
  tempCoefficient: 0.15,
  humidityCoefficient: 0.05,
  isActive: true,
})

const makeBean = (id = 'b1'): BeanProfile => ({
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

const makeShot = (id = 's1'): ShotLog => ({
  id,
  beanId: 'b1',
  grinderId: 'grinder-a',
  recommendedGrind: 18,
  actualGrind: 18,
  temp: 25,
  humidity: 60,
  feedback: 'perfect',
  createdAt: '2026-01-01T00:00:00Z',
})

beforeEach(() => {
  vi.clearAllMocks()
  useAppStore.setState({
    grinders: [],
    beans: [],
    shots: [],
    selectedBean: null,
    selectedGrinder: null,
    isLoading: false,
    isSaving: false,
    error: null,
  })
})

describe('hydrateFromApi', () => {
  it('fetches all resources in parallel and populates the store', async () => {
    const grinder = makeGrinder()
    const bean = makeBean()
    const shot = makeShot()
    vi.mocked(api.fetchGrinders).mockResolvedValue([grinder])
    vi.mocked(api.fetchBeans).mockResolvedValue([bean])
    vi.mocked(api.fetchShots).mockResolvedValue([shot])

    await useAppStore.getState().hydrateFromApi()

    const state = useAppStore.getState()
    expect(state.grinders).toEqual([grinder])
    expect(state.beans).toEqual([bean])
    expect(state.shots).toEqual([shot])
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('sets error and clears isLoading on fetch failure', async () => {
    vi.mocked(api.fetchGrinders).mockRejectedValue(new Error('Network error'))
    vi.mocked(api.fetchBeans).mockResolvedValue([])
    vi.mocked(api.fetchShots).mockResolvedValue([])

    await useAppStore.getState().hydrateFromApi()

    const state = useAppStore.getState()
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeTruthy()
  })

  it('is a no-op if isLoading is already true (double-invoke guard)', async () => {
    useAppStore.setState({ isLoading: true })

    await useAppStore.getState().hydrateFromApi()

    expect(api.fetchGrinders).not.toHaveBeenCalled()
  })
})

describe('createBean', () => {
  it('calls api.createBean, prepends the bean, and clears isSaving', async () => {
    const bean = makeBean()
    vi.mocked(api.createBean).mockResolvedValue(bean)

    await useAppStore.getState().createBean(bean)

    expect(api.createBean).toHaveBeenCalledWith(bean)
    expect(useAppStore.getState().beans).toEqual([bean])
    expect(useAppStore.getState().isSaving).toBe(false)
  })

  it('sets error and rethrows on API failure', async () => {
    vi.mocked(api.createBean).mockRejectedValue(new Error('fail'))

    await expect(useAppStore.getState().createBean(makeBean())).rejects.toThrow('fail')

    expect(useAppStore.getState().error).toBeTruthy()
    expect(useAppStore.getState().isSaving).toBe(false)
  })
})

describe('updateBean', () => {
  it('calls api.updateBean, replaces the bean in store, and syncs selectedBean', async () => {
    const bean = makeBean()
    useAppStore.setState({ beans: [bean], selectedBean: bean })
    const updated = { ...bean, name: 'Updated' }
    vi.mocked(api.updateBean).mockResolvedValue(updated)

    await useAppStore.getState().updateBean(updated)

    expect(useAppStore.getState().beans[0].name).toBe('Updated')
    expect(useAppStore.getState().selectedBean?.name).toBe('Updated')
    expect(useAppStore.getState().isSaving).toBe(false)
  })
})

describe('deleteBean', () => {
  it('calls api.deleteBean, removes bean from store, and clears selectedBean', async () => {
    const bean = makeBean()
    useAppStore.setState({ beans: [bean], selectedBean: bean })
    vi.mocked(api.deleteBean).mockResolvedValue(undefined)

    await useAppStore.getState().deleteBean(bean.id)

    expect(useAppStore.getState().beans).toEqual([])
    expect(useAppStore.getState().selectedBean).toBeNull()
    expect(useAppStore.getState().isSaving).toBe(false)
  })
})

describe('saveShot', () => {
  it('calls api.createShot and prepends the shot to the store', async () => {
    const shot = makeShot()
    vi.mocked(api.createShot).mockResolvedValue(shot)

    await useAppStore.getState().saveShot(shot)

    expect(api.createShot).toHaveBeenCalledWith(shot)
    expect(useAppStore.getState().shots).toEqual([shot])
    expect(useAppStore.getState().isSaving).toBe(false)
  })
})

describe('mutation failure paths', () => {
  it('updateBean sets error and rethrows on API failure', async () => {
    vi.mocked(api.updateBean).mockRejectedValue(new Error('network error'))

    await expect(useAppStore.getState().updateBean(makeBean())).rejects.toThrow('network error')

    expect(useAppStore.getState().error).toBeTruthy()
    expect(useAppStore.getState().isSaving).toBe(false)
  })

  it('deleteBean sets error and rethrows on API failure', async () => {
    vi.mocked(api.deleteBean).mockRejectedValue(new Error('network error'))

    await expect(useAppStore.getState().deleteBean('b1')).rejects.toThrow('network error')

    expect(useAppStore.getState().error).toBeTruthy()
    expect(useAppStore.getState().isSaving).toBe(false)
  })

  it('saveShot sets error and rethrows on API failure', async () => {
    vi.mocked(api.createShot).mockRejectedValue(new Error('network error'))

    await expect(useAppStore.getState().saveShot(makeShot())).rejects.toThrow('network error')

    expect(useAppStore.getState().error).toBeTruthy()
    expect(useAppStore.getState().isSaving).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/store/useAppStore.test.ts
```

Expected: FAIL — `hydrateFromApi is not a function` (store actions don't exist yet)

- [ ] **Step 3: Update `src/store/useAppStore.ts`**

Replace the entire file:

```typescript
import { create } from 'zustand'
import type { BeanProfile } from '@/types/bean'
import type { GrinderConfig } from '@/types/grinder'
import type { ShotLog } from '@/types/shot'
import type { SensorState } from '@/types/sensor'
import {
  fetchGrinders,
  fetchBeans,
  fetchShots,
  createBean as apiCreateBean,
  updateBean as apiUpdateBean,
  deleteBean as apiDeleteBean,
  createShot as apiCreateShot,
} from '@/services/apiService'

interface AppState {
  // Selections
  selectedGrinder: GrinderConfig | null
  selectedBean:    BeanProfile | null

  // Data
  grinders: GrinderConfig[]
  beans:    BeanProfile[]
  shots:    ShotLog[]

  // Sensor
  sensor: SensorState

  // Loading / error
  isLoading: boolean
  isSaving:  boolean
  error:     string | null

  // Selection setters
  setSelectedGrinder: (grinder: GrinderConfig | null) => void
  setSelectedBean:    (bean: BeanProfile | null) => void

  // Internal setters (used by hydrateFromApi)
  setGrinders: (grinders: GrinderConfig[]) => void
  setBeans:    (beans: BeanProfile[]) => void
  setShots:    (shots: ShotLog[]) => void
  setSensor:   (sensor: Partial<SensorState>) => void

  // Async actions
  hydrateFromApi: () => Promise<void>
  createBean:     (bean: BeanProfile) => Promise<void>
  updateBean:     (bean: BeanProfile) => Promise<void>
  deleteBean:     (id: string) => Promise<void>
  saveShot:       (shot: ShotLog) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  selectedGrinder: null,
  selectedBean:    null,
  grinders: [],
  beans:    [],
  shots:    [],
  sensor: {
    status:           'loading',
    reading:          null,
    lastUpdated:      null,
    isManualOverride: false,
  },
  isLoading: false,
  isSaving:  false,
  error:     null,

  setSelectedGrinder: (grinder) => set({ selectedGrinder: grinder }),
  setSelectedBean:    (bean)    => set({ selectedBean: bean }),
  setGrinders:        (grinders) => set({ grinders }),
  setBeans:           (beans)    => set({ beans }),
  setShots:           (shots)    => set({ shots }),
  setSensor: (partial) =>
    set((state) => ({ sensor: { ...state.sensor, ...partial } })),

  hydrateFromApi: async () => {
    // Guard: prevent double-invoke (e.g. React Strict Mode mounts twice)
    if (get().isLoading) return
    set({ isLoading: true, error: null })
    try {
      const [grinders, beans, shots] = await Promise.all([
        fetchGrinders(),
        fetchBeans(),
        fetchShots(),
      ])
      set({ grinders, beans, shots, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  createBean: async (bean) => {
    set({ isSaving: true, error: null })
    try {
      const created = await apiCreateBean(bean)
      set((state) => ({ beans: [created, ...state.beans], isSaving: false }))
    } catch (err) {
      set({ error: (err as Error).message, isSaving: false })
      throw err
    }
  },

  updateBean: async (bean) => {
    set({ isSaving: true, error: null })
    try {
      const updated = await apiUpdateBean(bean)
      set((state) => ({
        beans: state.beans.map((b) => (b.id === updated.id ? updated : b)),
        selectedBean:
          state.selectedBean?.id === updated.id ? updated : state.selectedBean,
        isSaving: false,
      }))
    } catch (err) {
      set({ error: (err as Error).message, isSaving: false })
      throw err
    }
  },

  deleteBean: async (id) => {
    set({ isSaving: true, error: null })
    try {
      await apiDeleteBean(id)
      set((state) => ({
        beans: state.beans.filter((b) => b.id !== id),
        selectedBean: state.selectedBean?.id === id ? null : state.selectedBean,
        isSaving: false,
      }))
    } catch (err) {
      set({ error: (err as Error).message, isSaving: false })
      throw err
    }
  },

  saveShot: async (shot) => {
    set({ isSaving: true, error: null })
    try {
      const saved = await apiCreateShot(shot)
      set((state) => ({ shots: [saved, ...state.shots], isSaving: false }))
    } catch (err) {
      set({ error: (err as Error).message, isSaving: false })
      throw err
    }
  },
}))
```

- [ ] **Step 4: Run the store tests to verify they pass**

```bash
npx vitest run src/store/useAppStore.test.ts
```

Expected: PASS — 12 tests

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: Store tests pass. Other test files that import from `mockData.ts` (Dashboard, BeanProfiles, ShotLog page tests if any) may fail — that's expected and resolved in Chunk 5.

- [ ] **Step 6: Commit**

```bash
git add src/store/useAppStore.ts src/store/useAppStore.test.ts
git commit -m "feat: replace sync store actions with async API-backed actions + loading state"
```

---

## Chunk 5: Frontend Integration

### Task 9: Update `AppShell` — hydration on mount + full-screen spinner

**Files:**
- Modify: `src/App.tsx`

`AppShell` is a function component defined inside `App.tsx`. This is where `useEffect` and the `isLoading` guard go — `App()` itself only returns `<RouterProvider>` and cannot call hooks.

- [ ] **Step 1: Update `src/App.tsx`**

Add `useEffect` import and store imports, then update the `AppShell` function body:

```typescript
import { useEffect } from 'react'
import { NavLink, Outlet, createBrowserRouter, RouterProvider } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { SensorStatus } from '@/components/sensor/SensorStatus'
import Dashboard from '@/pages/Dashboard'
import ShotLog from '@/pages/ShotLog'
import BeanProfiles from '@/pages/BeanProfiles'

function AppShell() {
  const { hydrateFromApi, isLoading } = useAppStore()

  useEffect(() => {
    hydrateFromApi()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="text-[32px] animate-pulse">☕</div>
          <div className="text-[13px] text-[var(--muted)]">Loading…</div>
        </div>
      </div>
    )
  }

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
            <NavLink
              to="/beans"
              className={({ isActive }) =>
                `px-[14px] py-[6px] rounded-[7px] text-[12px] font-bold transition-colors
                ${isActive ? 'bg-[var(--card3)] text-white' : 'text-[var(--muted)] hover:text-white'}`
              }
            >
              🫘 Beans
            </NavLink>
          </div>
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

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 errors in `App.tsx`. Other errors about removed `addBean`/`addShot` still expected — resolved in next steps.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add hydrateFromApi on AppShell mount with full-screen loading spinner"
```

---

### Task 10: Update `BeanDrawer.tsx` and `BeanForm.tsx`

**Files:**
- Modify: `src/components/bean-profile/BeanDrawer.tsx`
- Modify: `src/components/bean-profile/BeanForm.tsx`

`BeanDrawer` is the component that calls the store's bean mutation actions. All three handlers (`handleSave`, `handleHide`, `handleDelete`) become async and use `isSaving` to disable the footer. `BeanForm` receives `isSaving` as a prop to disable its submit button.

- [ ] **Step 1: Update `src/components/bean-profile/BeanDrawer.tsx`**

```typescript
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
  const { createBean, updateBean, deleteBean, isSaving } = useAppStore()

  async function handleSave(saved: BeanProfile) {
    if (mode === 'add') {
      await createBean(saved)
    } else {
      await updateBean(saved)
    }
    onClose()
  }

  async function handleHide() {
    if (!bean) return
    await updateBean({ ...bean, isActive: false })
    onClose()
  }

  async function handleDelete() {
    if (!bean) return
    await deleteBean(bean.id)
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
          disabled={isSaving}
          aria-label="Close drawer"
          className="text-[18px] text-[var(--text3)] leading-none ml-2 flex-shrink-0 disabled:opacity-50"
        >
          ✕
        </button>
      </div>

      {/* Scrollable form body */}
      <div className="flex-1 overflow-y-auto px-[14px] py-[14px]">
        <BeanForm
          key={mode === 'edit' ? bean?.id : 'new'}
          initialBean={mode === 'edit' ? bean : undefined}
          grinders={grinders}
          onSave={handleSave}
          onHide={mode === 'edit' ? handleHide : undefined}
          onDelete={mode === 'edit' ? handleDelete : undefined}
          isSaving={isSaving}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add `isSaving` prop to `BeanFormProps` in `src/components/bean-profile/BeanForm.tsx`**

Open `src/components/bean-profile/BeanForm.tsx`. Find the `BeanFormProps` interface (around line 28–34):

```typescript
interface BeanFormProps {
  initialBean?: BeanProfile
  grinders: GrinderConfig[]
  onSave: (bean: BeanProfile) => void
  onHide?: () => void
  onDelete?: () => void
}
```

Replace it with:

```typescript
interface BeanFormProps {
  initialBean?: BeanProfile
  grinders: GrinderConfig[]
  onSave: (bean: BeanProfile) => void
  onHide?: () => void
  onDelete?: () => void
  isSaving?: boolean
}
```

Then find the function signature line (immediately below the interface):

```typescript
export function BeanForm({ initialBean, grinders, onSave, onHide, onDelete }: BeanFormProps) {
```

Replace with:

```typescript
export function BeanForm({ initialBean, grinders, onSave, onHide, onDelete, isSaving }: BeanFormProps) {
```

Then find the submit button's `disabled` condition in the JSX. It currently reads something like `disabled={!isSaveEnabled}`. Change it to:

```typescript
disabled={!isSaveEnabled || !!isSaving}
```

- [ ] **Step 3: Apply `disabled={!!isSaving}` to Hide and Delete buttons inside `BeanForm.tsx`**

The Hide button (around line 316) currently reads:
```typescript
<button
  type="button"
  onClick={onHide}
  className="w-full text-center mt-[8px] text-[11px] text-[var(--text3)]"
>
  Hide Bean Profile
</button>
```

Replace with:
```typescript
<button
  type="button"
  onClick={onHide}
  disabled={!!isSaving}
  className="w-full text-center mt-[8px] text-[11px] text-[var(--text3)] disabled:opacity-40"
>
  Hide Bean Profile
</button>
```

The "Delete Permanently" trigger button (around line 328) currently reads:
```typescript
<button
  type="button"
  onClick={() => setConfirmDelete(true)}
  className="w-full text-center mt-[4px] text-[11px] text-[var(--red)] opacity-60"
>
  Delete Permanently
</button>
```

Replace with:
```typescript
<button
  type="button"
  onClick={() => setConfirmDelete(true)}
  disabled={!!isSaving}
  className="w-full text-center mt-[4px] text-[11px] text-[var(--red)] opacity-60 disabled:opacity-30"
>
  Delete Permanently
</button>
```

- [ ] **Step 4: Update `BeanDrawer.test.tsx` mock to match the new store API**

`BeanDrawer.test.tsx` currently mocks `addBean`, `updateBean`, `deleteBean`. After this task, `BeanDrawer` reads `createBean`, `updateBean`, `deleteBean`, and `isSaving` from the store. Update the mock:

Open `src/components/bean-profile/BeanDrawer.test.tsx`. Replace the `vi.mock` block:

```typescript
// OLD — remove this:
vi.mock('@/store/useAppStore', () => ({
  useAppStore: vi.fn(() => ({
    addBean: vi.fn(),
    updateBean: vi.fn(),
    deleteBean: vi.fn(),
  })),
}))
```

Replace with:
```typescript
// NEW — matches post-migration store API:
vi.mock('@/store/useAppStore', () => ({
  useAppStore: vi.fn(() => ({
    createBean:  vi.fn().mockResolvedValue(undefined),
    updateBean:  vi.fn().mockResolvedValue(undefined),
    deleteBean:  vi.fn().mockResolvedValue(undefined),
    isSaving:    false,
  })),
}))
```

The four existing tests (title, subtitle, add mode, close button) do not exercise save/delete paths, so no other changes are needed.

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit
```

Expected: `BeanDrawer.tsx` and `BeanForm.tsx` clean. `ShotFeedback.tsx` may still have errors (fixed next).

- [ ] **Step 6: Run BeanDrawer tests to verify mock update is correct**

```bash
npx vitest run src/components/bean-profile/BeanDrawer.test.tsx
```

Expected: PASS — 4 tests.

- [ ] **Step 7: Commit**

```bash
git add src/components/bean-profile/BeanDrawer.tsx src/components/bean-profile/BeanForm.tsx src/components/bean-profile/BeanDrawer.test.tsx
git commit -m "feat: wire BeanDrawer to async store actions with isSaving disable state"
```

---

### Task 11: Update `ShotFeedback.tsx` — async `saveShot` + toast after resolve

**Files:**
- Modify: `src/components/feedback/ShotFeedback.tsx`

Replace the synchronous `addShot` call with async `saveShot`. Move the toast to fire after the promise resolves. Show an error toast on failure.

- [ ] **Step 1: Update `src/components/feedback/ShotFeedback.tsx`**

```typescript
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
  const { selectedGrinder, selectedBean, sensor, saveShot, isSaving } = useAppStore()
  const [selected, setSelected] = useState<FeedbackType | null>(null)
  const [toast,    setToast]    = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    timerRef.current = setTimeout(() => {
      setToast(null)
      setSelected(null)
    }, 2200)
  }

  const handleLogShot = useCallback(async () => {
    if (!selected || !selectedGrinder || !selectedBean || isSaving) return

    const temp     = sensor.reading?.temperature ?? 25
    const humidity = sensor.reading?.humidity    ?? 60
    const result   = calculateGrind(selectedBean, selectedGrinder, temp, humidity)

    try {
      await saveShot({
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
      // Toast fires only after the API call succeeds
      showToast(TOAST_MSGS[selected])
    } catch {
      showToast('⚠ Failed to save shot — check connection')
    }
  }, [selected, selectedGrinder, selectedBean, sensor, saveShot, isSaving])

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
                disabled={isSaving}
                className={`flex flex-col items-center justify-center gap-[3px] py-[14px] px-2 rounded-[var(--r)] border-[1.5px] transition-all duration-[150ms] active:scale-[.96] select-none disabled:opacity-50
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

        {/* Step 2: log shot */}
        <button
          onClick={handleLogShot}
          disabled={!selected || isSaving}
          className={`w-full py-[14px] rounded-[var(--r)] font-extrabold text-[15px] transition-all duration-[150ms] active:scale-[.99]
            ${selected && !isSaving
              ? 'bg-[var(--red)] text-white hover:opacity-90 shadow-[0_4px_20px_var(--red-glow)]'
              : 'bg-[var(--card3)] text-[var(--muted2)] cursor-not-allowed'
            }`}
        >
          {isSaving ? 'Saving…' : 'Log Shot'}
        </button>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: `ShotFeedback.tsx` errors resolved. Any remaining errors should only be in Dashboard, BeanProfiles, ShotLog (still importing mockData).

- [ ] **Step 3: Commit**

```bash
git add src/components/feedback/ShotFeedback.tsx
git commit -m "feat: wire ShotFeedback to async saveShot with toast-after-resolve"
```

---

### Task 12: Remove seeding guards from pages and delete `mockData.ts`

**Files:**
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/pages/BeanProfiles.tsx`
- Modify: `src/pages/ShotLog.tsx`
- Delete: `src/data/mockData.ts`

Each page currently has a `useEffect` that conditionally seeds from `MOCK_*`. These guards are now replaced by `AppShell`'s `hydrateFromApi()`. Remove the `useEffect` seeding blocks and the `mockData` imports entirely.

- [ ] **Step 1: Update `src/pages/Dashboard.tsx`**

Remove the entire `useEffect` block (lines 99–109 in the current file) and the import of `MOCK_GRINDERS, MOCK_BEANS` from `mockData`.

The import line to remove:
```typescript
import { MOCK_GRINDERS, MOCK_BEANS } from '@/data/mockData'
```

The `useEffect` block to remove:
```typescript
useEffect(() => {
  if (grinders.length === 0) setGrinders(MOCK_GRINDERS)
  if (beans.length === 0) {
    setBeans(MOCK_BEANS)
    const activeBean = MOCK_BEANS.find(b => b.isActive) ?? MOCK_BEANS[0]
    useAppStore.setState({ selectedBean: activeBean, selectedGrinder: MOCK_GRINDERS[0] })
  } else if (!selectedBean) {
    useAppStore.setState({ selectedBean: beans.find(b => b.isActive) ?? beans[0] })
  }
}, []) // eslint-disable-line react-hooks/exhaustive-deps
```

Also remove `setGrinders`, `setBeans` from the store destructure if they're no longer used.

The `Dashboard` component also has a null guard `if (!selectedBean) return null` — keep this, as `selectedBean` will legitimately be null when the bean list is empty (no beans added yet).

- [ ] **Step 2: Update `src/pages/BeanProfiles.tsx`**

Remove the import of `MOCK_BEANS, MOCK_GRINDERS` from `mockData` and remove the `useEffect` seeding block (pattern: `if (beans.length === 0) setBeans(MOCK_BEANS)`).

- [ ] **Step 3: Update `src/pages/ShotLog.tsx`**

Remove:
```typescript
import { MOCK_SHOTS, MOCK_GRINDERS, MOCK_BEANS } from '@/data/mockData'
```

Remove the `useEffect` seeding block:
```typescript
useEffect(() => {
  if (shots.length    === 0) setShots(MOCK_SHOTS)
  if (grinders.length === 0) setGrinders(MOCK_GRINDERS)
  if (beans.length    === 0) setBeans(MOCK_BEANS)
}, []) // eslint-disable-line react-hooks/exhaustive-deps
```

Also remove `setShots`, `setGrinders`, `setBeans` from the store destructure if they're no longer used by the rest of the component (they're used for seeding only).

- [ ] **Step 4: Update `src/pages/BeanProfiles.test.tsx` to remove the `mockData` import**

`BeanProfiles.test.tsx` imports `MOCK_BEANS` and `MOCK_GRINDERS` directly from `@/data/mockData`. Replace with inline fixtures before deleting the file.

Replace the entire file:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAppStore } from '@/store/useAppStore'
import { MemoryRouter } from 'react-router-dom'
import BeanProfiles from './BeanProfiles'
import type { BeanProfile } from '@/types/bean'
import type { GrinderConfig } from '@/types/grinder'

const grinders: GrinderConfig[] = [
  { id: 'grinder-a', label: 'Junior', roastLevel: 'light', grinderType: 'stepped', baselineGrind: 18, tempCoefficient: 0.15, humidityCoefficient: 0.05, isActive: true },
]

const beans: BeanProfile[] = [
  { id: 'bean-1', name: 'Ethiopia Yirgacheffe', origin: 'Ethiopia', agtron: 78, roastLevel: 'light', baselineGrinds: { 'grinder-a': 18 }, baselineTemp: 25, baselineHumidity: 60, isActive: true,  createdAt: '2026-01-01T00:00:00Z' },
  { id: 'bean-2', name: 'Colombia Huila',       origin: 'Colombia', agtron: 58, roastLevel: 'medium', baselineGrinds: { 'grinder-a': 19 }, baselineTemp: 25, baselineHumidity: 60, isActive: false, createdAt: '2026-01-02T00:00:00Z' },
]

beforeEach(() => {
  useAppStore.setState({ beans, grinders, selectedBean: null, selectedGrinder: null })
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
    await userEvent.click(screen.getByText('Ethiopia Yirgacheffe'))
    expect(screen.getByText('Edit Bean Profile')).toBeTruthy()
    await userEvent.click(screen.getByText('Colombia Huila'))
    expect(screen.getByText('Edit Bean Profile')).toBeTruthy()
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

- [ ] **Step 5: Delete `src/data/mockData.ts`**

```bash
git rm src/data/mockData.ts
```

- [ ] **Step 6: Typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 8: Commit**

Note: `git rm` in Step 5 already staged the `mockData.ts` deletion — it will be included automatically.

```bash
git add src/pages/Dashboard.tsx src/pages/BeanProfiles.tsx src/pages/ShotLog.tsx src/pages/BeanProfiles.test.tsx
git commit -m "feat: remove mock seeding guards from pages and delete mockData.ts"
```

---

## Chunk 6: Final Verification

### Task 13: Full typecheck + test suite + handoff

**Files:** None changed — verification only.

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Full test suite**

```bash
npx vitest run
```

Expected: All tests pass. Count should be:
- `grindCalculator.test.ts` — 7 tests
- `useAppStore.test.ts` — 12 tests
- `api/grinders/index.test.ts` — 5 tests
- `api/beans/index.test.ts` — 5 tests
- `api/beans/[id].test.ts` — 6 tests
- `api/shots/index.test.ts` — 5 tests
- `BeanCard.test.tsx` — 6 tests
- `BeanForm.test.tsx` — 11 tests
- `BeanDrawer.test.tsx` — 4 tests
- `BeanProfiles.test.tsx` — 4 tests

**Total: ~65 tests**

- [ ] **Step 3: Push branch and confirm CI green**

```bash
git push origin feature/postgres-persistence
```

Check GitHub Actions passes.

- [ ] **Step 4: Run DB migration against the real database**

```bash
npm run db:migrate
```

Expected output:
```
Running migration…
✓ sensor_readings table ready
✓ grinders table ready
✓ beans table ready
✓ shot_logs table ready
Running seed…
✓ seeded 3 grinders
```

On subsequent runs: `✓ grinders already seeded — skipping`

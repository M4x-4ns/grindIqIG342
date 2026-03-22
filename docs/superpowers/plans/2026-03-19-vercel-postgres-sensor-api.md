# Vercel Postgres + Sensor API Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Vercel Postgres storage and two serverless API endpoints so the ESP32 can POST sensor readings and the frontend can poll `/api/sensor/latest` instead of calling the ESP32 directly.

**Architecture:** Two Vercel Serverless Functions (`api/sensor.ts` for POST, `api/sensor/latest.ts` for GET) read/write a `sensor_readings` Postgres table. `src/services/sensorService.ts` is updated to call `/api/sensor/latest` instead of the ESP32. The mock bypass (`VITE_DEV_SENSOR_BYPASS=true`) is unchanged for local dev.

**Tech Stack:** Vercel Postgres (`@vercel/postgres`), Vercel Serverless Functions (TypeScript, Web API `Request`/`Response`), Vite 8, React 19, Zustand 5

---

## Chunk 1: Infrastructure Setup

### Task 1: Install packages

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install `@vercel/postgres` as a runtime dependency**

```bash
npm install @vercel/postgres
```

Expected: `@vercel/postgres` appears in `dependencies` in `package.json`.

- [ ] **Step 2: Install `vercel` CLI as a dev dependency**

```bash
npm install --save-dev vercel
```

Expected: `vercel` appears in `devDependencies` in `package.json`.

- [ ] **Step 3: Verify both packages installed**

```bash
npm ls @vercel/postgres vercel --depth=0
```

Expected output (versions may differ):
```
├── @vercel/postgres@...
└── vercel@...
```

---

### Task 2: Create `vercel.json` and `tsconfig.api.json`

**Files:**
- Create: `vercel.json`
- Create: `tsconfig.api.json`

- [ ] **Step 1: Create `vercel.json`**

Vercel auto-routes `api/**` to serverless functions. This file only needs the SPA fallback rewrite so all non-API routes return `index.html`:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

- [ ] **Step 2: Create `tsconfig.api.json`**

The `api/` directory is outside `src/` and not covered by `tsconfig.app.json`. This config type-checks the API layer independently. It is **not** added to `tsconfig.json` references because `noEmit: true` is incompatible with `tsc --build`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["api"]
}
```

---

### Task 3: Add npm scripts to `package.json`

**Files:**
- Modify: `package.json`

The current `scripts` block in `package.json`:
```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 1: Add `typecheck:api` and `db:migrate` scripts**

Replace the `scripts` block with:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit",
  "typecheck:api": "tsc -p tsconfig.api.json",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest",
  "db:migrate": "node --env-file=.env.local --import=tsx/esm scripts/migrate.ts"
}
```

> **Note:** `db:migrate` uses Node's built-in `--env-file` flag (Node 20.6+) to load `.env.local` before running the migration script. This avoids adding a `dotenv` dependency.

- [ ] **Step 2: Verify scripts were added**

```bash
npm run typecheck:api 2>&1 | head -5
```

Expected: either an "error TS: No inputs were found" message (api/ doesn't exist yet — that's fine) or a clean exit. It should NOT say "command not found".

---

### Task 4: Link project to Vercel + create Postgres storage + pull env vars

**Files:**
- Modify: `.env.local` (updated by `vercel env pull`)
- Create: `.vercel/project.json` (created by `vercel link`)

> **Prerequisites:** You must be logged in to Vercel CLI. If not, run `npx vercel login` first.

- [ ] **Step 1: Link the local project to your Vercel project**

```bash
npx vercel link
```

Interactive prompts — select:
- "Link to existing project?" → Yes (if already deployed) or No (to create new)
- Team / scope: select your account
- Project name: `grindiq` (or whatever matches your Vercel dashboard)

Expected: `.vercel/project.json` is created with `projectId` and `orgId`.

- [ ] **Step 2: Create a Vercel Postgres storage instance**

```bash
npx vercel storage create
```

Interactive prompts:
- Storage type: **Postgres**
- Name: `grindiq-db`
- Region: choose the closest (e.g. `sin1` for Southeast Asia, `iad1` for US East)

> **Note:** Depending on CLI version this command may be `vercel storage add` instead of `vercel storage create`. Both do the same thing.

Expected: Postgres instance created and linked to the project.

- [ ] **Step 3: Pull environment variables into `.env.local`**

```bash
npx vercel env pull .env.local
```

Expected: `.env.local` is updated with `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_PRISMA_URL`, `POSTGRES_USER`, `POSTGRES_HOST`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`.

- [ ] **Step 4: Verify Postgres env vars were added**

```bash
grep POSTGRES .env.local
```

Expected: at least 3–4 lines starting with `POSTGRES_`.

- [ ] **Step 5: Clean up stale env vars from `.env.local`**

Open `.env.local` and remove these two lines (they are no longer used):
```
VITE_ESP32_BASE_URL=http://192.168.1.100
VITE_SENSOR_POLL_INTERVAL=30000
```

The `GRINDIQ_GH_TOKEN` line is pre-existing — leave it untouched.

- [ ] **Step 6: Commit Chunk 1**

```bash
git add vercel.json tsconfig.api.json package.json package-lock.json
git commit -m "chore: add Vercel config, API tsconfig, and npm scripts"
```

> Note: `.env.local` is gitignored and must NOT be committed.

---

## Chunk 2: Database & API Endpoints

> **Prerequisites:** Chunk 1 must be complete. `vercel link`, `vercel storage create`, and `vercel env pull` must have run, and `.env.local` must contain `POSTGRES_URL`. The `typecheck:api` and `db:migrate` npm scripts must be present in `package.json`.

### Task 5: Create migration script and run it

**Files:**
- Create: `scripts/migrate.ts`

- [ ] **Step 1: Create `scripts/migrate.ts`**

```typescript
import { sql } from '@vercel/postgres'

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
  process.exit(0)
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
```

- [ ] **Step 2: Run the migration**

```bash
npm run db:migrate
```

Expected output:
```
Running migration…
✓ sensor_readings table ready
```

If it prints an error about missing `POSTGRES_URL`, verify that `vercel env pull` ran successfully (Chunk 1 Task 4 Step 3) and that `.env.local` contains `POSTGRES_URL=...`.

---

### Task 6: Create `api/sensor.ts` — POST endpoint

**Files:**
- Create: `api/sensor.ts`

- [ ] **Step 1: Create `api/sensor.ts`**

```typescript
import { sql } from '@vercel/postgres'

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  // Authenticate
  const apiKey = req.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env['SENSOR_API_KEY']) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // Guard: body must be a plain object (not null, array, or primitive)
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return Response.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { temperature, humidity } = body as Record<string, unknown>

  // Validate (DHT22 hardware limits: temp −40..80 °C, humidity 0..100 %)
  if (
    typeof temperature !== 'number' || typeof humidity !== 'number' ||
    !isFinite(temperature) || !isFinite(humidity) ||
    temperature < -40 || temperature > 80 ||
    humidity < 0    || humidity > 100
  ) {
    return Response.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // Insert
  try {
    await sql`
      INSERT INTO sensor_readings (temperature, humidity)
      VALUES (${temperature}, ${humidity})
    `
    return Response.json({ ok: true }, { status: 201 })
  } catch (err) {
    console.error('DB insert error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npm run typecheck:api
```

Expected: no errors. If `@vercel/postgres` types are missing, ensure Chunk 1 Task 1 completed successfully.

---

### Task 7: Create `api/sensor/latest.ts` — GET endpoint

**Files:**
- Create: `api/sensor/latest.ts`

Vercel routes `api/sensor.ts` → `/api/sensor` and `api/sensor/latest.ts` → `/api/sensor/latest`. These two files coexist — `api/sensor/` is a subdirectory alongside `api/sensor.ts`.

- [ ] **Step 1: Create `api/sensor/latest.ts`**

```typescript
import { sql } from '@vercel/postgres'

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const { rows } = await sql<{
      temperature: number
      humidity: number
      created_at: string
    }>`
      SELECT temperature, humidity, created_at
      FROM sensor_readings
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (rows.length === 0) {
      return Response.json({ error: 'No data' }, { status: 404 })
    }

    const row = rows[0]
    return Response.json({
      temperature: row.temperature,
      humidity:    row.humidity,
      timestamp:   row.created_at,
    })
  } catch (err) {
    console.error('DB query error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npm run typecheck:api
```

Expected: no errors.

- [ ] **Step 3: Verify file structure**

```bash
ls api/ && ls api/sensor/
```

Expected:
```
sensor.ts
---
latest.ts
```

- [ ] **Step 4: Commit Chunk 2**

```bash
git add api/ scripts/
git commit -m "feat: add Vercel Postgres migration and sensor API endpoints"
```

---

## Chunk 3: Frontend Update & Verification

> **Prerequisites:** Chunk 1 and Chunk 2 must be complete. The `sensor_readings` table must exist in Vercel Postgres. `SENSOR_API_KEY` will be generated in Task 9.

### Task 8: Update `src/services/sensorService.ts`

**Files:**
- Modify: `src/services/sensorService.ts`

Current file (for reference):
```typescript
import axios from 'axios'
import type { SensorReading } from '@/types/sensor'

const ESP32_BASE_URL = import.meta.env.VITE_ESP32_BASE_URL ?? 'http://192.168.1.100'
const POLL_INTERVAL_MS = Number(import.meta.env.VITE_SENSOR_POLL_INTERVAL ?? 30_000)

export async function fetchSensorReading(): Promise<SensorReading> {
  const response = await axios.get<SensorReading>(`${ESP32_BASE_URL}/sensor`, {
    timeout: 5_000,
  })
  return response.data
}

export { POLL_INTERVAL_MS }
```

> **Note:** `axios` is only removed from this file's import — it stays in `package.json` because `src/services/apiService.ts` still uses it.

- [ ] **Step 1: Replace the entire contents of `src/services/sensorService.ts`**

```typescript
import type { SensorReading } from '@/types/sensor'

/**
 * PRD §F-03 — Sensor Integration via Vercel API
 * Fetches the latest temperature & humidity from /api/sensor/latest.
 * Poll interval is 10 s.
 */
export const POLL_INTERVAL_MS = 10_000

export async function fetchSensorReading(): Promise<SensorReading> {
  const res = await fetch('/api/sensor/latest')
  if (!res.ok) throw new Error(`Sensor API ${res.status}`)
  return res.json() as Promise<SensorReading>
}
```

- [ ] **Step 2: Run TypeScript check to verify no regressions**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all 9 existing tests pass.

---

### Task 9: Update `src/hooks/useSensor.ts` JSDoc + add `SENSOR_API_KEY`

**Files:**
- Modify: `src/hooks/useSensor.ts` (JSDoc only)
- Modify: `.env.local`

> **Note:** `VITE_ESP32_BASE_URL` and `VITE_SENSOR_POLL_INTERVAL` were already removed from `.env.local` in Chunk 1 Task 4 Step 5.

- [ ] **Step 1: Update the JSDoc comment in `src/hooks/useSensor.ts`**

Find this block (lines 6–10):
```typescript
/**
 * PRD §F-03 — Polls ESP32 sensor every POLL_INTERVAL_MS (default 30s).
 * Falls back to manual input if sensor is unreachable.
 * In local dev, VITE_DEV_SENSOR_BYPASS=true returns mock data instead.
 */
```

Replace with:
```typescript
/**
 * PRD §F-03 — Polls /api/sensor/latest every POLL_INTERVAL_MS (default 10s).
 * Sets status: 'disconnected' if the API is unreachable.
 * In local dev, VITE_DEV_SENSOR_BYPASS=true returns mock data instead.
 */
```

No other changes to this file.

- [ ] **Step 2: Verify no logic was accidentally changed**

```bash
git diff src/hooks/useSensor.ts
```

Expected: only the 3-line JSDoc comment changed. If any other lines differ, revert and redo Step 1.

- [ ] **Step 3: Generate a `SENSOR_API_KEY` (32-char hex)**

```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

Copy the output — you will use it in the next two steps.

- [ ] **Step 4: Add `SENSOR_API_KEY` to `.env.local`**

Open `.env.local` and add this line (using the value from Step 3):
```
SENSOR_API_KEY=<paste-your-32-char-hex-here>
```

`.env.local` is gitignored — do not commit it.

- [ ] **Step 5: Add `SENSOR_API_KEY` to Vercel dashboard**

1. Open https://vercel.com → your project → Settings → Environment Variables
2. Add variable:
   - Name: `SENSOR_API_KEY`
   - Value: the same 32-char hex from Step 3
   - Environments: Production, Preview, Development (all three)
3. Save

- [ ] **Step 6: Commit frontend changes**

```bash
git add src/services/sensorService.ts src/hooks/useSensor.ts
git commit -m "feat: update sensorService to poll /api/sensor/latest (10s interval)"
```

---

### Task 10: Verify end-to-end with `vercel dev` + curl

This task verifies the full stack works locally before deploying. The project is already linked to Vercel from Chunk 1 Task 4 Step 1.

- [ ] **Step 1: Start `vercel dev` in a separate terminal**

```bash
npx vercel dev
```

Expected: server starts on http://localhost:3000 (Vercel dev uses port 3000 by default, not 5173). Both the Vite frontend and the API functions are served.

Leave this running for Steps 2–6.

- [ ] **Step 2: Test POST /api/sensor — valid reading**

In a new terminal (replace `<KEY>` with your SENSOR_API_KEY from Task 9 Step 3):

```bash
curl -s -X POST http://localhost:3000/api/sensor \
  -H "Content-Type: application/json" \
  -H "x-api-key: <KEY>" \
  -d '{"temperature": 24.5, "humidity": 58.3}' | python -m json.tool
```

Expected:
```json
{ "ok": true }
```

- [ ] **Step 3: Test GET /api/sensor/latest**

```bash
curl -s http://localhost:3000/api/sensor/latest | python -m json.tool
```

Expected:
```json
{
  "temperature": 24.5,
  "humidity": 58.3,
  "timestamp": "2026-03-19T..."
}
```

- [ ] **Step 4: Test wrong API key → 401**

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/sensor \
  -H "Content-Type: application/json" \
  -H "x-api-key: wrongkey" \
  -d '{"temperature": 20, "humidity": 50}'
```

Expected output: `401`

- [ ] **Step 5: Test out-of-range value → 400**

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/sensor \
  -H "Content-Type: application/json" \
  -H "x-api-key: <KEY>" \
  -d '{"temperature": 999, "humidity": 50}'
```

Expected output: `400`

- [ ] **Step 6: Verify frontend displays live sensor data**

1. In `.env.local`, temporarily set `VITE_DEV_SENSOR_BYPASS=false`
2. Restart `vercel dev` (Ctrl+C, then `npx vercel dev` again)
3. Open http://localhost:3000 in a browser
4. The SensorStatus pill in the header should show the temperature and humidity from Step 2 (e.g. "24.5°C · 58%")
5. Restore `VITE_DEV_SENSOR_BYPASS=true` in `.env.local` when done
6. Stop `vercel dev` (Ctrl+C)

---

### Task 11: Deploy to Vercel

- [ ] **Step 1: Run production build to catch any issues**

```bash
npm run build
```

Expected: no TypeScript or Vite errors. Build output in `dist/`.

- [ ] **Step 2: Push to staging and create PR**

```bash
git push origin HEAD:staging
gh pr create --base main --head staging \
  --title "feat: Vercel Postgres + sensor API endpoints" \
  --body "$(cat <<'EOF'
## Summary
- Vercel Postgres storage with sensor_readings table
- POST /api/sensor — receives ESP32 readings (x-api-key auth, DHT22 range validation)
- GET /api/sensor/latest — returns latest reading (public)
- sensorService.ts updated to poll /api/sensor/latest (10s interval)
- Removed direct ESP32 dependency

## Test plan
- [ ] POST /api/sensor with valid key → 201 { ok: true }
- [ ] POST with wrong key → 401
- [ ] POST with out-of-range values → 400
- [ ] GET /api/sensor/latest → 200 with temperature/humidity/timestamp
- [ ] GET with empty DB → 404
- [ ] Frontend SensorStatus shows live reading when bypass=false

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Merge the PR**

```bash
gh pr merge --squash
```

- [ ] **Step 4: Verify Vercel deployment**

1. Open https://vercel.com → your project → Deployments
2. Wait for the deployment to complete (1–2 minutes)
3. Once deployed, test the live endpoint:

```bash
curl -s https://<your-vercel-domain>/api/sensor/latest | python -m json.tool
```

Expected: `{"error": "No data"}` (404) if the ESP32 hasn't posted yet — the DB on production is still empty. This is correct. The endpoint is live and ready to receive readings from the ESP32.

---

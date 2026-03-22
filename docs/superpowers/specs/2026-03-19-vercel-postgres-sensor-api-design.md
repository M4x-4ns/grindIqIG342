# GrindIQ Phase 1 — Vercel Postgres + Sensor API Design

**Date:** 2026-03-19
**Status:** Approved

---

## Overview

Add a Vercel Postgres database and two serverless API endpoints so that:
1. The ESP32 + DHT22 sensor can POST temperature/humidity readings to the cloud
2. The React frontend can poll the latest reading from a reliable HTTPS endpoint

The direct ESP32 → frontend data path is removed. Vercel is the single data path going forward.

---

## Architecture

```
ESP32 (DHT22)
    │  POST /api/sensor
    │  Headers: x-api-key: $SENSOR_API_KEY, Content-Type: application/json
    │  Body:    { "temperature": 25.4, "humidity": 61.2 }
    ▼
Vercel Serverless Functions (/api/)
    ├── api/sensor.ts          POST: validate key → validate payload → INSERT
    └── api/sensor/latest.ts   GET:  SELECT latest row → { temperature, humidity, timestamp }
              │
              ▼
    Vercel Postgres (sensor_readings table)
              │
              ▼
    src/services/sensorService.ts
    (fetchSensorReading → fetch('/api/sensor/latest'))
              │
              ▼
    src/hooks/useSensor.ts
    (polls every 10 s; sets Zustand sensor state)
```

---

## Database

**Table: `sensor_readings`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial PRIMARY KEY` | Auto-increment |
| `temperature` | `float NOT NULL` | °C |
| `humidity` | `float NOT NULL` | % RH |
| `created_at` | `timestamptz DEFAULT now()` | UTC timestamp |

Migration script: `scripts/migrate.ts`
Run with: `npx tsx scripts/migrate.ts`
SQL must use `CREATE TABLE IF NOT EXISTS` so the script is safe to re-run.
`scripts/migrate.ts` uses `@vercel/postgres` (`sql` tagged template) — no additional Postgres client dependency needed. Requires `POSTGRES_URL` to be present in `.env.local` (added by `vercel env pull`).

---

## API Endpoints

### POST `/api/sensor`

Receives a reading from the ESP32. **Authentication required.**

**Request**
```
Header: x-api-key: <SENSOR_API_KEY>
Header: Content-Type: application/json
Body:   { "temperature": 25.4, "humidity": 61.2 }
```

Body is parsed with `req.json()` (Vercel's built-in Request API).

**Validation rules (DHT22 hardware limits)**

| Field | Rule |
|-------|------|
| `temperature` | number, -40 ≤ value ≤ 80 |
| `humidity` | number, 0 ≤ value ≤ 100 |

**Response (201)**
```json
{ "ok": true }
```

**Error responses**

| Condition | Status | Body |
|-----------|--------|------|
| Missing / wrong `x-api-key` header | 401 | `{ "error": "Unauthorized" }` |
| Missing fields, non-numeric, or out of DHT22 range | 400 | `{ "error": "Invalid payload" }` |
| DB error | 500 | `{ "error": "Internal server error" }` |

---

### GET `/api/sensor/latest`

Returns the most recent sensor reading. **Intentionally public** — temperature/humidity is not sensitive and does not require authentication.

**Response (200)**
```json
{ "temperature": 25.4, "humidity": 61.2, "timestamp": "2026-03-19T03:00:00.000Z" }
```

`timestamp` is the `created_at` value from the DB row, ISO 8601 formatted.

**Error responses**

| Condition | Status | Body |
|-----------|--------|------|
| No rows in DB | 404 | `{ "error": "No data" }` |
| DB error | 500 | `{ "error": "Internal server error" }` |

---

## Frontend Changes

### `src/services/sensorService.ts`

- Remove `axios` import and the `VITE_ESP32_BASE_URL` reference
- Replace the ESP32 fetch with `fetch('/api/sensor/latest')`, throw on non-OK response
- Remove `VITE_SENSOR_POLL_INTERVAL` env reference — poll interval is now hardcoded
- Hardcode and export `POLL_INTERVAL_MS = 10_000`
- Return the same `SensorReading` type (`{ temperature, humidity, timestamp }`) — no consumer changes needed
- Note: `axios` stays in `package.json` because `src/services/apiService.ts` still uses it

### `src/hooks/useSensor.ts`

- Update JSDoc: "default 30s" → "default 10s"; remove the ESP32 reference and the "Falls back to manual input" line (the hook now sets `status: 'disconnected'` on error, not a manual fallback)
- No logic changes — imports `POLL_INTERVAL_MS` from `sensorService.ts`; the hardcoded value takes effect automatically

---

## TypeScript Configuration

The `api/` directory is outside `src/` and is not covered by `tsconfig.app.json`. Add a dedicated `tsconfig.api.json`:

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

API files (`api/sensor.ts`, `api/sensor/latest.ts`) do **not** import from `src/` — all types are defined inline, so no `baseUrl`/`paths` alias is needed.

`tsconfig.api.json` is **not** added as a reference in `tsconfig.json` — `noEmit: true` is incompatible with `tsc --build` project references. Instead, add a dedicated typecheck script to `package.json`:

```json
"typecheck:api": "tsc -p tsconfig.api.json"
```

The existing `tsc -b` (frontend build) is unaffected. Run `npm run typecheck:api` to verify the API layer separately.

---

## Vercel Configuration

A `vercel.json` is required for a plain Vite SPA to rewrite all non-API routes to `index.html`. Vercel automatically routes `api/**` to serverless functions — no explicit rewrite for that path is needed:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## Environment Variables

| Variable | Location | Notes |
|----------|----------|-------|
| `POSTGRES_URL` (+ `POSTGRES_URL_NON_POOLING`, etc.) | Auto-added by `vercel env pull` | Provided by `vercel storage create` |
| `SENSOR_API_KEY` | `.env.local` + Vercel dashboard | 32-char random hex; generated during setup |
| `VITE_APP_ENV` | `.env.local` | Retained unchanged |
| `VITE_API_BASE_URL` | `.env.local` | Retained unchanged |
| `VITE_DEV_SENSOR_BYPASS` | `.env.local` | Stays `true` in local dev |
| ~~`VITE_ESP32_BASE_URL`~~ | Removed from `.env.local` | No longer needed |
| ~~`VITE_SENSOR_POLL_INTERVAL`~~ | Removed from `.env.local` | Hardcoded to 10 000 ms in `sensorService.ts` |

**`.env.local` Phase 1 keys** (pre-existing unrelated keys such as `GRINDIQ_GH_TOKEN` are retained untouched):
```
POSTGRES_URL=...              # added by vercel env pull
POSTGRES_URL_NON_POOLING=...
POSTGRES_PRISMA_URL=...
POSTGRES_USER=...
POSTGRES_HOST=...
POSTGRES_PASSWORD=...
POSTGRES_DATABASE=...
VITE_APP_ENV=local
VITE_API_BASE_URL=http://localhost:3001
VITE_DEV_SENSOR_BYPASS=true
SENSOR_API_KEY=<32-char hex>
# ...any pre-existing unrelated keys remain
```

**Security note:** Before modifying `.env.local`, audit it for any pre-existing secrets (e.g. tokens) that may need rotation. Do not commit `.env.local` to git.

---

## Local Development Workflow

**Prerequisite:** Vercel CLI must be available. Install as a dev dependency:
```bash
npm install --save-dev vercel
```

| Scenario | Command | Notes |
|----------|---------|-------|
| Normal frontend dev (bypass on) | `npm run dev` | `VITE_DEV_SENSOR_BYPASS=true` — mock data, no API calls |
| Full-stack dev (bypass off) | `npx vercel dev` | Starts both Vite and the serverless functions; required when `VITE_DEV_SENSOR_BYPASS=false` |

`fetch('/api/sensor/latest')` will 404 under `npm run dev` because Vite does not serve serverless functions. Use `npx vercel dev` to test the real data path locally.

---

## Files Created / Changed

| Action | Path | Purpose |
|--------|------|---------|
| Install (`dependencies`) | `@vercel/postgres` | Vercel's pooled Postgres client — runs at runtime in serverless functions |
| Install (`devDependencies`) | `vercel` | CLI for `vercel dev` local full-stack development |
| Create | `api/sensor.ts` | POST endpoint — auth + validate + insert |
| Create | `api/sensor/latest.ts` | GET endpoint — fetch latest row |
| Create | `scripts/migrate.ts` | Idempotent table creation (`IF NOT EXISTS`) |
| Create | `tsconfig.api.json` | TypeScript config for `api/` directory |
| Create | `vercel.json` | SPA fallback rewrite (`api/**` auto-routed by Vercel) |
| Update | `package.json` | Add `typecheck:api` script; add `vercel` to devDeps; add `@vercel/postgres` to deps |
| Update | `src/services/sensorService.ts` | Replace ESP32 call; hardcode `POLL_INTERVAL_MS = 10_000`; drop `axios` import |
| Update | `src/hooks/useSensor.ts` | Update JSDoc comment only (no logic changes) |
| Update | `.env.local` | Add `SENSOR_API_KEY`; remove `VITE_ESP32_BASE_URL`, `VITE_SENSOR_POLL_INTERVAL` |

---

## Out of Scope

- ESP32 firmware changes (handled separately; ESP32 must send `Content-Type: application/json` and `x-api-key` headers)
- Local ESP32 fallback (Phase 2)
- Authentication / user accounts
- Data retention / pruning of old rows
- Rate limiting on the POST endpoint
- Removing `axios` from `package.json` (`apiService.ts` still uses it)

# GrindIQ

Real-time grind setting calculator for specialty coffee shops. Reads ambient temperature and humidity from an ESP32 + DHT22 sensor and recommends adjusted grind numbers for up to three grinders, based on bean profile baselines and the roast-corrected formula defined in the PRD.

Built for tablet use (768 px portrait), dark mode, one-hand operation.

---

## Tech Stack

- **React 19** + **TypeScript** + **Vite 8**
- **Tailwind CSS v3** (dark mode via `class`)
- **Zustand** — global state
- **React Router v7** — client-side routing
- **Axios** — HTTP (ESP32 sensor API + backend)
- **Vitest** — unit tests
- **ESLint** + **TypeScript-ESLint** — linting

---

## Local Development

### Prerequisites

- Node.js 20+
- npm 10+

### Setup

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description | Default |
|---|---|---|
| `VITE_APP_ENV` | Environment identifier | `local` |
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:3001` |
| `VITE_ESP32_BASE_URL` | ESP32 sensor IP address | `http://192.168.1.100` |
| `VITE_SENSOR_POLL_INTERVAL` | Sensor poll interval (ms) | `30000` |
| `VITE_DEV_SENSOR_BYPASS` | Return mock sensor data in dev | `false` |

Set `VITE_DEV_SENSOR_BYPASS=true` in `.env.local` to skip the ESP32 connection and use mock temperature/humidity values during local development.

### Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Type-check + production build
npm run preview    # Preview production build locally
npm run lint       # Run ESLint
npm run typecheck  # Run TypeScript type check (no emit)
npm test           # Run Vitest test suite
```

---

## Project Structure

```
src/
├── components/       # Reusable UI components
├── hooks/            # Custom React hooks (useSensor, etc.)
├── pages/            # Page-level components (Dashboard, ShotLog, BeanProfiles)
├── services/         # API layer (sensorService, apiService)
├── store/            # Zustand store (useAppStore)
├── types/            # TypeScript types (bean, grinder, shot, sensor)
└── utils/            # Pure utilities (grindCalculator)
```

---

## Grind Formula

From PRD §7.1:

```
Final Grind = Baseline + dTemp + dHumidity + dAgtron

dTemp     = (currentTemp − baselineTemp) × tempCoefficient
dHumidity = (currentHumidity − baselineHumidity) × humidityCoefficient
dAgtron   = −0.5  if Agtron ≥ 65 (light roast)
             +0.5  if Agtron ≤ 45 (dark roast)
              0    otherwise
```

Stepped grinders round to the nearest integer. Stepless grinders round to one decimal place.

---

## CI/CD

Two GitHub Actions workflows run on every push and PR:

**`ci.yml`** — Quality gate. Runs lint, type check, and tests in parallel, then builds only if all three pass. Triggers on `main`, `develop`, `staging`, and `release/**`.

**`deploy.yml`** — Deploys to Vercel. `develop`, `staging`, and `release/**` branches deploy to the staging environment. `main` deploys to production.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full GitFlow and branch strategy.

---

## Branch Protection Rules

The following rules must be configured manually in GitHub under **Settings → Branches** after the repository is created. They cannot be set via files in the repository.

### `main`

- Require a pull request before merging
- Require at least **1 approving review**
- Require status checks to pass before merging — required checks: `Lint`, `Type Check`, `Test`, `Build`
- Do not allow bypassing the above settings
- **Block direct pushes** (no force push, no admin bypass)

### `develop`

- Require a pull request before merging
- Require status checks to pass before merging — required checks: `Lint`, `Type Check`, `Test`, `Build`
- Do not allow bypassing the above settings

### `staging`

- Require status checks to pass before merging — required checks: `Lint`, `Type Check`, `Test`, `Build`

> These rules ensure no code reaches production without passing CI and receiving a review. The `develop` and `staging` branches do not require reviews to keep the integration loop fast, but they do require CI to pass.

---

## Required GitHub Actions Secrets

Add these under **Settings → Secrets and variables → Actions**:

| Secret | Description |
|---|---|
| `VERCEL_TOKEN` | Vercel personal access token |
| `VERCEL_ORG_ID` | Found in `.vercel/project.json` after `vercel link` |
| `VERCEL_PROJECT_ID` | Found in `.vercel/project.json` after `vercel link` |
| `STAGING_API_BASE_URL` | e.g. `https://api-staging.grindiq.app` |
| `PRODUCTION_API_BASE_URL` | e.g. `https://api.grindiq.app` |
| `ESP32_BASE_URL` | Local network IP of the sensor, e.g. `http://192.168.1.100` |


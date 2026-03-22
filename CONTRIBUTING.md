# Contributing to GrindIQ

## Branch Model

GrindIQ uses a structured GitFlow with a dedicated staging step between integration and production.

```
feature/*  ──squash──►  develop  ──merge──►  staging  ──merge──►  release/vX.Y  ──merge──►  main
                                                                                               ▲
hotfix/*  ─────────────────────────────────────────────────────────────────────────────────────┘
```

| Branch | Purpose | Deploys to |
|---|---|---|
| `main` | Production-ready code only | Vercel production |
| `release/vX.Y` | Release candidate — final QA | Vercel staging |
| `staging` | Integration testing before a release cut | Vercel staging |
| `develop` | Ongoing integration of completed features | Vercel staging |
| `feature/*` | Individual feature work | — (local only) |
| `hotfix/*` | Urgent production fixes | → `main` directly |

---

## Feature Branch Workflow

### 1. Create a feature branch from `develop`

Always branch from `develop`, never from `staging` or `main`.

```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

Branch names should be lowercase kebab-case and describe the work: `feature/bean-profile-editor`, `feature/sensor-reconnect-logic`.

### 2. Work on your feature

Commit often using [Conventional Commits](#commit-message-format). Keep commits focused and atomic.

```bash
git add -p          # stage hunks, not whole files
git commit -m "feat(dashboard): add grinder tab persistence"
```

### 3. Keep your branch up to date

Rebase onto `develop` regularly to avoid large merge conflicts.

```bash
git fetch origin
git rebase origin/develop
```

### 4. Open a Pull Request into `develop`

When ready, push your branch and open a PR targeting `develop`.

```bash
git push -u origin feature/your-feature-name
```

On GitHub: base branch = `develop`. PR title should follow Conventional Commits format. Include a short description of what changed and why.

CI (lint + typecheck + test + build) must pass before merging. Use **squash merge** to keep the `develop` history clean — the squash commit message should be the conventional commit summary of the whole feature.

---

## Promoting develop → staging → release → main

### Step 1: Merge `develop` into `staging`

When `develop` has accumulated features ready for a release cycle, merge it into `staging`. This triggers a Vercel staging deploy for QA.

```bash
git checkout staging
git pull origin staging
git merge --no-ff origin/develop
git push origin staging
```

QA validates the staging deployment. Any fixes found at this stage go in as small commits directly on `staging` (or as `fix/*` branches into `staging`), then backmerge into `develop`.

### Step 2: Cut a `release/vX.Y` branch from `staging`

Once staging passes QA, create the release branch. This is the release candidate — no new features, only version bump and last-minute fixes.

```bash
git checkout staging
git pull origin staging
git checkout -b release/1.2.0
```

- Bump the version in `package.json`
- Update `CHANGELOG.md` if you maintain one
- Commit: `chore(release): bump version to 1.2.0`
- Push: `git push -u origin release/1.2.0`

The `release/1.2.0` branch also deploys to Vercel staging automatically, so you can do a final sanity check on the exact build that will go to production.

### Step 3: Merge `release/vX.Y` into `main`

Open a PR from `release/1.2.0` → `main`. This requires CI to pass and at least one approval (see branch protection rules in `README.md`). Use a **merge commit** (not squash) to preserve the release history.

```bash
# After PR is approved and merged on GitHub:
git checkout main
git pull origin main
git tag v1.2.0
git push origin v1.2.0
```

### Step 4: Backmerge `main` into `develop`

After every release, merge `main` back into `develop` to bring in any release-branch fixes.

```bash
git checkout develop
git merge --no-ff origin/main
git push origin develop
```

---

## Hotfix Process

Hotfixes are for urgent production bugs only — regressions, security issues, data integrity problems. Do not use hotfixes for new features or non-urgent improvements.

### 1. Branch from `main`

```bash
git checkout main
git pull origin main
git checkout -b hotfix/fix-grind-overflow
```

### 2. Fix, commit, and PR into `main`

```bash
git commit -m "fix(calculator): clamp grind value to prevent overflow"
git push -u origin hotfix/fix-grind-overflow
```

Open a PR targeting `main`. Requires CI pass and 1 approval. Merge with a merge commit.

```bash
git checkout main && git pull origin main
git tag v1.2.1
git push origin v1.2.1
```

### 3. Backmerge into `develop`

```bash
git checkout develop
git merge --no-ff origin/main
git push origin develop
```

If `staging` has diverged, also merge into `staging`:

```bash
git checkout staging
git merge --no-ff origin/main
git push origin staging
```

---

## Commit Message Format

GrindIQ uses [Conventional Commits](https://www.conventionalcommits.org/).

```
<type>(<scope>): <short summary>

[optional body]

[optional footer: BREAKING CHANGE / closes #issue]
```

### Types

| Type | When to use |
|---|---|
| `feat` | A new feature visible to users |
| `fix` | A bug fix |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `chore` | Build process, dependency updates, tooling |
| `ci` | Changes to CI/CD workflows |
| `docs` | Documentation only |
| `style` | Formatting, whitespace (no logic change) |
| `perf` | Performance improvement |

### Scopes (GrindIQ-specific)

`dashboard`, `shotlog`, `calculator`, `sensor`, `store`, `beans`, `grinder`, `router`, `api`, `types`, `hooks`, `release`

### Examples

```
feat(dashboard): persist selected grinder tab to localStorage
fix(sensor): handle timeout when ESP32 is unreachable
refactor(calculator): extract agtron delta into helper function
test(calculator): add edge cases for very-dark roast profile
chore(deps): upgrade vite to 8.1.0
ci: add staging branch to deploy workflow triggers
docs: update CONTRIBUTING with hotfix process
```

### Breaking changes

Add `BREAKING CHANGE:` in the commit footer:

```
feat(api): change sensor endpoint response shape

BREAKING CHANGE: /sensor now returns { data: SensorReading } wrapper
```

---

## What Not to Commit

- `.env.local`, `.env.staging`, `.env.production` — these are gitignored and contain secrets
- `node_modules/` — always gitignored
- `dist/` — built by CI, never commit manually
- Any file containing tokens, passwords, or API keys — use GitHub Actions secrets instead

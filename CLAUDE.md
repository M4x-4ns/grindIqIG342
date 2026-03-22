# GrindIQ — Claude Code Guidelines

## Git Workflow

### Branch Strategy

- **Default working branch:** `develop`
- **Production branch:** `main`
- Every new feature must be created on a dedicated branch from `develop`:
  ```
  git checkout develop && git pull && git checkout -b feature/feature-name
  ```
  Branch name format: `feature/<kebab-case-description>` (e.g. `feature/bean-profiles-crud`)

### Rules

1. **Never commit or push directly to `develop` or `main`** — all work goes through feature branches. Exception: hotfixes may be committed directly to `main` and cherry-picked to `develop`.

2. **Before starting any work**, always run:
   ```bash
   git status
   git branch
   ```
   Verify you are on the correct feature branch before making any changes.

3. **When a feature is complete**, inform the user:
   - The feature branch name (e.g. `feature/bean-profiles-crud`)
   - That they can squash-merge it into `develop` themselves, **or** ask if they want to merge directly.
   - Do not merge without explicit user approval.

### Branch Reference

| Branch | Purpose |
|---|---|
| `main` | Production — deployed via GitHub Actions |
| `develop` | Integration — deployed to staging |
| `feature/*` | Active feature work — branched from `develop` |
| `hotfix/*` | Urgent production fixes — branched from `main` |

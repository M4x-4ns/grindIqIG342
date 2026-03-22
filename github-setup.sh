#!/usr/bin/env bash
# ============================================================
# GrindIQ — GitHub Repository Setup Script
# Run this ONCE from inside the grindiq/ folder:
#   chmod +x github-setup.sh && ./github-setup.sh
# ============================================================

set -e

# Set GRINDIQ_GH_TOKEN in your shell before running this script:
#   export GRINDIQ_GH_TOKEN="github_pat_..."
GH_TOKEN="${GRINDIQ_GH_TOKEN:?GRINDIQ_GH_TOKEN is not set. Export it before running this script.}"
REPO_NAME="grindiq"
GH_USER=$(curl -s -H "Authorization: Bearer $GH_TOKEN" \
               -H "Accept: application/vnd.github+json" \
               https://api.github.com/user | python3 -c "import sys,json; print(json.load(sys.stdin)['login'])")

echo "▶ GitHub user: $GH_USER"

# ── 1. Create private repo on GitHub ─────────────────────────
echo "▶ Creating private repo '$REPO_NAME'..."
curl -s -X POST \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/user/repos \
  -d "{\"name\":\"$REPO_NAME\",\"private\":true,\"description\":\"GrindIQ — Real-time grind calculator for coffee shops\",\"auto_init\":false}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('  Created:', d.get('html_url', d.get('message','error')))"

REMOTE="https://$GH_TOKEN@github.com/$GH_USER/$REPO_NAME.git"

# ── 2. Initialise git ─────────────────────────────────────────
echo "▶ Initialising git..."
git init
git config user.email "deachritans@gmail.com"
git config user.name "Deachrit"

# ── 3. First commit on main ───────────────────────────────────
echo "▶ Staging files..."
git add .
git commit -m "feat: initial project setup

- React 19 + TypeScript + Vite 8 + Tailwind CSS 3
- Zustand store, React Router, Axios
- Types: BeanProfile, ShotLog, GrinderConfig, SensorState
- grindCalculator utility (PRD §7.1 formula)
- useSensor hook with ESP32 polling + VITE_DEV_SENSOR_BYPASS
- Pages: Dashboard, ShotLog, BeanProfiles
- GitHub Actions: CI (lint + typecheck + test + build)
- GitHub Actions: Deploy (staging→develop, production→main)"

# ── 4. Push to main ───────────────────────────────────────────
echo "▶ Pushing to main..."
git remote add origin "$REMOTE"
git branch -M main
git push -u origin main

# ── 5. Create develop branch ─────────────────────────────────
echo "▶ Creating develop branch..."
git checkout -b develop
git push -u origin develop
git checkout main

# ── 6. Add GitHub Actions secrets reminder ───────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅  Done! Repo: https://github.com/$GH_USER/$REPO_NAME"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Next: add these GitHub Actions secrets in the repo      ║"
echo "║  (Settings → Secrets → Actions):                         ║"
echo "║                                                           ║"
echo "║  VERCEL_TOKEN          your Vercel token                 ║"
echo "║  VERCEL_ORG_ID         from .vercel/project.json         ║"
echo "║  VERCEL_PROJECT_ID     from .vercel/project.json         ║"
echo "║  STAGING_API_BASE_URL  https://api-staging.grindiq.app   ║"
echo "║  PRODUCTION_API_BASE_URL  https://api.grindiq.app        ║"
echo "║  ESP32_BASE_URL        http://192.168.x.x                ║"
echo "╚══════════════════════════════════════════════════════════╝"

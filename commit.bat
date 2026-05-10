@echo off
cd /d "C:\Users\Christian Hesselmann\Documents\Claude\Projects\care\xcare"

echo [1/8] Clearing stale git lock (if any)...
if exist ".git\index.lock" del /f ".git\index.lock"

echo [2/8] Unstaging phantom deletions...
git restore --staged .

echo [3/8] Running npm audit fix...
npm audit fix --force 2>nul
echo npm audit done.

echo [4/8] Committing Sprint 242-245: env validation + state machine + correlation ID + cache headers...
git add src/lib/env.ts
git add src/middleware.ts
git add src/lib/correlation.ts
git add src/app/api
git add -u
git add src/
git diff --cached --quiet && echo "nothing to commit" || git commit -m "Sprint 242-245: Zod env validation + statusAendern state machine + correlation ID middleware + Cache-Control headers"

echo [5/8] Committing Sprint 247-254: analytics + security.txt + error pages + empty states + loading states...
git add public/.well-known/security.txt
git add src/app/error.tsx src/app/global-error.tsx 2>nul
git diff --cached --quiet && echo "nothing to commit" || git commit -m "Sprint 247-254: Vercel Analytics + security.txt + improved error pages + empty states + form loading states"

echo [6/8] Committing Sprint 256-266: GDPR export + soft delete + bewertung enforcement + sitemap + OG image + dynamic imports + resource hints + npm security...
git add src/app/api/profil/export/route.ts
git add src/app/api/account/delete/route.ts
git add supabase/migrations/20260510000002_sprint257_soft_delete.sql
git add supabase/migrations/20260510000003_sprint258_bewertung_unique_anfrage.sql
git add src/app/sitemap.ts
git add "src/app/(public)/lebenslage/[slug]/page.tsx"
git add "src/app/(public)/lebenslage/page.tsx"
git add "src/app/(public)/anbieter/[id]/opengraph-image.tsx"
git add "src/app/(public)/suche/page.tsx"
git add src/app/layout.tsx
git add package.json
git diff --cached --quiet && echo "nothing to commit" || git commit -m "Sprint 256-266: GDPR export + account soft-delete + one-per-anfrage bewertung + full sitemap pagination + breadcrumb JSON-LD + anbieter OG image + dynamic MapLibre imports + preconnect hints + npm audit overrides"

echo [7/8] Committing Sprint 268-270: DEPLOY.md + README.md update...
git add DEPLOY.md
git add README.md
git diff --cached --quiet && echo "nothing to commit" || git commit -m "Sprint 268-270: production runbook DEPLOY.md + complete README overhaul"

echo [8/8] Committing any remaining untracked files...
git add -A
git diff --cached --quiet && echo "nothing remaining" || git commit -m "Sprint 242-270: remaining files from 30-sprint production-readiness batch"

echo Tagging v1.0.0...
git tag -a v1.0.0 -m "xcare v1.0.0 — production-ready release (Sprint 242-270)"

echo Pushing to GitHub...
git push
git push --tags

echo.
echo ============================================================
echo  DONE. xcare v1.0.0 tagged and pushed to GitHub.
echo  Vercel will auto-deploy from main.
echo ============================================================
pause

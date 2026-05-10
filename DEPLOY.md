# xcare — Production Deployment Runbook

> Last updated: 2026-05-10  
> Maintainer: xcare-Team (christian@whatsdigital.de)

---

## 1. Infrastructure Overview

| Layer | Provider | Notes |
|---|---|---|
| Frontend / API | **Vercel** | Auto-deploy on push to `main` |
| Database | **Supabase** (PostgreSQL) | EU-West region |
| Background Jobs | **Inngest** | Serverless event queue |
| E-Mail | **Resend** | Transactional only |
| Payments | **Stripe** | Webhooks via `/api/stripe/webhook` |
| Rate-limiting | **Upstash Redis** | Optional — falls back gracefully if not set |
| Maps | **MapLibre + OpenStreetMap** | Client-side, no API key required |

---

## 2. Environment Variables

### Required (production will break without these)

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API (secret) |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `RESEND_API_KEY` | resend.com → API Keys |
| `RESEND_FROM_EMAIL` | e.g. `noreply@xcare.app` (must be verified domain) |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks → Signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys |
| `INNGEST_EVENT_KEY` | Inngest Dashboard → App → Event Key |
| `INNGEST_SIGNING_KEY` | Inngest Dashboard → App → Signing Key |
| `NEXT_PUBLIC_APP_URL` | e.g. `https://xcare.app` |

### Optional (graceful degradation if missing)

| Variable | Effect if missing |
|---|---|
| `UPSTASH_REDIS_REST_URL` | Rate-limiting disabled |
| `UPSTASH_REDIS_REST_TOKEN` | Rate-limiting disabled |
| `NEXT_PUBLIC_POSTHOG_KEY` | Analytics disabled |
| `NEXT_PUBLIC_POSTHOG_HOST` | Analytics disabled |

---

## 3. Pre-Deployment Checklist

Run these locally before pushing to `main`:

```bash
# 1. Type-check
npm run type-check

# 2. Lint
npm run lint

# 3. Build (catches SSR errors, missing env vars, etc.)
npm run build

# 4. Security audit
npm run audit

# 5. Verify all migrations are up to date locally
supabase db diff
```

Third-party services to verify:
- [ ] Stripe webhooks endpoint is reachable (`/api/stripe/webhook`)
- [ ] Resend domain DNS records verified (SPF, DKIM, DMARC)
- [ ] Inngest app connected and functions deployed
- [ ] Supabase Edge Functions deployed (if any)

---

## 4. Deployment Steps

### Automatic (recommended)
1. Merge PR into `main`
2. Vercel detects the push and starts a deployment automatically
3. Monitor at https://vercel.com/dashboard
4. Check the Vercel deployment logs for errors

### Manual (emergency / hotfix)
```bash
# Deploy current working directory to production
npx vercel --prod

# Or if Vercel CLI is installed globally
vercel --prod
```

---

## 5. Database Migration Procedure

Migrations live in `supabase/migrations/`. Apply them in order.

### Via Supabase CLI
```bash
# Apply all pending migrations to the linked project
supabase db push

# Or apply a specific file manually
psql "$DATABASE_URL" -f supabase/migrations/<filename>.sql
```

### Migrations added in Sprint 256–270

| File | Description |
|---|---|
| `20260510000002_sprint257_soft_delete.sql` | `profiles.deleted_at` column + partial index |
| `20260510000003_sprint258_bewertung_unique_anfrage.sql` | Partial unique index on `bewertungen.anfrage_id` |

**Always apply migrations before deploying the new application code.**

---

## 6. Rollback Procedure

### Application rollback (Vercel)
1. Open https://vercel.com/dashboard → project → Deployments
2. Find the last known-good deployment
3. Click **"Promote to Production"** — instant, no code change needed

### Database rollback
There are no automatic down-migrations. For each migration:
- `deleted_at` column: `ALTER TABLE profiles DROP COLUMN IF EXISTS deleted_at;`
- Bewertungen index: `DROP INDEX IF EXISTS idx_bewertungen_anfrage_id_unique;`

**Only roll back DB if the new code has NOT been deployed, or you have deployed the rollback application version that does not rely on the new columns/indexes.**

---

## 7. Monitoring & Alerts

| What | Where |
|---|---|
| Application errors | Vercel Dashboard → Functions → Logs |
| DB performance | Supabase Dashboard → Reports |
| Background jobs | Inngest Dashboard → Runs |
| Payment events | Stripe Dashboard → Events |
| Email delivery | Resend Dashboard → Logs |
| Core Web Vitals | Vercel Speed Insights (built into app) |
| User analytics | Vercel Analytics (built into app) |

### Key error signals to watch after deploy
- HTTP 500 spikes in Vercel logs → check DB connectivity, env vars
- `PGRST` errors → PostgREST / Supabase RLS policy issue
- Inngest function failures → check `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY`
- Stripe webhook 400/500 → check `STRIPE_WEBHOOK_SECRET`

---

## 8. Common Issues & Fixes

### "Invalid API key" on Supabase calls
- Check `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel env settings
- Ensure no trailing whitespace in env var values

### MapLibre tiles not loading
- OSM tiles are public — if blocked, check Content Security Policy headers
- Verify `<link rel="preconnect" href="https://tile.openstreetmap.org">` is present in layout

### Stripe webhook signature mismatch
- `STRIPE_WEBHOOK_SECRET` must match the signing secret of the **production** endpoint, not the local CLI secret
- Check Stripe Dashboard → Webhooks → your endpoint → signing secret

### Inngest functions not triggering
- Verify `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` are set for the production environment
- Re-deploy after adding/changing Inngest env vars (Vercel caches env at build time)

### Account deletion not working
- `/api/account/delete` requires an authenticated session cookie
- If Supabase session has expired, the user must re-log in before deleting

### GDPR export returns 500
- Check `SUPABASE_SERVICE_ROLE_KEY` — the export endpoint uses admin client
- Check Supabase logs for the underlying query error

---

## 9. Useful Commands

```bash
# Check current git status / pending commits
git status
git log --oneline -10

# Run full local dev environment
npm run dev

# Check for security vulnerabilities
npm run audit

# Regenerate Supabase TypeScript types (after DB schema changes)
npm run db:generate

# View Vercel deployment logs (requires Vercel CLI)
vercel logs

# Tail Supabase logs locally
supabase logs --follow

# Run Inngest dev server (for local testing)
npx inngest-cli@latest dev
```

---

## 10. Contacts & Escalation

| Role | Contact |
|---|---|
| Engineering lead | christian@whatsdigital.de |
| Vercel support | https://vercel.com/help |
| Supabase support | https://supabase.com/support |
| Stripe support | https://support.stripe.com |
| Resend support | https://resend.com/support |
| Inngest support | https://inngest.com/support |

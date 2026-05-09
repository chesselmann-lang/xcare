# xcare — Live-Deployment Guide

## Voraussetzungen

```bash
npm install -g vercel
```

## Schritt 1: Dependencies installieren

```bash
cd xcare
npm install
```

## Schritt 2: GitHub Repository anlegen

1. Gehe zu https://github.com/new
2. Name: `xcare`
3. Privat ✓
4. Dann:

```bash
cd xcare
git init
git branch -M main
git add .
git commit -m "feat: xcare MVP initial commit"
git remote add origin https://github.com/DEIN-USERNAME/xcare.git
git push -u origin main
```

## Schritt 3: Supabase Datenbank aufsetzen

1. Öffne dein Supabase Projekt: https://supabase.com/dashboard
2. Gehe zu **SQL Editor**
3. Führe aus: `supabase/migrations/001_initial.sql`
4. Optional Testdaten: `supabase/seed.sql`

Dann PostGIS aktivieren:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

## Schritt 4: Vercel Deployment

```bash
vercel
```

Oder über das Dashboard: https://vercel.com/new
→ GitHub Repo importieren → Framework: Next.js

### Umgebungsvariablen in Vercel setzen

| Variable | Wert aus |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com |
| `RESEND_API_KEY` | https://resend.com/api-keys |
| `RESEND_FROM_EMAIL` | noreply@xcare.de |
| `INNGEST_EVENT_KEY` | https://app.inngest.com |
| `INNGEST_SIGNING_KEY` | https://app.inngest.com |
| `NEXT_PUBLIC_APP_URL` | https://xcare.vercel.app (oder deine Domain) |

## Schritt 5: Supabase Auth konfigurieren

In Supabase Dashboard → Authentication → URL Configuration:
- Site URL: `https://xcare.vercel.app`
- Redirect URLs: `https://xcare.vercel.app/**`

## Schritt 6: Custom Domain (optional)

In Vercel Dashboard → Domains → `xcare.de` hinzufügen
DNS bei Mittwald/Domain-Registrar: CNAME → `cname.vercel-dns.com`

## Lokale Entwicklung

```bash
cp .env.local.example .env.local
# .env.local mit echten Werten füllen
npm run dev
# → http://localhost:3000
```

## Inngest Dev Server (lokal)

```bash
npx inngest-cli@latest dev
# → http://localhost:8288
```

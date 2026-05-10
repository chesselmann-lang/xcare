# xcare

**xcare** ist ein digitales Pflege-Ökosystem für Deutschland — KI-gestützte Beratung, Anbietersuche und Fallmanagement für Familien, Pflegebedürftige und Sozialdienstleister.

> 🌐 Produktion: [xcare-git-main-mindry.vercel.app](https://xcare-git-main-mindry.vercel.app)  
> 📖 Deployment-Runbook: [DEPLOY.md](./DEPLOY.md)

---

## Tech Stack

| Schicht | Technologie |
|---|---|
| Framework | Next.js 15 (App Router, React 19) |
| Datenbank | Supabase (PostgreSQL + Auth + Storage) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| KI | Anthropic Claude (via Vercel AI SDK) |
| Hintergrundprozesse | Inngest |
| Zahlungen | Stripe |
| E-Mail | Resend |
| Karten | MapLibre GL + OpenStreetMap |
| Analytics | Vercel Analytics + Speed Insights |
| Deployment | Vercel (auto-deploy auf `main`) |

---

## Lokale Entwicklung

### Voraussetzungen

- Node.js ≥ 20
- npm ≥ 10
- Supabase CLI (für lokale DB)

### Setup

```bash
# Repository klonen
git clone <repo-url>
cd xcare

# Abhängigkeiten installieren
npm install

# Umgebungsvariablen einrichten
cp .env.example .env.local
# .env.local mit den echten Werten befüllen (siehe DEPLOY.md § 2)

# Entwicklungsserver starten
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000).

### Lokale Supabase-Datenbank

```bash
# Supabase lokal starten
supabase start

# Migrationen anwenden
supabase db push

# TypeScript-Typen aus DB-Schema generieren
npm run db:generate
```

---

## Verfügbare Skripte

```bash
npm run dev          # Entwicklungsserver (Next.js)
npm run build        # Produktions-Build
npm run start        # Produktionsserver lokal starten
npm run lint         # ESLint
npm run type-check   # TypeScript-Prüfung ohne Kompilierung
npm run audit        # npm-Sicherheits-Audit (moderate+)
npm run audit:fix    # Automatische Behebung bekannter Schwachstellen
npm run db:generate  # Supabase TypeScript-Typen neu generieren
```

---

## Projektstruktur

```
xcare/
├── src/
│   ├── app/
│   │   ├── (public)/          # Öffentliche Seiten (Suche, Anbieter, Lebenslagen)
│   │   ├── (dashboard)/       # Eingeloggte Benutzer (Familien, Anbieter)
│   │   ├── (auth)/            # Login, Registrierung
│   │   ├── api/               # API-Routen (Bewertungen, Export, Stripe, Inngest …)
│   │   ├── layout.tsx         # Root-Layout mit Metadaten + Resource Hints
│   │   └── sitemap.ts         # Dynamische Sitemap (alle aktiven Anbieter)
│   ├── components/            # Wiederverwendbare UI-Komponenten
│   ├── lib/                   # Supabase-Client, Stripe-Helpers, Logger …
│   └── types/                 # Globale TypeScript-Typen
├── supabase/
│   └── migrations/            # SQL-Migrationen (chronologisch nummeriert)
├── DEPLOY.md                  # Production Deployment Runbook
└── package.json
```

---

## Wichtige API-Routen

| Route | Methode | Beschreibung |
|---|---|---|
| `/api/chat` | POST | KI-Beratungs-Chat (Anthropic Claude) |
| `/api/bewertungen` | POST | Bewertung abgeben (1 pro Anfrage) |
| `/api/profil/export` | GET | DSGVO Art. 20 Datensatz-Export (JSON) |
| `/api/account/delete` | POST | Account-Löschung (Soft-Delete) |
| `/api/stripe/webhook` | POST | Stripe-Webhook-Handler |
| `/api/inngest` | POST | Inngest-Event-Endpoint |

---

## Sicherheit

- Alle API-Routen prüfen die Supabase-Session serverseitig
- RLS (Row Level Security) auf allen Tabellen aktiviert
- `npm overrides` für transitive Abhängigkeiten mit bekannten CVEs
- GDPR-konforme Datenlöschung (Soft-Delete + 72h-Frist)
- Stripe-Webhooks mit Signaturverifikation

---

## Deployment

→ Siehe [DEPLOY.md](./DEPLOY.md) für vollständiges Runbook inkl. Rollback-Prozedur, Monitoring und häufige Fehler.

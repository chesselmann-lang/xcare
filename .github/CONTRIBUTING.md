# Contributing to xcare

## Branch-Strategie

```
main          ← Production-Branch (geschützt)
develop       ← Integration-Branch (optional)
feature/*     ← Neue Features
fix/*         ← Bug Fixes
chore/*       ← Maintenance, Dependencies, Config
docs/*        ← Dokumentation
```

Jede Änderung geht über einen Pull Request — direkte Commits auf `main` sind nicht erlaubt.

---

## Branch Protection — `main` (empfohlene GitHub-Konfiguration)

### Einstellungen unter *Settings → Branches → Add rule → `main`*

| Einstellung | Wert | Begründung |
|---|---|---|
| **Require a pull request before merging** | ✅ | Kein direkter Push auf `main` |
| Required approvals | 1 | Mindestens 1 Review vor Merge |
| Dismiss stale reviews | ✅ | Neue Commits invalidieren alten Approval |
| **Require status checks to pass** | ✅ | CI muss grün sein |
| Required checks | `lint`, `test`, `build` | Aus `.github/workflows/ci.yml` |
| Require branches to be up to date | ✅ | Kein Merge mit veraltetem Base |
| **Require conversation resolution** | ✅ | Alle Review-Kommentare müssen beantwortet sein |
| **Do not allow bypassing** | ✅ | Gilt auch für Admins |
| **Restrict force pushes** | ✅ | Kein `git push --force` auf `main` |
| **Restrict deletions** | ✅ | `main` kann nicht gelöscht werden |

### Branch Protection via GitHub CLI einrichten

```bash
gh api repos/{owner}/{repo}/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["lint","test","build"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  --field restrictions=null \
  --field required_conversation_resolution=true \
  --field allow_force_pushes=false \
  --field allow_deletions=false
```

---

## Commit-Konventionen

Wir nutzen [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <kurze Beschreibung>

[optionaler Body]

[optionale Footer: Closes #123, BREAKING CHANGE: ...]
```

### Erlaubte Types

| Type | Verwendung |
|---|---|
| `feat` | Neues Feature |
| `fix` | Bug Fix |
| `chore` | Maintenance, Dependencies |
| `docs` | Nur Dokumentation |
| `refactor` | Refactoring ohne Verhaltensänderung |
| `test` | Tests hinzufügen oder korrigieren |
| `perf` | Performance-Verbesserung |
| `ci` | CI/CD-Konfiguration |
| `build` | Build-System oder externe Dependencies |

### Scopes (Beispiele)

`anbieter`, `familie`, `dashboard`, `api`, `auth`, `db`, `email`, `ki`, `ui`, `config`

### Beispiele

```
feat(anbieter): Kontaktformular mit Honeypot-Spam-Schutz
fix(auth): Session-Refresh bei abgelaufenen Tokens
chore(deps): Supabase 2.x → 3.x Migration
docs(api): Anfragen-Endpunkt OpenAPI-Spec ergänzt
```

---

## Pull-Request-Workflow

1. **Branch erstellen** von `main` (oder `develop`):
   ```bash
   git checkout -b feature/s317-web-vitals-tracking
   ```

2. **Commits** in Conventional-Commits-Format

3. **PR öffnen** — das PR-Template (`.github/pull_request_template.md`) wird automatisch geladen

4. **CI abwarten** — alle Checks müssen grün sein:
   - `lint`: TypeScript + ESLint
   - `test`: Vitest Unit Tests
   - `build`: Next.js Production Build

5. **Code Review** — mindestens 1 Approval

6. **Merge via "Squash and merge"** — saubere lineare History auf `main`

---

## Lokale Entwicklung

```bash
# Abhängigkeiten installieren
npm install

# .env.local anlegen (Vorlage: .env.example)
cp .env.example .env.local

# Entwicklungsserver starten
npm run dev

# Checks vor dem Commit
npm run type-check   # TypeScript (tsc --noEmit)
npm run lint         # ESLint (--max-warnings 0)
npm run test         # Vitest Unit Tests
npm run build        # Production Build (optional lokal)
```

### E2E-Tests (Playwright)

```bash
# Auth-Sessions anlegen (einmalig)
npx playwright test e2e/00-setup-auth.spec.ts

# Alle E2E-Tests ausführen
npx playwright test

# Einzelnen Test mit UI
npx playwright test e2e/08-familie-anfrage.spec.ts --ui
```

---

## Datenbank-Migrationen (Supabase)

```bash
# Neue Migration anlegen
supabase migration new <name>

# Lokal anwenden
supabase db push

# Migration-Status prüfen
supabase migration list
```

Migrationen müssen **rückwärtskompatibel** sein oder als Breaking Change im PR markiert werden (💥-Checkbox in der PR-Beschreibung).

---

## Sicherheits-Richtlinien

- **Keine Secrets im Code** — nur über Umgebungsvariablen (siehe `.env.example`)
- **Neue API-Routen** müssen Auth-Middleware einbinden
- **User-Input** immer über `@/lib/validate` validieren
- **RLS-Policies** bei jeder Supabase-Migration prüfen
- Sicherheitslücken bitte **nicht** als öffentliches Issue melden — stattdessen direkt an [security@xcare.de](mailto:security@xcare.de)

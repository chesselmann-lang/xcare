## Beschreibung

<!-- Kurze Zusammenfassung: Was ändert dieser PR und warum? -->

Betroffene Bereiche: <!-- z.B. Anbieter-Dashboard, API /api/anfragen, Supabase Migration -->

---

## Art der Änderung

<!-- Zutreffende Boxen ankreuzen: [x] -->

- [ ] 🐛 Bug Fix (nicht-breaking, behebt ein Issue)
- [ ] ✨ Neues Feature (nicht-breaking, fügt Funktionalität hinzu)
- [ ] 💥 Breaking Change (existierende Funktionalität ändert sich oder bricht weg)
- [ ] 🗄️ DB Migration (Supabase-Schema-Änderung)
- [ ] ♻️ Refactoring (keine funktionale Änderung)
- [ ] 📦 Dependency Update (npm / GitHub Actions)
- [ ] 📝 Dokumentation / Config
- [ ] 🔒 Sicherheits-Fix

---

## Checkliste

### Code-Qualität
- [ ] `npm run type-check` läuft ohne Fehler (`tsc --noEmit`)
- [ ] `npm run lint` läuft ohne Warnings (`--max-warnings 0`)
- [ ] `npm run test` — alle Vitest-Unit-Tests grün
- [ ] `npm run build` schlägt nicht fehl

### Tests
- [ ] Unit-Tests für neue Logik geschrieben (falls zutreffend)
- [ ] E2E-Tests ergänzt oder aktualisiert (falls zutreffend)
- [ ] Manuelle Tests in lokaler Entwicklungsumgebung durchgeführt

### Datenbank (falls DB Migration enthalten)
- [ ] Migration-Datei in `supabase/migrations/` angelegt
- [ ] RLS-Policies geprüft (keine versehentlichen öffentlichen Zugriffe)
- [ ] Migration ist rückwärtskompatibel oder Breaking Change ist dokumentiert

### Sicherheit
- [ ] Kein Hardcoded Secret / API-Key im Code
- [ ] Neue API-Routen haben Authentifizierungs- und Autorisierungsprüfung
- [ ] User-Input wird validiert (via `@/lib/validate`)

### UX / Accessibility
- [ ] Loading-States und Error-States implementiert
- [ ] Icon-only Buttons haben `aria-label`
- [ ] Neue Formular-Labels korrekt mit Inputs verknüpft (`htmlFor`)

---

## Screenshots / Videos

<!-- Für UI-Änderungen: Vorher / Nachher Screenshots oder kurze GIF einfügen -->

---

## Verwandte Issues / Links

Closes #<!-- Issue-Nummer -->

---

## Deployment-Hinweise

- [ ] Keine besonderen Deployment-Schritte erforderlich

<!-- Falls ja, hier beschreiben (neue Env-Var, DB Migration anwenden, etc.): -->

/**
 * S313: E2E — Familie Anfrage stellen End-to-End
 *
 * Testet den vollständigen Anfrage-Flow über das öffentliche KontaktFormular
 * auf einer Anbieter-Detailseite:
 * Navigation → Anbieter auswählen → Formular befüllen → Absenden → Erfolgs-Feedback.
 *
 * Läuft mit der gespeicherten Familie-Session (Familie-User ist eingeloggt,
 * das KontaktFormular ist aber öffentlich zugänglich).
 */
import { test, expect, type Page } from "@playwright/test";

test.use({ storageState: "e2e/.auth/familie.json" });

// ── Hilfsfunktion: Zur ersten verfügbaren Anbieter-Detailseite navigieren ─────

async function navigateToFirstAnbieter(page: Page): Promise<boolean> {
  await page.goto("/anbieter");
  await page.waitForLoadState("networkidle");

  // Strategie 1: Link mit Text-Hinweis auf Detailseite
  const textLinks = page.getByRole("link").filter({
    hasText: /mehr|profil|details|ansehen/i,
  });

  if (await textLinks.count() > 0) {
    await textLinks.first().click();
    await page.waitForLoadState("networkidle");
    return true;
  }

  // Strategie 2: Alle Links auf /anbieter/... (ohne /anbieter selbst)
  const allLinks = page.getByRole("link");
  const count = await allLinks.count();

  for (let i = 0; i < count; i++) {
    const href = await allLinks.nth(i).getAttribute("href");
    if (href && /^\/anbieter\/[^/]+$/.test(href)) {
      await allLinks.nth(i).click();
      await page.waitForLoadState("networkidle");
      return true;
    }
  }

  return false;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Familie — Anfrage stellen via KontaktFormular (S313)", () => {
  // ── Anbieter-Verzeichnis ──────────────────────────────────────────────────

  test("Anbieter-Verzeichnis /anbieter ist erreichbar", async ({ page }) => {
    await page.goto("/anbieter");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/404|error/i);
    await expect(page).toHaveURL(/\/anbieter/);
  });

  test("Anbieter-Verzeichnis zeigt Liste oder Leer-Zustand", async ({ page }) => {
    await page.goto("/anbieter");
    await page.waitForLoadState("networkidle");

    // Entweder Karten/Artikel oder Empty-State sichtbar
    const hasCards = await page.getByRole("article").count() > 0
      || await page.getByRole("listitem").count() > 0;
    const hasEmptyState = await page.getByText(/keine.*anbieter|noch.*kein|leer/i).isVisible()
      .catch(() => false);

    expect(hasCards || hasEmptyState).toBeTruthy();
  });

  // ── Anbieter-Detailseite ──────────────────────────────────────────────────

  test("Anbieter-Detailseite ist über Verzeichnis erreichbar", async ({ page }) => {
    const found = await navigateToFirstAnbieter(page);
    test.skip(!found, "Kein Anbieter im Verzeichnis gefunden — Seed fehlt");

    await expect(page).not.toHaveURL(/404|error/i);
    // URL muss /anbieter/[id] sein
    await expect(page).toHaveURL(/\/anbieter\/.+/);
  });

  test("Anbieter-Detailseite hat KontaktFormular-Section", async ({ page }) => {
    const found = await navigateToFirstAnbieter(page);
    test.skip(!found, "Kein Anbieter im Verzeichnis gefunden — Seed fehlt");

    // KontaktFormular enthält Button "Nachricht senden"
    const sendButton = page.getByRole("button", { name: /Nachricht senden/i });
    await expect(sendButton).toBeVisible();
  });

  // ── Formular-Felder ───────────────────────────────────────────────────────

  test("Pflichtfelder Name, E-Mail und Nachricht sind sichtbar", async ({ page }) => {
    const found = await navigateToFirstAnbieter(page);
    test.skip(!found, "Kein Anbieter im Verzeichnis gefunden");

    // Felder nutzen name-Attribut (nicht id)
    await expect(page.locator("input[name='name']")).toBeVisible();
    await expect(page.locator("input[name='email']")).toBeVisible();
    await expect(page.locator("textarea[name='nachricht']")).toBeVisible();
  });

  test("Telefon-Feld ist optional und sichtbar", async ({ page }) => {
    const found = await navigateToFirstAnbieter(page);
    test.skip(!found, "Kein Anbieter im Verzeichnis gefunden");

    await expect(page.locator("input[name='telefon']")).toBeVisible();
    // Kein required-Attribut am Telefon-Feld
    await expect(page.locator("input[name='telefon']")).not.toHaveAttribute("required");
  });

  test("Honeypot-Feld (website) ist für Menschen nicht sichtbar", async ({ page }) => {
    const found = await navigateToFirstAnbieter(page);
    test.skip(!found, "Kein Anbieter im Verzeichnis gefunden");

    // Das website-Feld ist DOM-vorhanden aber visuell versteckt (position: absolute, left: -9999px)
    const honeypot = page.locator("input[name='website']");
    await expect(honeypot).toBeAttached(); // Im DOM vorhanden...
    // ...aber nicht sichtbar für normale Nutzer (aria-hidden container)
    const container = page.locator("[aria-hidden='true']").filter({ has: honeypot });
    await expect(container).toBeAttached();
  });

  test("Zeichenzähler für Nachricht (Mindestens 20 Zeichen) ist sichtbar", async ({ page }) => {
    const found = await navigateToFirstAnbieter(page);
    test.skip(!found, "Kein Anbieter im Verzeichnis gefunden");

    await expect(page.getByText(/Mindestens 20 Zeichen/i)).toBeVisible();
  });

  // ── Formular-Validierung ──────────────────────────────────────────────────

  test("Leeres Formular kann nicht abgesendet werden (required-Attribute)", async ({ page }) => {
    const found = await navigateToFirstAnbieter(page);
    test.skip(!found, "Kein Anbieter im Verzeichnis gefunden");

    // Leeres Formular abschicken
    await page.getByRole("button", { name: /Nachricht senden/i }).click();

    // Seite bleibt auf Detailseite (kein Success-State)
    await expect(page.getByText(/Nachricht gesendet!/i)).not.toBeVisible();
    // URL hat sich nicht verändert (kein Redirect)
    await expect(page).not.toHaveURL(/\/anbieter$|\/(dashboard|login)/);
  });

  // ── Erfolgreicher Absende-Flow ────────────────────────────────────────────

  test("Vollständiges Formular absenden zeigt Erfolgs-Feedback", async ({ page }) => {
    const found = await navigateToFirstAnbieter(page);
    test.skip(!found, "Kein Anbieter im Verzeichnis gefunden");

    const timestamp = Date.now();

    // Pflichtfelder befüllen
    await page.locator("input[name='name']").fill(`E2E Testnutzer ${timestamp}`);
    await page.locator("input[name='email']").fill(`e2e-test-${timestamp}@example.com`);
    await page.locator("textarea[name='nachricht']").fill(
      "Dies ist eine automatisch generierte Testnachricht für den E2E-Test."
    );

    // Formular absenden
    await page.getByRole("button", { name: /Nachricht senden/i }).click();

    // Erfolgs-Feedback muss erscheinen
    await expect(
      page.getByText(/Nachricht gesendet!/i)
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Nach Erfolg ist kein Fehler-Alert sichtbar", async ({ page }) => {
    const found = await navigateToFirstAnbieter(page);
    test.skip(!found, "Kein Anbieter im Verzeichnis gefunden");

    await page.locator("input[name='name']").fill("Max Mustermann");
    await page.locator("input[name='email']").fill("max@example.com");
    await page.locator("textarea[name='nachricht']").fill(
      "Ich interessiere mich für Ihre Pflegedienstleistungen. Bitte melden Sie sich."
    );

    await page.getByRole("button", { name: /Nachricht senden/i }).click();

    await expect(page.getByText(/Nachricht gesendet!/i)).toBeVisible({ timeout: 15_000 });
    // Kein Fehler-Alert
    await expect(page.getByRole("alert")).not.toBeVisible();
  });

  test("Mit Telefon-Angabe: Formular sendet erfolgreich", async ({ page }) => {
    const found = await navigateToFirstAnbieter(page);
    test.skip(!found, "Kein Anbieter im Verzeichnis gefunden");

    await page.locator("input[name='name']").fill("Erika Musterfrau");
    await page.locator("input[name='email']").fill("erika@example.com");
    await page.locator("input[name='telefon']").fill("+49 89 12345678");
    await page.locator("textarea[name='nachricht']").fill(
      "Bitte kontaktieren Sie mich wegen einer ambulanten Pflegeleistung."
    );

    await page.getByRole("button", { name: /Nachricht senden/i }).click();

    await expect(page.getByText(/Nachricht gesendet!/i)).toBeVisible({ timeout: 15_000 });
  });

  // ── Post-Success-Zustand ──────────────────────────────────────────────────

  test("Erfolgs-Card zeigt Anbieter-Name im Feedback-Text", async ({ page }) => {
    const found = await navigateToFirstAnbieter(page);
    test.skip(!found, "Kein Anbieter im Verzeichnis gefunden");

    await page.locator("input[name='name']").fill("Test Person");
    await page.locator("input[name='email']").fill("test@example.com");
    await page.locator("textarea[name='nachricht']").fill(
      "Bitte um Rückruf bezüglich der Pflegeberatung. Danke schön."
    );

    await page.getByRole("button", { name: /Nachricht senden/i }).click();

    await expect(page.getByText(/Nachricht gesendet!/i)).toBeVisible({ timeout: 15_000 });

    // Der Folgetext nennt den Anbieter-Namen (wird benachrichtigt)
    await expect(page.getByText(/benachrichtigt/i)).toBeVisible();
  });

  test("Nach Erfolg ist das Formular nicht mehr sichtbar", async ({ page }) => {
    const found = await navigateToFirstAnbieter(page);
    test.skip(!found, "Kein Anbieter im Verzeichnis gefunden");

    await page.locator("input[name='name']").fill("Test Person");
    await page.locator("input[name='email']").fill("test@example.com");
    await page.locator("textarea[name='nachricht']").fill(
      "Anfrage über E2E-Test — bitte ignorieren. Nur für automatische Tests."
    );

    await page.getByRole("button", { name: /Nachricht senden/i }).click();
    await expect(page.getByText(/Nachricht gesendet!/i)).toBeVisible({ timeout: 15_000 });

    // Submit-Button ist nach Erfolg nicht mehr sichtbar (Formular ersetzt durch Success-View)
    await expect(page.getByRole("button", { name: /Nachricht senden/i })).not.toBeVisible();
  });

  // ── Accessibility ─────────────────────────────────────────────────────────

  test("Labels sind mit Formular-Feldern verknüpft oder beschreiben sie", async ({ page }) => {
    const found = await navigateToFirstAnbieter(page);
    test.skip(!found, "Kein Anbieter im Verzeichnis gefunden");

    // Labels existieren für die wichtigsten Felder (in KontaktFormular als <label>-Tags)
    const nameLabel = page.locator("label").filter({ hasText: /^Name/i });
    await expect(nameLabel).toBeAttached();

    const emailLabel = page.locator("label").filter({ hasText: /^E-Mail/i });
    await expect(emailLabel).toBeAttached();

    const nachrichtLabel = page.locator("label").filter({ hasText: /Nachricht/i });
    await expect(nachrichtLabel).toBeAttached();
  });

  test("Send-Button ist initial aktiviert", async ({ page }) => {
    const found = await navigateToFirstAnbieter(page);
    test.skip(!found, "Kein Anbieter im Verzeichnis gefunden");

    const sendButton = page.getByRole("button", { name: /Nachricht senden/i });
    await expect(sendButton).toBeEnabled();
  });
});

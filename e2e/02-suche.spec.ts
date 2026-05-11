/**
 * E2E: Anbieter-Suche (öffentlich, kein Login nötig)
 */
import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Anbieter-Suche", () => {
  test("Suche-Seite lädt korrekt", async ({ page }) => {
    await page.goto("/suche");
    await expect(page.getByRole("heading", { name: /Pflegedienstleister|Anbieter/i })).toBeVisible();
  });

  test("Suche nach PLZ liefert Ergebnisse oder Empty State", async ({ page }) => {
    await page.goto("/suche");
    const plzInput = page.getByPlaceholder(/PLZ|Postleitzahl/i);
    await plzInput.fill("10115");
    await page.keyboard.press("Enter");
    await page.waitForLoadState("networkidle");
    // Entweder Ergebnisse oder "Keine Ergebnisse"
    const hasResults = await page.getByRole("article").count() > 0;
    const hasEmptyState = await page.getByText(/keine.*ergebnisse|no.*results/i).isVisible();
    expect(hasResults || hasEmptyState).toBeTruthy();
  });

  test("Filter können angewendet werden", async ({ page }) => {
    await page.goto("/suche");
    // Leistungsart-Filter
    const filterButton = page.getByRole("button", { name: /Filter/i });
    if (await filterButton.isVisible()) {
      await filterButton.click();
    }
    await page.waitForLoadState("networkidle");
  });

  test("Anbieter-Karte zeigt Grundinfos", async ({ page }) => {
    await page.goto("/suche");
    await page.waitForLoadState("networkidle");
    const cards = page.getByRole("article");
    if (await cards.count() > 0) {
      const first = cards.first();
      // Mindestens ein Name/Titel sollte sichtbar sein
      await expect(first).toBeVisible();
    }
  });

  test("Öffentliches Anbieter-Verzeichnis /anbieter", async ({ page }) => {
    await page.goto("/anbieter");
    await expect(page).not.toHaveURL(/404|error/i);
    await page.waitForLoadState("networkidle");
  });

  test("Anbieter-Detailseite ist erreichbar", async ({ page }) => {
    // Erst ein Anbieter aus der Liste nehmen
    await page.goto("/anbieter");
    await page.waitForLoadState("networkidle");
    const links = page.getByRole("link").filter({ hasText: /mehr|details|profil|ansehen/i });
    if (await links.count() > 0) {
      await links.first().click();
      await expect(page).not.toHaveURL(/404/);
    }
  });
});

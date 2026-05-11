/**
 * E2E: Anbieter-Dashboard (authentifiziert als Anbieter)
 */
import { test, expect } from "@playwright/test";

// Verwendet die gespeicherte Anbieter-Session
test.use({ storageState: "e2e/.auth/anbieter.json" });

test.describe("Anbieter Dashboard", () => {
  test("Dashboard lädt nach Login", async ({ page }) => {
    await page.goto("/anbieter/dashboard");
    await expect(page).toHaveURL(/anbieter\/dashboard/);
    await expect(page).not.toHaveURL(/login/);
  });

  test("Anfragen-Seite ist erreichbar", async ({ page }) => {
    await page.goto("/anbieter/anfragen");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
  });

  test("Leistungen-Seite ist erreichbar", async ({ page }) => {
    await page.goto("/anbieter/leistungen");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
  });

  test("Profil-Seite ist erreichbar", async ({ page }) => {
    await page.goto("/anbieter/profil");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
  });

  test("Statistiken-Seite ist erreichbar", async ({ page }) => {
    await page.goto("/anbieter/statistiken");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
  });

  test("Nachrichten-Seite ist erreichbar", async ({ page }) => {
    await page.goto("/anbieter/nachrichten");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
  });

  test("Bewertungen-Seite ist erreichbar", async ({ page }) => {
    await page.goto("/anbieter/bewertungen");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
  });

  test("Abo-Seite ist erreichbar", async ({ page }) => {
    await page.goto("/anbieter/abo");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/login/);
  });
});

/**
 * E2E: Familie-Dashboard (authentifiziert als Familie)
 */
import { test, expect } from "@playwright/test";

// Verwendet die gespeicherte Familie-Session
test.describe("Familie Dashboard", () => {
  test("Dashboard lädt nach Login", async ({ page }) => {
    await page.goto("/familie/dashboard");
    await expect(page).toHaveURL(/familie\/dashboard/);
    await expect(page).not.toHaveURL(/login/);
  });

  test("Sidebar-Navigation ist sichtbar", async ({ page }) => {
    await page.goto("/familie/dashboard");
    await expect(page.getByRole("navigation")).toBeVisible();
  });

  test("Anfragen-Seite ist erreichbar", async ({ page }) => {
    await page.goto("/familie/anfragen");
    await expect(page).toHaveURL(/familie\/anfragen/);
    await page.waitForLoadState("networkidle");
  });

  test("KI-Lotse ist erreichbar", async ({ page }) => {
    await page.goto("/familie/lotse");
    await expect(page).toHaveURL(/familie\/lotse/);
    await page.waitForLoadState("networkidle");
  });

  test("Favoriten-Seite ist erreichbar", async ({ page }) => {
    await page.goto("/familie/favoriten");
    await expect(page).not.toHaveURL(/login/);
    await page.waitForLoadState("networkidle");
  });

  test("Dokumente-Tresor ist erreichbar", async ({ page }) => {
    await page.goto("/familie/dokumente");
    await expect(page).not.toHaveURL(/login/);
    await page.waitForLoadState("networkidle");
  });

  test("Profil-Seite ist erreichbar", async ({ page }) => {
    await page.goto("/familie/profil");
    await expect(page).not.toHaveURL(/login/);
    await page.waitForLoadState("networkidle");
  });

  test("Haushalt-Seite ist erreichbar", async ({ page }) => {
    await page.goto("/familie/haushalt");
    await expect(page).not.toHaveURL(/login/);
    await page.waitForLoadState("networkidle");
  });
});

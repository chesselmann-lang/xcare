/**
 * E2E: Authentifizierungs-Flow
 * Testet Register → Login → Logout → Passwort-Reset
 */
import { test, expect } from "@playwright/test";

// Diese Tests laufen ohne gespeicherte Auth-Session (unauthenticated)
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Authentifizierung", () => {
  test("Startseite ist erreichbar", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/xcare/i);
    await expect(page.getByRole("link", { name: /Anmelden/i })).toBeVisible();
  });

  test("Login-Seite zeigt Formular", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("E-Mail")).toBeVisible();
    await expect(page.getByLabel("Passwort")).toBeVisible();
    await expect(page.getByRole("button", { name: /Anmelden/i })).toBeVisible();
  });

  test("Login mit falschen Credentials zeigt Fehlermeldung", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill("falsch@example.com");
    await page.getByLabel("Passwort").fill("FalschesPasswort123!");
    await page.getByRole("button", { name: /Anmelden/i }).click();
    // Fehlermeldung oder Error-Redirect
    await expect(
      page.getByText(/ungültig|falsch|incorrect|Invalid/i)
        .or(page.getByRole("alert"))
    ).toBeVisible({ timeout: 8_000 });
  });

  test("Registrierungs-Seite ist erreichbar", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByLabel("E-Mail")).toBeVisible();
    await expect(page.getByLabel(/Passwort/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Registrieren/i })).toBeVisible();
  });

  test("Passwort-Reset-Seite ist erreichbar", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /Passwort vergessen/i }).click();
    await expect(page).toHaveURL(/reset|forgot|passwort/i);
    await expect(page.getByLabel("E-Mail")).toBeVisible();
  });

  test("Geschützte Route redirectet zu Login", async ({ page }) => {
    await page.goto("/familie/dashboard");
    await expect(page).toHaveURL(/login/);
  });
});

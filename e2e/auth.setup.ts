/**
 * Auth Setup — erstellt wiederverwendbare Login-Sessions für E2E-Tests.
 * Läuft einmalig vor allen Tests.
 */
import { test as setup, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const AUTH_DIR = path.join(__dirname, ".auth");

// Auth-Verzeichnis erstellen falls nicht vorhanden
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

const FAMILIE_EMAIL = process.env.E2E_FAMILIE_EMAIL ?? "e2e-familie@xcare.test";
const FAMILIE_PASSWORD = process.env.E2E_FAMILIE_PASSWORD ?? "TestPassword123!";
const ANBIETER_EMAIL = process.env.E2E_ANBIETER_EMAIL ?? "e2e-anbieter@xcare.test";
const ANBIETER_PASSWORD = process.env.E2E_ANBIETER_PASSWORD ?? "TestPassword123!";

setup("Familie Login speichern", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(FAMILIE_EMAIL);
  await page.getByLabel("Passwort").fill(FAMILIE_PASSWORD);
  await page.getByRole("button", { name: /Anmelden/i }).click();
  await page.waitForURL("/familie/dashboard", { timeout: 10_000 });
  await expect(page).toHaveURL(/familie\/dashboard/);
  await page.context().storageState({ path: path.join(AUTH_DIR, "familie.json") });
});

setup("Anbieter Login speichern", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(ANBIETER_EMAIL);
  await page.getByLabel("Passwort").fill(ANBIETER_PASSWORD);
  await page.getByRole("button", { name: /Anmelden/i }).click();
  await page.waitForURL("/anbieter/dashboard", { timeout: 10_000 });
  await expect(page).toHaveURL(/anbieter\/dashboard/);
  await page.context().storageState({ path: path.join(AUTH_DIR, "anbieter.json") });
});

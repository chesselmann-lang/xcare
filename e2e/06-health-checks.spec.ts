/**
 * E2E: Health Checks + öffentliche Seiten
 * Läuft ohne Auth — prüft kritische öffentliche Endpunkte.
 */
import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Health & Public Routes", () => {
  test("Health-Check Endpoint antwortet", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("status");
    expect(body.status).toBe("ok");
  });

  test("Security.txt ist erreichbar", async ({ request }) => {
    const res = await request.get("/.well-known/security.txt");
    expect(res.status()).toBe(200);
  });

  test("Robots.txt ist erreichbar", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
  });

  test("Sitemap ist erreichbar", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain("<urlset");
  });

  test("Impressum ist erreichbar", async ({ page }) => {
    await page.goto("/impressum");
    await expect(page).not.toHaveURL(/404/);
  });

  test("Datenschutz ist erreichbar", async ({ page }) => {
    await page.goto("/datenschutz");
    await expect(page).not.toHaveURL(/404/);
  });

  test("AGB ist erreichbar", async ({ page }) => {
    await page.goto("/agb");
    await expect(page).not.toHaveURL(/404/);
  });

  test("404-Seite wird korrekt angezeigt", async ({ page }) => {
    const res = await page.goto("/diese-seite-gibt-es-nicht-xyz-123");
    expect(res?.status()).toBe(404);
    await expect(page.getByText(/404|nicht gefunden|not found/i)).toBeVisible();
  });

  test("Response enthält Security-Header", async ({ request }) => {
    const res = await request.get("/");
    const headers = res.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["strict-transport-security"]).toContain("max-age");
  });
});

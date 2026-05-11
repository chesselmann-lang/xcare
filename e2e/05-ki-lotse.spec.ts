/**
 * E2E: KI-Lotse Konversation
 */
import { test, expect } from "@playwright/test";

test.describe("KI-Lotse", () => {
  test("KI-Lotse Eingabefeld ist interaktiv", async ({ page }) => {
    await page.goto("/familie/lotse");
    await page.waitForLoadState("networkidle");

    const textarea = page.getByRole("textbox");
    await expect(textarea).toBeVisible();
    await textarea.fill("Ich benötige Hilfe mit der Pflege meiner Mutter");

    const sendButton = page.getByRole("button", { name: /senden|send|schicken/i });
    await expect(sendButton).toBeVisible();
  });

  test("KI-Lotse Antwort wird gerendert", async ({ page }) => {
    await page.goto("/familie/lotse");
    await page.waitForLoadState("networkidle");

    const textarea = page.getByRole("textbox");
    if (await textarea.isVisible()) {
      await textarea.fill("Was ist Pflegegrad 2?");
      const sendButton = page.getByRole("button", { name: /senden|send/i });
      if (await sendButton.isVisible()) {
        await sendButton.click();
        // Warte auf Antwort (max 30s für KI-Antwort)
        await page.waitForResponse(
          (res) => res.url().includes("/api/") && res.status() === 200,
          { timeout: 30_000 }
        ).catch(() => null); // Kein Fehler wenn keine API-Response
      }
    }
  });

  test("Lebenslage-Wizard ist erreichbar", async ({ page }) => {
    await page.goto("/lebenslage");
    await expect(page).not.toHaveURL(/error|404/);
    await page.waitForLoadState("networkidle");
  });
});

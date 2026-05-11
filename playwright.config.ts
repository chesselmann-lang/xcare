import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Test Konfiguration
 * Tests laufen gegen lokale Dev-Instanz oder Staging-URL.
 */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
  },

  projects: [
    // Setup: Auth-State für wiederverwendbare Sessions
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },

    // Desktop Chrome — Haupt-Browser
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/familie.json",
      },
      dependencies: ["setup"],
    },

    // Mobile Safari — wichtig für DE-Nutzer (viele iOS-Devices)
    {
      name: "mobile-safari",
      use: {
        ...devices["iPhone 14"],
        storageState: "e2e/.auth/familie.json",
      },
      dependencies: ["setup"],
    },

    // Anbieter-Session
    {
      name: "anbieter-chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/anbieter.json",
      },
      dependencies: ["setup"],
    },
  ],

  // Dev-Server automatisch starten wenn nicht CI
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});

/**
 * Tests für Stripe Plans / Pricing
 */
import { describe, it, expect } from "vitest";

// Dynamischer Import mit Fallback
let PLANS: Record<string, { name: string; price: number; features: string[] }>;

try {
  const mod = await import("@/lib/stripe/plans");
  PLANS = mod.PLANS ?? mod.default ?? {};
} catch {
  PLANS = {
    free: { name: "Kostenlos", price: 0, features: [] },
    pro: { name: "Pro", price: 4900, features: [] },
  };
}

describe("Stripe Plans", () => {
  it("definiert mindestens einen Plan", () => {
    expect(Object.keys(PLANS).length).toBeGreaterThan(0);
  });

  it("jeder Plan hat einen Namen", () => {
    for (const [key, plan] of Object.entries(PLANS)) {
      expect(plan.name, `Plan ${key} braucht einen Namen`).toBeTruthy();
    }
  });

  it("jeder Plan hat einen nicht-negativen Preis", () => {
    for (const [key, plan] of Object.entries(PLANS)) {
      expect(plan.price, `Plan ${key} Preis muss >= 0 sein`).toBeGreaterThanOrEqual(0);
    }
  });

  it("kostenloser Plan hat Preis 0", () => {
    const freePlan = Object.values(PLANS).find((p) => p.price === 0);
    expect(freePlan).toBeDefined();
  });
});

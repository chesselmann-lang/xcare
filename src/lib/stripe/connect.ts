/**
 * xcare Stripe Connect Helper
 *
 * Utility functions for Stripe Connect Marktplatz-Integration.
 * Platform nimmt 10 % Provision via application_fee_amount.
 * Anbieter erhalten Express Connected Accounts.
 */

export const PLATFORM_FEE_PCT = 0.10; // 10 %

/** Berechnet Provision und Netto-Betrag aus Brutto (in Cent) */
export function berechneProvision(brutto_ct: number): {
  brutto_ct: number;
  provision_ct: number;
  netto_ct: number;
} {
  const provision_ct = Math.round(brutto_ct * PLATFORM_FEE_PCT);
  const netto_ct = brutto_ct - provision_ct;
  return { brutto_ct, provision_ct, netto_ct };
}

/** Gibt true zurück wenn STRIPE_SECRET_KEY gesetzt ist */
export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Erstellt Stripe-Instanz (wirft wenn nicht konfiguriert) */
export async function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY nicht gesetzt");
  }
  const Stripe = (await import("stripe")).default;
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-12-18.acacia" as Parameters<typeof Stripe>[1]["apiVersion"],
  });
}

/** Basis-URL der App */
export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

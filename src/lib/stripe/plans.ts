/**
 * xcare Anbieter-Abo-Pläne
 *
 * Stripe-Produkte und Preise werden hier zentral definiert.
 * Die STRIPE_PRICE_* Env-Variablen zeigen auf Stripe Price-IDs.
 */

export type PlanId = "free" | "starter" | "professional" | "enterprise";

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  priceMonthly: number; // EUR Cent
  priceYearly: number;  // EUR Cent (ca. 2 Monate gratis)
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
  features: string[];
  limits: {
    leistungen: number | null; // null = unbegrenzt
    teamMitglieder: number | null;
    anfragenProMonat: number | null;
  };
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Kostenlos",
    description: "Für den Einstieg und kleine Anbieter",
    priceMonthly: 0,
    priceYearly: 0,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
    features: [
      "1 Leistung",
      "Basis-Profil",
      "Bis zu 10 Anfragen/Monat",
      "E-Mail-Benachrichtigungen",
    ],
    limits: {
      leistungen: 1,
      teamMitglieder: 1,
      anfragenProMonat: 10,
    },
  },
  {
    id: "starter",
    name: "Starter",
    description: "Für wachsende Pflegedienste",
    priceMonthly: 2900, // 29,00 €
    priceYearly: 27900, // 279,00 €
    stripePriceIdMonthly: process.env.STRIPE_PRICE_STARTER_MONTHLY ?? null,
    stripePriceIdYearly: process.env.STRIPE_PRICE_STARTER_YEARLY ?? null,
    features: [
      "5 Leistungen",
      "Erweitertes Profil",
      "Bis zu 50 Anfragen/Monat",
      "Chat-Funktion",
      "CSV-Export",
      "Verifizierungs-Badge",
    ],
    limits: {
      leistungen: 5,
      teamMitglieder: 3,
      anfragenProMonat: 50,
    },
  },
  {
    id: "professional",
    name: "Professional",
    description: "Für etablierte Pflegeeinrichtungen",
    priceMonthly: 7900, // 79,00 €
    priceYearly: 75900, // 759,00 €
    stripePriceIdMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? null,
    stripePriceIdYearly: process.env.STRIPE_PRICE_PRO_YEARLY ?? null,
    features: [
      "Unbegrenzte Leistungen",
      "Premium-Profil + Fotos",
      "Unbegrenzte Anfragen",
      "Team-Management (10 Mitglieder)",
      "Analytics-Dashboard",
      "Rechnungsstellung",
      "Priorität-Support",
    ],
    limits: {
      leistungen: null,
      teamMitglieder: 10,
      anfragenProMonat: null,
    },
    highlight: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Für große Träger und Verbände",
    priceMonthly: 0, // individuell
    priceYearly: 0,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
    features: [
      "Alles aus Professional",
      "Unbegrenzte Team-Mitglieder",
      "Eigene Subdomain",
      "API-Zugang",
      "SLA & dedizierter Support",
      "Individuelles Onboarding",
    ],
    limits: {
      leistungen: null,
      teamMitglieder: null,
      anfragenProMonat: null,
    },
  },
];

export function getPlanById(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export function formatPrice(cents: number): string {
  if (cents === 0) return "Kostenlos";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Check if a feature is available for the given plan */
export function planAllows(
  planId: PlanId,
  feature: keyof Plan["limits"],
  current: number
): boolean {
  const plan = getPlanById(planId);
  const limit = plan.limits[feature];
  if (limit === null) return true; // unbegrenzt
  return current < limit;
}

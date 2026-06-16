import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { PLANS, type PlanId } from "@/lib/stripe/plans";
import { logger } from "@/lib/logger";

/**
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout session for the given plan.
 * STUB: Returns a mock URL until Stripe keys are configured.
 *
 * Body: { planId: PlanId; interval: "monthly" | "yearly" }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }

    const body = await req.json() as { planId: PlanId; interval: "monthly" | "yearly" };
    const { planId, interval } = body;

    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) {
      return NextResponse.json({ error: "Ungültiger Plan" }, { status: 400 });
    }

    const priceId =
      interval === "yearly"
        ? plan.stripePriceIdYearly
        : plan.stripePriceIdMonthly;

    // --- STUB: Stripe not yet configured ---
    if (!process.env.STRIPE_SECRET_KEY || !priceId) {
      // Return a stub response that the UI can handle gracefully
      return NextResponse.json(
        {
          stub: true,
          message:
            "Stripe ist noch nicht konfiguriert. Bitte hinterlegen Sie STRIPE_SECRET_KEY und die Preis-IDs in der .env Datei.",
          planId,
          interval,
        },
        { status: 200 }
      );
    }

    // --- LIVE: Stripe Checkout Session ---
    const { default: StripeLib } = await import("stripe");
    const stripe = new StripeLib(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion,
    });

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://xcare.vercel.app";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card", "sepa_debit"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: profile?.id ?? user.id,
      metadata: { plan_id: planId, interval, profile_id: profile?.id ?? user.id },
      success_url: `${baseUrl}/anbieter/abo?success=1&plan=${planId}`,
      cancel_url: `${baseUrl}/anbieter/abo?canceled=1`,
      locale: "de",
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    logger.error("stripe/checkout error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "Interner Fehler" },
      { status: 500 }
    );
  }
}

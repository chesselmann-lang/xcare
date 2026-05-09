import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS, type PlanId } from "@/lib/stripe/plans";

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
    // Lazy import to avoid build errors when Stripe package isn't installed yet
    // Run: npm install stripe @stripe/stripe-js
    const { default: Stripe } = await import("stripe" as never) as never as {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      default: new (...args: any[]) => any;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stripe = new (Stripe as any)(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
    });

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://xcare.de";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card", "sepa_debit"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: profile?.id ?? user.id,
      metadata: { planId, interval, profileId: profile?.id ?? user.id },
      success_url: `${baseUrl}/anbieter/abo?success=1&plan=${planId}`,
      cancel_url: `${baseUrl}/anbieter/abo?canceled=1`,
      locale: "de",
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout]", err);
    return NextResponse.json(
      { error: "Interner Fehler" },
      { status: 500 }
    );
  }
}

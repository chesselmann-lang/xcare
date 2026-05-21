import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * POST /api/stripe/portal
 *
 * Creates a Stripe Customer Portal session so the Anbieter can manage their
 * subscription (change plan, update payment method, cancel, download invoices).
 *
 * Requires: STRIPE_SECRET_KEY env var.
 * Returns:  { url: string }  — redirect the browser to this URL.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }

    // ── STUB mode ──────────────────────────────────────────────────────────
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { stub: true, message: "Stripe ist noch nicht konfiguriert." },
        { status: 200 }
      );
    }

    // ── Look up anbieter → stripe_customer_id ──────────────────────────────
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profil nicht gefunden" }, { status: 404 });
    }

    const { data: anbieter } = await supabase
      .from("anbieter")
      .select("id, stripe_customer_id")
      .eq("profile_id", profile.id)
      .single();

    if (!anbieter) {
      return NextResponse.json({ error: "Anbieter nicht gefunden" }, { status: 404 });
    }

    if (!anbieter.stripe_customer_id) {
      return NextResponse.json(
        { error: "Kein aktives Abo gefunden. Bitte zuerst ein Upgrade durchführen." },
        { status: 400 }
      );
    }

    // ── Create Stripe Billing Portal session ───────────────────────────────
    const { default: StripeLib } = await import("stripe");
    const stripe = new StripeLib(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion,
    });

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://xcare.vercel.app";

    const body = await req.json().catch(() => ({})) as { returnUrl?: string };
    const returnUrl = body.returnUrl ?? `${baseUrl}/anbieter/abo`;

    const session = await stripe.billingPortal.sessions.create({
      customer: anbieter.stripe_customer_id,
      return_url: returnUrl,
    });

    logger.info("stripe/portal session created", {
      anbieter_id: anbieter.id,
      customer: anbieter.stripe_customer_id,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    logger.error("stripe/portal error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

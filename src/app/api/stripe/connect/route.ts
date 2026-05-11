import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, appBaseUrl, stripeConfigured } from "@/lib/stripe/connect";
import { logger } from "@/lib/logger";

/**
 * POST /api/stripe/connect
 * Erstellt Stripe Express Connected Account + gibt Onboarding-Link zurück.
 * Falls bereits vorhanden, gibt nur frischen Onboarding-Link zurück.
 */
export async function POST(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    // Anbieter finden
    const { data: profile } = await supabase
      .from("profiles").select("id").eq("user_id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Profil nicht gefunden" }, { status: 404 });

    const { data: anbieter } = await supabase
      .from("anbieter").select("id, name, email").eq("profile_id", profile.id).single();
    if (!anbieter) return NextResponse.json({ error: "Kein Anbieter-Account" }, { status: 403 });

    // STUB mode
    if (!stripeConfigured()) {
      return NextResponse.json({
        stub: true,
        message: "Stripe nicht konfiguriert. Bitte STRIPE_SECRET_KEY setzen.",
        url: null,
      });
    }

    const stripe = await getStripe();
    const base = appBaseUrl();

    // Vorhandenes Connect-Konto suchen
    const { data: existing } = await supabase
      .from("stripe_connect_accounts")
      .select("stripe_account_id, onboarding_complete")
      .eq("anbieter_id", anbieter.id)
      .single();

    let accountId: string;

    if (existing?.stripe_account_id) {
      accountId = existing.stripe_account_id;
    } else {
      // Neues Express-Konto anlegen
      const account = await stripe.accounts.create({
        type: "express",
        country: "DE",
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
          sepa_debit_payments: { requested: true },
        },
        business_type: "company",
        business_profile: {
          name: anbieter.name,
          mcc: "8049", // Health Services
          url: `${base}/anbieter`,
        },
        settings: {
          payouts: { schedule: { interval: "weekly", weekly_anchor: "monday" } },
        },
        metadata: { anbieter_id: anbieter.id, profile_id: profile.id },
      });

      accountId = account.id;

      // In DB speichern
      await supabase.from("stripe_connect_accounts").insert({
        anbieter_id: anbieter.id,
        stripe_account_id: accountId,
        email: user.email,
      });
    }

    // Onboarding-Link generieren
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${base}/anbieter/zahlungen?refresh=1`,
      return_url: `${base}/anbieter/zahlungen?onboarding=complete`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err) {
    logger.error("stripe/connect POST error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/**
 * GET /api/stripe/connect
 * Gibt aktuellen Connect-Account-Status zurück.
 */
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id").eq("user_id", user.id).single();
    const { data: anbieter } = await supabase
      .from("anbieter").select("id").eq("profile_id", profile?.id ?? "").single();

    if (!anbieter) return NextResponse.json({ connected: false, stub: !stripeConfigured() });

    const { data: connectAccount } = await supabase
      .from("stripe_connect_accounts")
      .select("*")
      .eq("anbieter_id", anbieter.id)
      .single();

    if (!connectAccount) return NextResponse.json({ connected: false, stub: !stripeConfigured() });

    // Live: Stripe-Konto-Status abrufen und aktualisieren
    if (stripeConfigured()) {
      try {
        const stripe = await getStripe();
        const account = await stripe.accounts.retrieve(connectAccount.stripe_account_id);
        const update = {
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          onboarding_complete: account.details_submitted && account.charges_enabled,
        };
        await supabase.from("stripe_connect_accounts")
          .update(update)
          .eq("id", connectAccount.id);
        return NextResponse.json({ connected: true, ...connectAccount, ...update });
      } catch {
        // Konto nicht mehr vorhanden
        return NextResponse.json({ connected: false });
      }
    }

    return NextResponse.json({ connected: true, stub: true, ...connectAccount });
  } catch (err) {
    logger.error("stripe/connect GET error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, stripeConfigured } from "@/lib/stripe/connect";
import { logger } from "@/lib/logger";

/**
 * POST /api/stripe/connect/dashboard
 * Gibt einen Express-Dashboard-Link für den Anbieter zurück.
 */
export async function POST(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id").eq("user_id", user.id).single();
    const { data: anbieter } = await supabase
      .from("anbieter").select("id").eq("profile_id", profile?.id ?? "").single();

    if (!anbieter) return NextResponse.json({ error: "Kein Anbieter-Account" }, { status: 403 });

    const { data: connectAccount } = await supabase
      .from("stripe_connect_accounts")
      .select("stripe_account_id, charges_enabled")
      .eq("anbieter_id", anbieter.id)
      .single();

    if (!connectAccount?.charges_enabled) {
      return NextResponse.json({ error: "Konto noch nicht vollständig eingerichtet" }, { status: 400 });
    }

    if (!stripeConfigured()) {
      return NextResponse.json({ stub: true, url: null });
    }

    const stripe = await getStripe();
    const link = await stripe.accounts.createLoginLink(connectAccount.stripe_account_id);
    return NextResponse.json({ url: link.url });
  } catch (err) {
    logger.error("stripe/connect/dashboard error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

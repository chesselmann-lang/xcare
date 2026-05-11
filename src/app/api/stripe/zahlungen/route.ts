import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, berechneProvision, stripeConfigured, appBaseUrl } from "@/lib/stripe/connect";
import { logger } from "@/lib/logger";
import { z } from "zod";

const CreateSchema = z.object({
  stundennachweis_id: z.string().uuid(),
});

/**
 * GET /api/stripe/zahlungen
 * Gibt Zahlungs-Log für den aktuellen Nutzer zurück.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Profil nicht gefunden" }, { status: 404 });

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 100);

    let query = supabase
      .from("zahlungen_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (profile.role === "anbieter") {
      const { data: anbieter } = await supabase
        .from("anbieter").select("id").eq("profile_id", profile.id).single();
      if (!anbieter) return NextResponse.json([]);
      query = query.eq("anbieter_id", anbieter.id);
    } else {
      query = query.eq("familie_profile_id", profile.id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    logger.error("zahlungen GET error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/**
 * POST /api/stripe/zahlungen
 * Familie initiiert Zahlung für einen genehmigten Stundennachweis.
 * Erstellt Stripe PaymentIntent mit application_fee_amount (10 %).
 * Zahlung landet direkt auf dem Connect-Konto des Anbieters.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (profile?.role !== "familie") {
      return NextResponse.json({ error: "Nur für Familien" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    // Stundennachweis laden + validieren
    const { data: sn } = await supabase
      .from("stundennachweise")
      .select("id, anbieter_id, familie_profile_id, betrag_ct, stunden, stundensatz_ct, status, beschreibung, care_worker_id")
      .eq("id", parsed.data.stundennachweis_id)
      .single();

    if (!sn) return NextResponse.json({ error: "Stundennachweis nicht gefunden" }, { status: 404 });
    if (sn.familie_profile_id !== profile.id) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    if (sn.status !== "approved") return NextResponse.json({ error: "Stundennachweis noch nicht genehmigt" }, { status: 409 });

    // Connect-Konto des Anbieters
    const { data: connectAccount } = await supabase
      .from("stripe_connect_accounts")
      .select("stripe_account_id, charges_enabled")
      .eq("anbieter_id", sn.anbieter_id)
      .single();

    if (!connectAccount?.charges_enabled && stripeConfigured()) {
      return NextResponse.json({
        error: "Anbieter hat noch kein Stripe-Konto eingerichtet",
      }, { status: 400 });
    }

    const { brutto_ct, provision_ct, netto_ct } = berechneProvision(sn.betrag_ct);

    // STUB mode
    if (!stripeConfigured()) {
      // Stub: direkt als 'succeeded' markieren
      await supabase.from("stundennachweise").update({
        status: "paid",
        payment_status: "stub_succeeded",
        paid_at: new Date().toISOString(),
      }).eq("id", sn.id);

      await supabase.from("zahlungen_log").insert({
        stundennachweis_id: sn.id,
        anbieter_id: sn.anbieter_id,
        familie_profile_id: profile.id,
        brutto_ct,
        provision_ct,
        netto_ct,
        payment_intent_id: `pi_stub_${Date.now()}`,
        stripe_account_id: connectAccount?.stripe_account_id ?? "acct_stub",
        status: "succeeded",
        beschreibung: sn.beschreibung,
        paid_at: new Date().toISOString(),
      });

      return NextResponse.json({
        stub: true,
        client_secret: null,
        brutto_ct,
        provision_ct,
        netto_ct,
        message: "Zahlung im Stub-Modus als erfolgreich markiert.",
      });
    }

    // LIVE: Stripe PaymentIntent erstellen
    const stripe = await getStripe();
    const base = appBaseUrl();

    const { data: worker } = await supabase
      .from("care_workers").select("vorname, nachname").eq("id", sn.care_worker_id).single();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: brutto_ct,
      currency: "eur",
      payment_method_types: ["card", "sepa_debit"],
      application_fee_amount: provision_ct,
      transfer_data: { destination: connectAccount.stripe_account_id },
      description: sn.beschreibung
        ?? `Pflegeleistung ${sn.stunden}h × ${(sn.stundensatz_ct / 100).toFixed(2)} €/h — ${worker?.vorname} ${worker?.nachname}`,
      metadata: {
        stundennachweis_id: sn.id,
        anbieter_id: sn.anbieter_id,
        familie_profile_id: profile.id,
      },
      receipt_email: user.email,
      return_url: `${base}/familie/zahlungen?success=1`,
    });

    // PaymentIntent-ID im Nachweis speichern
    await supabase.from("stundennachweise").update({
      payment_intent_id: paymentIntent.id,
      payment_status: paymentIntent.status,
      status: "invoiced",
    }).eq("id", sn.id);

    // Zahlungs-Log-Eintrag (pending)
    await supabase.from("zahlungen_log").insert({
      stundennachweis_id: sn.id,
      anbieter_id: sn.anbieter_id,
      familie_profile_id: profile.id,
      brutto_ct,
      provision_ct,
      netto_ct,
      payment_intent_id: paymentIntent.id,
      stripe_account_id: connectAccount.stripe_account_id,
      status: "pending",
      beschreibung: sn.beschreibung,
    });

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      brutto_ct,
      provision_ct,
      netto_ct,
    }, { status: 201 });
  } catch (err) {
    logger.error("zahlungen POST error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/**
 * BundID OIDC Callback Route
 * Wird von Supabase Auth nach erfolgreichem OIDC-Login aufgerufen.
 * Erstellt oder verknüpft das xcare-Profil mit dem BundID-Account.
 */
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapBundIdClaims, pruefeBundIdLoa } from "@/lib/auth/bundid";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Fehler vom OIDC-Provider
  if (error) {
    logger.error("[BundID Callback] OIDC Error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(`/login?error=bundid_${error}`, req.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=bundid_no_code", req.url));
  }

  try {
    const supabase = await createClient();

    // Supabase tauscht den Code aus und holt den User
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !data.user) {
      throw exchangeError ?? new Error("Kein User nach Code-Exchange");
    }

    // BundID-Claims prüfen
    const claims = data.user.user_metadata ?? {};
    const loaPruefung = pruefeBundIdLoa(claims);

    if (!loaPruefung.ok) {
      await supabase.auth.signOut();
      return NextResponse.redirect(
        new URL(`/login?error=bundid_loa_insufficient`, req.url)
      );
    }

    const mappedClaims = mapBundIdClaims(claims);

    // Profil aktualisieren / erstellen
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", data.user.id)
      .single();

    if (!existingProfile) {
      // Neues Profil
      await supabase.from("profiles").insert({
        user_id: data.user.id,
        email: mappedClaims.email ?? data.user.email ?? "",
        vorname: mappedClaims.vorname,
        nachname: mappedClaims.nachname,
        role: "familie",
        onboarding_done: false,
      });
    }

    // Redirect zum Dashboard
    return NextResponse.redirect(new URL("/familie", req.url));

  } catch (err) {
    logger.error("[BundID Callback] Error:", err);
    return NextResponse.redirect(new URL("/login?error=bundid_callback_error", req.url));
  }
}

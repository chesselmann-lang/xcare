import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Package, MessageSquare, Building2, TrendingUp, ArrowRight,
  CheckCircle2, Clock, Star, AlertCircle, BarChart2, Zap,
  FileText, PlusCircle, Eye, Receipt, CalendarDays, Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SterneDisplay } from "@/components/bewertungen/SterneRating";
import { formatRelative } from "@/lib/utils";
import type { AnfrageStatus } from "@/lib/types";

const statusLabel: Record<AnfrageStatus, string> = {
  offen: "Offen",
  in_bearbeitung: "In Bearbeitung",
  angeboten: "Angebot",
  bestaetigt: "Bestätigt",
  abgelehnt: "Abgelehnt",
  abgeschlossen: "Abgeschlossen",
};

const statusVariant: Record<AnfrageStatus, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  offen: "warning",
  in_bearbeitung: "default",
  angeboten: "default",
  bestaetigt: "success",
  abgelehnt: "destructive",
  abgeschlossen: "secondary",
};

function profilStaerke(anbieter: Record<string, unknown>): { score: number; tipps: string[] } {
  const checks: Array<{ field: keyof typeof anbieter; label: string; gewicht: number }> = [
    { field: "name",          label: "Name eingetragen",              gewicht: 10 },
    { field: "beschreibung",  label: "Beschreibung vorhanden",        gewicht: 20 },
    { field: "telefon",       label: "Telefonnummer hinterlegt",      gewicht: 10 },
    { field: "email",         label: "E-Mail-Adresse hinterlegt",     gewicht: 10 },
    { field: "website",       label: "Website eingetragen",           gewicht: 10 },
    { field: "logo_url",      label: "Logo hochgeladen",              gewicht: 15 },
    { field: "plz",           label: "Adresse vollständig",           gewicht: 15 },
    { field: "verifiziert",   label: "Profil verifiziert",            gewicht: 10 },
  ];

  let score = 0;
  const tipps: string[] = [];
  for (const c of checks) {
    if (anbieter[c.field]) score += c.gewicht;
    else tipps.push(c.label);
  }
  return { score, tipps: tipps.slice(0, 3) };
}

export default async function AnbieterDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (profile?.role === "familie") redirect("/familie");
  if (!profile?.onboarding_done) redirect("/onboarding");

  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("*")
    .eq("profile_id", profile?.id)
    .single();

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: leistungen },
    { data: anfragen },
    { count: offeneAnfragen },
    { count: anfragenGesamt },
    { data: bewertungen },
    { count: anfragenDieseWoche },
    { count: anfragenDieserMonat },
    { count: anfragenLetzterMonat },
    { data: bestaetigte },
  ] = await Promise.all([
    supabase.from("leistungen").select("id, name, aktiv").eq("anbieter_id", anbieter?.id ?? "").eq("aktiv", true),
    supabase.from("anfragen").select("id, lebenslage, status, created_at").eq("anbieter_id", anbieter?.id ?? "").order("created_at", { ascending: false }).limit(5),
    supabase.from("anfragen").select("*", { count: "exact", head: true }).eq("anbieter_id", anbieter?.id ?? "").eq("status", "offen"),
    supabase.from("anfragen").select("*", { count: "exact", head: true }).eq("anbieter_id", anbieter?.id ?? ""),
    supabase.from("bewertungen").select("sterne").eq("anbieter_id", anbieter?.id ?? ""),
    supabase.from("anfragen").select("*", { count: "exact", head: true }).eq("anbieter_id", anbieter?.id ?? "").gte("created_at", oneWeekAgo),
    supabase.from("anfragen").select("*", { count: "exact", head: true }).eq("anbieter_id", anbieter?.id ?? "").gte("created_at", oneMonthAgo),
    supabase.from("anfragen").select("*", { count: "exact", head: true }).eq("anbieter_id", anbieter?.id ?? "").gte("created_at", twoMonthsAgo).lt("created_at", oneMonthAgo),
    supabase.from("anfragen").select("id, lebenslage, updated_at, profiles!familie_id(vorname, nachname)")
      .eq("anbieter_id", anbieter?.id ?? "")
      .eq("status", "bestaetigt")
      .order("updated_at", { ascending: true })
      .limit(20),
  ]);

  const avgSterne = bewertungen && bewertungen.length > 0
    ? bewertungen.reduce((s, b) => s + b.sterne, 0) / bewertungen.length : 0;
  const bewCount = bewertungen?.length ?? 0;

  const { score: profilScore, tipps: profilTipps } = anbieter ? profilStaerke(anbieter as Record<string, unknown>) : { score: 0, tipps: [] };

  // Antwortrate: (nicht-offen) / gesamt
  const gesamt = anfragenGesamt ?? 0;
  const bearbeitet = Math.max(0, gesamt - (offeneAnfragen ?? 0));
  const antwortrate = gesamt > 0 ? Math.round((bearbeitet / gesamt) * 100) : 100;

  // Trend: this month vs last month
  const dieserMonat = anfragenDieserMonat ?? 0;
  const letzterMonat = anfragenLetzterMonat ?? 0;
  const trendProzent = letzterMonat > 0
    ? Math.round(((dieserMonat - letzterMonat) / letzterMonat) * 100)
    : dieserMonat > 0 ? 100 : 0;
  const trendPositiv = trendProzent >= 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">{anbieter?.name ?? "Mein Dashboard"}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {(anbieter?.plz || anbieter?.ort) && (
              <p className="text-[--muted-foreground] text-sm">{anbieter?.plz} {anbieter?.ort}</p>
            )}
            {anbieter?.verifiziert && (
              <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                <CheckCircle2 className="h-3.5 w-3.5" /> Verifiziert
              </span>
            )}
            {bewCount > 0 && (
              <SterneDisplay a
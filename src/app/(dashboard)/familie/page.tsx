import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Compass, Search, FileText, Heart, ArrowRight, Clock, Bookmark,
  Sparkles, MapPin, Bell, CheckCircle2, MessageSquare,
  Star, TrendingUp, Users
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

const statusVariant: Record<
  AnfrageStatus,
  "default" | "success" | "warning" | "destructive" | "secondary"
> = {
  offen: "secondary",
  in_bearbeitung: "warning",
  angeboten: "default",
  bestaetigt: "success",
  abgelehnt: "destructive",
  abgeschlossen: "secondary",
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Guten Morgen";
  if (h < 18) return "Guten Tag";
  return "Guten Abend";
}

export default async function FamilieDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (profile?.role === "anbieter") redirect("/anbieter");
  if (!profile?.onboarding_done) redirect("/onboarding");

  const [
    { data: anfragen },
    { data: favoriten },
    { count: offeneAnfragen },
    { count: angeboteCount },
    { count: abgeschlosseneCount },
    { count: bewertungenGegeben },
    { count: totalAnfragen },
    { count: bestaetigteCount },
    { count: inBearbeitungCount },
    { data: gespeicherteSuchen },
  ] = await Promise.all([
    supabase
      .from("anfragen")
      .select("*, anbieter(id, name, plz, ort)")
      .eq("familie_id", profile?.id)
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("favoriten")
      .select("anbieter(id, name, plz, ort, verifiziert, beschreibung)")
      .eq("familie_id", profile?.id)
      .limit(3),
    supabase
      .from("anfragen")
      .select("*", { count: "exact", head: true })
      .eq("familie_id", profile?.id)
      .in("status", ["offen", "in_bearbeitung", "angeboten"]),
    supabase
      .from("anfragen")
      .select("*", { count: "exact", head: true })
      .eq("familie_id", profile?.id)
      .eq("status", "angeboten"),
    supabase
      .from("anfragen")
      .select("*", { count: "exact", head: true })
      .eq("familie_id", profile?.id)
      .eq("status", "abgeschlossen"),
    supabase
      .from("bewertungen")
      .select("*", { count: "exact", head: true })
      .eq("familie_id", profile?.id),
    supabase
      .from("anfragen")
      .select("*", { count: "exact", head: true })
      .eq("familie_id", profile?.id),
    supabase
      .from("anfragen")
      .select("*", { count: "exact", head: true })
      .eq("familie_id", profile?.id)
      .eq("status", "bestaetigt"),
    supabase
      .from("anfragen")
      .select("*", { count: "exact", head: true })
      .eq("familie_id", profile?.id)
      .eq("status", "in_bearbeitung"),
    supabase
      .from("gespeicherte_suchen")
      .select("id, name, plz, radius_km, lebenslage, suchtext, created_at")
      .eq("profile_id", profile?.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // Top rated anbieter in PLZ area
  let empfohleneAnbieter: Array<{
    id: string;
    name: string;
    plz: string | null;
    ort: string | null;
    verifiziert: boolean;
    beschreibung: string | null;
    avgSterne: number;
    bewCount: number;
  }> = [];

  if (profile?.plz) {
    const { data: nearbyAnbieter } = await supabase
      .from("anbieter")
      .select("id, name, plz, ort, verifiziert, beschreibung")
      .eq("aktiv", true)
      .ilike("plz", profile.plz.substring(0, 2) + "%")
      .limit(10);

    if (nearbyAnbieter && nearbyAnbieter.length > 0) {
      const ids = nearbyAnbieter.map((a) => a.id);
      const { data: bew } = await supabase
        .from("bewertungen")
        .select("anbieter_id, sterne")
        .in("anbieter_id", ids);

      const bewMap: Record<string, { sum: number; count: number }> = {};
      (bew ?? []).forEach((b) => {
        if (!bewMap[b.anbieter_id]) bewMap[b.anbieter_id] = { sum: 0, count: 0 };
        bewMap[b.anbieter_id].sum += b.sterne;
        bewMap[b.anbieter_id].count += 1;
      });

      empfohleneAnbieter = nearbyAnbieter
        .map((a) => ({
          ...a,
          avgSterne: bewMap[a.id] ? bewMap[a.id].sum / bewMap[a.id].count : 0,
          bewCount: bewMap[a.id]?.count ?? 0,
        }))
        .sort((a, b) => {
          const scoreA = (a.verifiziert ? 10 : 0) + a.avgSterne * 2;
          const scoreB = (b.verifiziert ? 10 : 0) + b.avgSterne * 2;
          return scoreB - scoreA;
        })
        .slice(0, 3);
    }
  }

  const greeting = getGreeting();

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Angebote-Bann
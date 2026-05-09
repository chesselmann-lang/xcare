import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, Heart, MapPin, Phone, Globe,
  Star, CheckCircle2, MessageSquare, ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FavoritButton } from "@/components/favoriten/FavoritButton";
import { SterneDisplay } from "@/components/bewertungen/SterneRating";

export const metadata = {
  title: "Meine Favoriten | xcare",
  description: "Ihre gespeicherten Pflegedienste und Anbieter auf xcare.",
};

export default async function FamilieFavoritenPage() {
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

  // Fetch favorites with anbieter details + leistungen
  const { data: favoriten } = await supabase
    .from("favoriten")
    .select("id, created_at, anbieter(id, name, beschreibung, traeger, plz, ort, telefon, website, verifiziert, leistungen(id, name, kategorie, aktiv))")
    .eq("familie_id", profile?.id)
    .order("created_at", { ascending: false });

  // Collect anbieter IDs to batch-fetch bewertungen + offene anfragen
  const anbieterIds = favoriten
    ?.map((f) => (f.anbieter as { id: string } | null)?.id)
    .filter(Boolean) as string[] ?? [];

  // Batch fetch bewertungen averages
  const { data: allBewertungen } = anbieterIds.length > 0
    ? await supabase
        .from("bewertungen")
        .select("anbieter_id, sterne")
        .in("anbieter_id", anbieterIds)
    : { data: [] };

  // Batch fetch offene anfragen for this familie
  const { data: offeneAnfragen } = anbieterIds.length > 0
    ? await supabase
        .from("anfragen")
        .select("anbieter_id, status, id")
        .eq("familie_id", profile?.id)
        .in("anbieter_id", anbieterIds)
        .in("status", ["offen", "in_bearbeitung", "angeboten", "bestaetigt"])
    : { data: [] };

  // Build lookup maps
  const bewertungenByAnbieter: Record<string, { avg: number; count: number }> = {};
  allBewertungen?.forEach((b) => {
    if (!bewertungenByAnbieter[b.anbieter_id]) {
      bewertungenByAnbieter[b.anbieter_id] = { avg: 0, count: 0 };
    }
    const entry = bewertungenByAnbieter[b.anbieter_id];
    entry.count++;
    entry.avg = entry.avg + (b.sterne - entry.avg) / entry.count;
  });

  const anfrageByAnbieter: Record<string, { id: string; status: string }> = {};
  offeneAnfragen?.forEach((a) => {
    if (!anfrageByAnbieter[a.anbieter_id]) {
      anfrageByAnbieter[a.anbieter_id] = { id: a.id, status: a.status };
    }
  });

  const total = favoriten?.length ?? 0;
  const mitAnfrage = Object.keys(anfrageByAnbieter).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Meine Favoriten</h1>
        <p className="text-sm text-[--muted-foreground]">
          Gespeicherte Anbieter – jederzeit schnell auffindbar
        </p>
      </div>

      {/* Quick stats */}
      {total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl border border-[--border] bg-[--card] p-4 text-center">
            <p className="text-2xl font-bold text-[--foreground]">{total}</p>
            <p className="text-xs text-[--muted-foreground] mt-0.5">Gespeicherte Anbieter</p>
          </div>
          <div className="rounded-xl border border-[--border] bg-[--card] p-4 text-center">
            <p className="text-2xl font-bold text-[--foreground]">{mitAnfrage}</p>
            <p className="text-xs text-[--muted-foreground] mt-0.5">Offene Anfragen</p>
          </div>
          <div className="rounded-xl border border-[--border] bg-[--card] p-4 text-center col-span-2 sm:col-span-1">
            <p className="text-2xl font-bold text-[--foreground]">
              {total - mitAnfrage}
            </p>
            <p className="text-xs text-[--muted-foreground] mt-0.5">Noch nicht angefragt</p>
          </div>
        </div>
      )}

      {total > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {favoriten!.map((fav) => {
            const a = fav.anbieter as {
              id: string;
              name: string;
              beschreibung: string | null;
              traeger: string | null;
              plz: string | null;
              ort: string | null;
              telefon: string | null;
              website: string | null;
              verifiziert: boolean;
              leistungen: { id: string; name: string; kategorie: string; aktiv: boolean }[];
            } | null;
            if (!a) return null;

            const aktiveLeistungen = a.leistungen?.filter((l) => l.aktiv) ?? [];
            const bw = bewertungenByAnbieter[a.id];
            const anfrage = anfrageByAnbieter[a.id];

            return (
              <Card key={fav.id} className="hover:shadow-md transition-shadow flex flex-col">
                <CardContent className="p-5 flex flex-col flex-1">
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base">{a.name}</h3>
                        {a.verifiziert && (
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                        )}
                      </div>
                      {a.traeger && (
                        <p className="text-xs text-[--muted-foreground]">{a.traeger}</p>
                      )}
                    </div>
                    {/* Inline remove from favorites */}
                    <FavoritButton
                      anbieterId={a.id}
                      istFavorit={true}
                      profileId={profile!.id}
                      size="sm"
                    />
                  </div>

                  {/* Star rating */}
                  {bw && bw.count > 0 && (
                    <Link href={`/anbieter/${a.id}/bewertungen`} className="mb-2 inline-
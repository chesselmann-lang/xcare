import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Star, Calendar, CheckCircle2, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SterneDisplay } from "@/components/bewertungen/SterneRating";
import { formatDate } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("anbieter")
    .select("name, ort")
    .eq("id", id)
    .single();

  if (!data) return { title: "Bewertungen" };
  return {
    title: `Bewertungen für ${data.name} | xcare`,
    description: `Alle Kundenbewertungen für ${data.name}${data.ort ? ` in ${data.ort}` : ""}. Lesen Sie ehrliche Erfahrungsberichte.`,
  };
}

const STERNE_LABELS: Record<number, string> = {
  5: "Ausgezeichnet",
  4: "Gut",
  3: "Befriedigend",
  2: "Ausreichend",
  1: "Mangelhaft",
};

export default async function AnbieterBewertungenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("id, name, ort, plz, verifiziert, aktiv")
    .eq("id", id)
    .eq("aktiv", true)
    .single();

  if (!anbieter) notFound();

  const { data: bewertungen } = await supabase
    .from("bewertungen")
    .select("id, sterne, kommentar, created_at, profiles!familie_id(vorname, nachname)")
    .eq("anbieter_id", id)
    .order("created_at", { ascending: false });

  const total = bewertungen?.length ?? 0;
  const avg = total > 0
    ? (bewertungen!.reduce((sum, b) => sum + b.sterne, 0) / total)
    : 0;

  // Distribution per star
  const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  bewertungen?.forEach((b) => { dist[b.sterne] = (dist[b.sterne] ?? 0) + 1; });

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/anbieter/${id}`}>
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Zum Profil
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Bewertungen</h1>
          <p className="text-sm text-[--muted-foreground]">
            {anbieter.name}
            {anbieter.verifiziert && (
              <span className="ml-2 inline-flex items-center gap-0.5 text-green-600 text-xs">
                <CheckCircle2 className="h-3 w-3" /> Verifiziert
              </span>
            )}
          </p>
        </div>
      </div>

      {total === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-[--muted-foreground]">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium mb-1">Noch keine Bewertungen</p>
            <p className="text-sm">Dieser Anbieter hat noch keine Bewertungen erhalten.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary card */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-start gap-6 flex-wrap">
                {/* Big score */}
                <div className="text-center shrink-0">
                  <div className="text-5xl font-bold text-[--foreground] mb-1">{avg.toFixed(1)}</div>
                  <SterneDisplay average={avg} count={total} size="md" />
                  <p className="text-xs text-[--muted-foreground] mt-1">{total} Bewertungen</p>
                </div>

                {/* Distribution bars */}
                <div className="flex-1 min-w-48 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = dist[star] ?? 0;
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-xs">
                        <span className="w-4 text-right text-[--muted-foreground]">{star}</span>
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                        <div className="flex-1 h-2 rounded-full bg-[--muted] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-400 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-6 text-[--muted-foreground]">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Individual reviews */}
          <div className="space-y-4">
            {bewertungen!.map((b) => {
              const p = b.profiles as { vorname: string | null; nachname: string | null } | null;
              const name = p?.vorname || p?.nachname
                ? `${p?.vorname ?? ""} ${p?.nachname ?? ""}`.trim()
                : "Anonym";
              const initial = name.charAt(0).toUpperCase();

              return (
                <Card key={b.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="h-9 w-9 rounded-full bg-[--primary]/10 text-[--primary] flex items-center justify-center text-sm font-semibold shrink-0">
                        {initial}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {STERNE_LABELS[b.sterne] ?? `${b.sterne} Sterne`}
                            </Badge>
                          </div>
                          <span className="flex items-center gap-1 text-xs text-[--muted-foreground]">
                            <Calendar className="h-3 w-3" />
                            {formatDate(b.created_at)}
                          </span>
                        </div>

                        {/* Stars */}
                        <div className="flex gap-0.5 mb-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3.5 w-3.5 ${
                                star <= b.sterne
                                  ? "fill-amber-400 text-amber-400"
                                  : "fill-transparent text-gray-200"
                              }`}
                            />
                          ))}
                        </div>

                        {b.kommentar ? (
                          <p className="text-sm text-[--muted-foreground] leading-relaxed">
                            {b.kommentar}
                          </p>
                        ) : (
                          <p className="text-xs text-[--muted-foreground] italic">Keine Bewertungstext</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

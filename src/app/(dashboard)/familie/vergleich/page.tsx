import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, MapPin, Phone, Globe, CheckCircle2,
  Star, Package, GitCompareArrows,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VerfuegbarkeitBadge } from "@/components/anbieter/VerfuegbarkeitBadge";
import { SterneDisplay } from "@/components/bewertungen/SterneRating";
import { LEISTUNGSKATEGORIEN } from "@/lib/constants";
import type { LeistungsKategorie } from "@/lib/types";

export const metadata = {
  title: "Anbieter vergleichen | xcare",
  description: "Vergleichen Sie bis zu 3 Pflegeanbieter nebeneinander.",
};

const ROW_LABELS = [
  "Verfügbarkeit",
  "Ort",
  "Bewertung",
  "Kontakt",
  "Leistungen",
  "Beschreibung",
];

export default async function VergleichPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
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

  if (profile?.role === "anbieter") redirect("/anbieter/dashboard");

  const { ids: idsParam } = await searchParams;
  const ids = (idsParam ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  // Fetch all anbieter in one query
  const { data: anbieterList } = ids.length > 0
    ? await supabase
        .from("anbieter")
        .select("*, leistungen(id, name, kategorie, aktiv)")
        .in("id", ids)
        .eq("aktiv", true)
    : { data: [] };

  // Maintain order from URL param
  const ordered = ids
    .map((id) => anbieterList?.find((a) => a.id === id))
    .filter(Boolean) as typeof anbieterList & NonNullable<unknown>;

  // Batch-fetch bewertungen
  const { data: allBewertungen } = ids.length > 0
    ? await supabase
        .from("bewertungen")
        .select("anbieter_id, sterne")
        .in("anbieter_id", ids)
    : { data: [] };

  const bewertungenMap: Record<string, { avg: number; count: number }> = {};
  allBewertungen?.forEach((b) => {
    if (!bewertungenMap[b.anbieter_id]) bewertungenMap[b.anbieter_id] = { avg: 0, count: 0 };
    const e = bewertungenMap[b.anbieter_id];
    e.count++;
    e.avg = e.avg + (b.sterne - e.avg) / e.count;
  });

  const colCount = ordered?.length ?? 0;

  if (colCount === 0) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-4">
        <GitCompareArrows className="h-12 w-12 text-[--muted-foreground] mx-auto" />
        <h1 className="text-xl font-semibold">Kein Anbieter ausgewählt</h1>
        <p className="text-sm text-[--muted-foreground]">
          Wählen Sie bis zu 3 Anbieter aus Ihren Favoriten, um sie zu vergleichen.
        </p>
        <Button asChild variant="outline">
          <Link href="/familie/favoriten">Zu meinen Favoriten</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/familie/favoriten">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Anbieter vergleichen</h1>
          <p className="text-sm text-[--muted-foreground]">
            {colCount} Anbieter im Vergleich
          </p>
        </div>
      </div>

      {/* Comparison grid */}
      <div className="overflow-x-auto rounded-xl border border-[--border]">
        <table className="w-full border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-[--border] bg-[--muted]/30">
              {/* Label column header */}
              <th className="w-36 p-4 text-left text-xs font-medium text-[--muted-foreground] uppercase tracking-wider">
                Kriterium
              </th>
              {ordered?.map((a) => (
                <th key={a.id} className="p-4 text-left">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[--primary-light] text-[--primary] font-bold text-sm">
                        {a.name.charAt(0)}
                      </div>
                      <Link
                        href={`/anbieter/${a.id}`}
                        className="font-semibold text-sm hover:text-[--primary] transition-colors"
                      >
                        {a.name}
                      </Link>
                      {a.verifiziert && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                      )}
                    </div>
                    {a.traeger && (
                      <p className="text-xs text-[--muted-foreground] pl-10">{a.traeger}</p>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-[--border]">
            {/* Row: Verfügbarkeit */}
            <tr className="bg-[--card] hover:bg-[--muted]/10 transition-colors">
              <td className="p-4 text-xs font-medium text-[--muted-foreground]">Verfügbarkeit</td>
              {ordered?.map((a) => (
                <td key={a.id} className="p-4">
                  <VerfuegbarkeitBadge
                    verfuegbarkeit={a.verfuegbarkeit as "verfuegbar" | "eingeschraenkt" | "ausgebucht" | null}
                    size="sm"
                  />
                  {(!a.verfuegbarkeit || a.verfuegbarkeit === "verfuegbar") && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                      <CheckCircle2 className="h-3 w-3" />
                      Verfügbar
                    </span>
                  )}
                </td>
              ))}
            </tr>

            {/* Row: Ort */}
            <tr className="hover:bg-[--muted]/10 transition-colors">
              <td className="p-4 text-xs font-medium text-[--muted-foreground]">Standort</td>
              {ordered?.map((a) => (
                <td key={a.id} className="p-4">
                  {a.plz || a.ort ? (
                    <span className="flex items-center gap-1.5 text-sm">
                      <MapPin className="h-3.5 w-3.5 text-[--muted-foreground] shrink-0" />
                      {a.plz} {a.ort}
                    </span>
                  ) : (
                    <span className="text-xs text-[--muted-foreground]">–</span>
                  )}
                </td>
              ))}
            </tr>

            {/* Row: Bewertung */}
            <tr className="bg-[--card] hover:bg-[--muted]/10 transition-colors">
              <td className="p-4 text-xs font-medium text-[--muted-foreground]">Bewertung</td>
              {ordered?.map((a) => {
                const bw = bewertungenMap[a.id];
                return (
                  <td key={a.id} className="p-4">
                    {bw && bw.count > 0 ? (
                      <SterneDisplay average={bw.avg} count={bw.count} size="sm" />
                    ) : (
                      <span className="text-xs text-[--muted-foreground]">Noch keine</span>
                    )}
                  </td>
                );
              })}
            </tr>

            {/* Row: Kontakt */}
            <tr className="hover:bg-[--muted]/10 transition-colors">
              <td className="p-4 text-xs font-medium text-[--muted-foreground]">Kontakt</td>
              {ordered?.map((a) => (
                <td key={a.id} className="p-4 space-y-1">
                  {a.telefon && (
                    <a
                      href={`tel:${a.telefon}`}
                      className="flex items-center gap-1.5 text-xs text-[--muted-foreground] hover:text-[--primary]"
                    >
                      <Phone className="h-3 w-3 shrink-0" />
                      {a.telefon}
                    </a>
                  )}
                  {a.website && (
                    <a
                      href={a.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-[--muted-foreground] hover:text-[--primary]"
                    >
                      <Globe className="h-3 w-3 shrink-0" />
                      Website
                    </a>
                  )}
                  {!a.telefon && !a.website && (
                    <span className="text-xs text-[--muted-foreground]">–</span>
                  )}
                </td>
              ))}
            </tr>

            {/* Row: Leistungen */}
            <tr className="bg-[--card] hover:bg-[--muted]/10 transition-colors">
              <td className="p-4 text-xs font-medium text-[--muted-foreground] align-top pt-5">Leistungen</td>
              {ordered?.map((a) => {
                const active = (a.leistungen as { id: string; name: string; kategorie: string; aktiv: boolean }[])
                  ?.filter((l) => l.aktiv) ?? [];
                return (
                  <td key={a.id} className="p-4 align-top">
                    {active.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {active.slice(0, 5).map((l) => (
                          <Badge key={l.id} variant="secondary" className="text-xs">
                            {LEISTUNGSKATEGORIEN[l.kategorie as LeistungsKategorie] ?? l.name}
                          </Badge>
                        ))}
                        {active.length > 5 && (
                          <Badge variant="outline" className="text-xs">+{active.length - 5}</Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-[--muted-foreground]">–</span>
                    )}
                  </td>
                );
              })}
            </tr>

            {/* Row: Beschreibung */}
            <tr className="hover:bg-[--muted]/10 transition-colors">
              <td className="p-4 text-xs font-medium text-[--muted-foreground] align-top pt-5">Beschreibung</td>
              {ordered?.map((a) => (
                <td key={a.id} className="p-4 align-top">
                  {a.beschreibung ? (
                    <p className="text-xs text-[--muted-foreground] line-clamp-4 leading-relaxed">
                      {a.beschreibung}
                    </p>
                  ) : (
                    <span className="text-xs text-[--muted-foreground]">–</span>
                  )}
                </td>
              ))}
            </tr>

            {/* Row: CTA */}
            <tr className="bg-[--muted]/20">
              <td className="p-4" />
              {ordered?.map((a) => (
                <td key={a.id} className="p-4 space-y-2">
                  <Link href={`/anbieter/${a.id}`} className="block">
                    <Button size="sm" className="w-full">
                      Zum Profil
                    </Button>
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Back link */}
      <div className="text-center pt-2">
        <Link href="/familie/favoriten" className="text-sm text-[--muted-foreground] hover:text-[--primary]">
          ← Zurück zu Favoriten
        </Link>
      </div>
    </div>
  );
}

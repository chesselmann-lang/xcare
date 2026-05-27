import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Plus, CheckCircle2, Send, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

const TYP_LABEL: Record<string, string> = {
  pflegegeld: "Pflegegeld",
  pflegesachleistung: "Pflegesachleistung",
  verhinderungspflege: "Verhinderungspflege",
  kurzzeitpflege: "Kurzzeitpflege",
  pflegehilfsmittel: "Pflegehilfsmittel",
  wohnraumanpassung: "Wohnraumanpassung",
  tagespflege: "Tages­pflege",
  pflegegrad_erstantrag: "Pflegegrad-Erstantrag",
};

const TYP_PARAGRAF: Record<string, string> = {
  pflegegeld: "§ 37 SGB XI",
  pflegesachleistung: "§ 36 SGB XI",
  verhinderungspflege: "§ 39 SGB XI",
  kurzzeitpflege: "§ 42 SGB XI",
  pflegehilfsmittel: "§ 40 SGB XI",
  wohnraumanpassung: "§ 40 Abs. 4 SGB XI",
  tagespflege: "§ 41 SGB XI",
  pflegegrad_erstantrag: "§ 14–15 SGB XI",
};

const STATUS_LABEL: Record<string, string> = {
  entwurf: "Entwurf",
  bereit: "Bereit",
  eingereicht: "Eingereicht",
  in_bearbeitung: "In Bearbeitung",
  bewilligt: "Bewilligt",
  abgelehnt: "Abgelehnt",
  widerspruch: "Widerspruch",
};

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive" | "outline"
> = {
  entwurf: "secondary",
  bereit: "outline",
  eingereicht: "default",
  in_bearbeitung: "warning",
  bewilligt: "success",
  abgelehnt: "destructive",
  widerspruch: "warning",
};

type Antrag = {
  id: string;
  typ: string;
  status: string;
  kassenname: string | null;
  aktenzeichen: string | null;
  eingereicht_am: string | null;
  created_at: string;
};

export default async function AntraegePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role === "anbieter") redirect("/anbieter/dashboard");

  const { data: antraege } = await supabase
    .from("antraege")
    .select(
      "id, typ, status, kassenname, aktenzeichen, eingereicht_am, created_at"
    )
    .eq("familie_id", profile?.id ?? user.id)
    .order("created_at", { ascending: false });

  const liste = (antraege ?? []) as Antrag[];

  const total = liste.length;
  const eingereicht = liste.filter((a) =>
    ["eingereicht", "in_bearbeitung", "bewilligt"].includes(a.status)
  ).length;
  const bewilligt = liste.filter((a) => a.status === "bewilligt").length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[--foreground]">
            Meine Anträge
          </h1>
          <p className="text-sm text-[--muted-foreground] mt-1">
            Pflegeleistungen beantragen — vorbefüllt aus Ihrem Profil, fertig
            zum Ausdrucken.
          </p>
        </div>
        <Button asChild>
          <Link href="/familie/antraege/neu">
            <Plus className="h-4 w-4" />
            Neuer Antrag
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-[--muted] p-2">
              <FileText className="h-4 w-4 text-[--muted-foreground]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-xs text-[--muted-foreground]">Gesamt</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-blue-50 p-2">
              <Send className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{eingereicht}</p>
              <p className="text-xs text-[--muted-foreground]">Eingereicht</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-green-50 p-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{bewilligt}</p>
              <p className="text-xs text-[--muted-foreground]">Bewilligt</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Antrag-Liste */}
      {liste.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Noch keine Anträge"
          description="Stellen Sie Ihren ersten Antrag auf Pflegeleistungen — in wenigen Minuten, direkt aus Ihrem Profil vorbefüllt."
          action={{
            label: "Ersten Antrag stellen",
            href: "/familie/antraege/neu",
          }}
        />
      ) : (
        <div className="space-y-3">
          {liste.map((antrag) => (
            <Card
              key={antrag.id}
              className="hover:border-[--primary]/40 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[--foreground]">
                        {TYP_LABEL[antrag.typ] ?? antrag.typ}
                      </span>
                      <span className="text-xs text-[--muted-foreground]">
                        {TYP_PARAGRAF[antrag.typ]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-[--muted-foreground]">
                      {antrag.kassenname && (
                        <span>{antrag.kassenname}</span>
                      )}
                      {antrag.aktenzeichen && (
                        <span>AZ: {antrag.aktenzeichen}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {antrag.eingereicht_am
                          ? `Eingereicht ${new Date(antrag.eingereicht_am).toLocaleDateString("de-DE")}`
                          : `Erstellt ${new Date(antrag.created_at).toLocaleDateString("de-DE")}`}
                      </span>
                    </div>
                  </div>
                  <Badge variant={STATUS_VARIANT[antrag.status] ?? "secondary"}>
                    {STATUS_LABEL[antrag.status] ?? antrag.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* CTA Banner */}
      {liste.length > 0 && (
        <Card className="border-dashed border-[--primary]/30 bg-[--primary]/5">
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-[--foreground]">
                Weiteren Antrag stellen
              </p>
              <p className="text-sm text-[--muted-foreground]">
                Alle Formulare werden automatisch aus Ihrem Profil vorbefüllt.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/familie/antraege/neu">
                <Plus className="h-4 w-4" />
                Neuer Antrag
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

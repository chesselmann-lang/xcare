import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LeistungenListe } from "./leistungen-liste";

export const metadata = { title: "Meine Leistungen – xcare" };

export default async function AnbieterLeistungenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("id, role").eq("user_id", user.id).single();
  if (profile?.role === "familie") redirect("/familie");

  const { data: anbieter } = await supabase
    .from("anbieter").select("id").eq("profile_id", profile?.id ?? "").single();

  const { data: leistungen } = await supabase
    .from("leistungen")
    .select("*")
    .eq("anbieter_id", anbieter?.id ?? "")
    .order("aktiv", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/anbieter">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Zurück
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Meine Leistungen</h1>
          <p className="text-sm text-[--muted-foreground]">
            Verwalten Sie Ihre Leistungsangebote
          </p>
        </div>
      </div>

      {!anbieter && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardContent className="py-4 text-sm text-orange-700">
            Bitte zuerst das{" "}
            <Link href="/anbieter/profil" className="underline font-medium">
              Profil ausfüllen
            </Link>
            , bevor Leistungen angelegt werden können.
          </CardContent>
        </Card>
      )}

      <LeistungenListe initialLeistungen={leistungen ?? []} />
    </div>
  );
}

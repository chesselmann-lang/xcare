import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Images } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GalerieUpload } from "@/components/anbieter/GalerieUpload";

export const metadata = { title: "Profilgalerie | xcare Anbieter" };

export default async function GaleriePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "anbieter") redirect("/familie");

  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("id, name")
    .eq("profile_id", profile.id)
    .single();

  if (!anbieter) redirect("/anbieter/dashboard");

  const { data: bilder } = await supabase
    .from("anbieter_galerie")
    .select("id, storage_pfad, alt_text, position")
    .eq("anbieter_id", anbieter.id)
    .order("position", { ascending: true });

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/anbieter/profil">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Zurück zum Profil
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Profilgalerie</h1>
          <p className="text-sm text-[--muted-foreground] mt-0.5">
            Zeigen Sie Interessenten Bilder Ihrer Einrichtung, Ihres Teams oder Ihrer Arbeit.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Images className="h-4 w-4" /> Fotos verwalten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <GalerieUpload
            anbieterId={anbieter.id}
            initialBilder={bilder ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfilFormular from "./profil-formular";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerfuegbarkeitPicker } from "@/components/anbieter/VerfuegbarkeitPicker";
import { LogoUploadCard } from "@/components/anbieter/LogoUploadCard";
import { CalendarCheck2 } from "lucide-react";

export default async function AnbieterProfilPage() {
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

  if (profile?.role === "familie") redirect("/familie");

  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("*")
    .eq("profile_id", profile?.id)
    .single();

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Verfügbarkeitsstatus */}
      {anbieter && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarCheck2 className="h-4 w-4 text-[--primary]" /> Verfügbarkeit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-3">
              Zeigen Sie Familien, ob Sie neue Anfragen entgegennehmen können.
              Dieser Status erscheint auf Ihrem öffentlichen Profil.
            </p>
            <VerfuegbarkeitPicker
              anbieterId={anbieter.id}
              initial={(anbieter.verfuegbarkeit as "verfuegbar" | "eingeschraenkt" | "ausgebucht") ?? "verfuegbar"}
            />
          </CardContent>
        </Card>
      )}

      {/* Logo-Upload */}
      {anbieter && (
        <LogoUploadCard
          anbieterId={anbieter.id}
          anbieterName={anbieter.name}
          initialLogoUrl={anbieter.logo_url ?? null}
        />
      )}

      {/* Profil-Formular */}
      <ProfilFormular anbieter={anbieter} profile={profile} />
    </div>
  );
}

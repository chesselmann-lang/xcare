import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";
import { FamilieProfilFormular } from "./familie-profil-formular";

export default async function FamilieEinstellungenPage() {
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

  if (!profile || profile.role !== "familie") redirect("/anbieter");

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Verwalten Sie Ihre persönlichen Daten und Kontaktinformationen.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-[--primary]" /> Mein Profil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FamilieProfilFormular profile={profile} email={user.email ?? ""} />
        </CardContent>
      </Card>
    </div>
  );
}

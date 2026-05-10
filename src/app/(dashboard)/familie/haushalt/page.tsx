import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HaushaltVerwaltung } from "@/components/haushalt/HaushaltVerwaltung";
import type { Haushalt, Haushaltsmitglied, Vollmacht } from "@/lib/haushalt/types";

export const metadata = {
  title: "Haushalt & Vollmachten | xcare Familie",
};

export default async function HaushaltPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, haushalt_id")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "familie") redirect("/anbieter/dashboard");

  let haushalt: Haushalt | null = null;
  let mitglieder: Haushaltsmitglied[] = [];
  let vollmachten: Vollmacht[] = [];

  if (profile.haushalt_id) {
    const { data: haushaltData } = await supabase
      .from("haushalte")
      .select("*")
      .eq("id", profile.haushalt_id)
      .single();

    haushalt = haushaltData;

    const { data: mitgliederData } = await supabase
      .from("haushaltsmitglieder")
      .select("*")
      .eq("haushalt_id", profile.haushalt_id)
      .order("created_at", { ascending: true });

    mitglieder = mitgliederData ?? [];

    const { data: vollmachtenData } = await supabase
      .from("vollmachten")
      .select("*")
      .eq("haushalt_id", profile.haushalt_id)
      .order("created_at", { ascending: false });

    vollmachten = vollmachtenData ?? [];
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[--foreground]">Haushalt & Vollmachten</h1>
        <p className="text-sm text-[--muted-foreground] mt-0.5">
          Verwalten Sie Ihren Haushalt, Haushaltsmitglieder und rechtliche Vollmachten.
        </p>
      </div>

      <HaushaltVerwaltung
        initialHaushalt={haushalt}
        initialMitglieder={mitglieder}
        initialVollmachten={vollmachten}
      />
    </div>
  );
}

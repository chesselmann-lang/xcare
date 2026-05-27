import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NetzwerkClient } from "@/components/netzwerk/NetzwerkClient";

export const metadata = {
  title: "Familien-Netzwerk | xcare",
  description: "Gemeinsam Aufgaben verwalten und koordinieren",
};

export default async function FamilieNetzwerkPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, vorname, nachname, rolle, avatar_url")
    .eq("user_id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Load existing tasks
  const { data: aufgaben } = await supabase
    .from("familien_aufgaben")
    .select(
      "id, titel, beschreibung, status, prioritaet, faellig_am, kategorie, created_at, updated_at, zugewiesen_an, erstellt_von"
    )
    .eq("familie_profile_id", user.id)
    .order("created_at", { ascending: false });

  // Load comments for all tasks
  const taskIds = (aufgaben || []).map((a) => a.id);
  const { data: kommentare } =
    taskIds.length > 0
      ? await supabase
          .from("aufgaben_kommentare")
          .select("id, aufgabe_id, autor_id, text, created_at")
          .in("aufgabe_id", taskIds)
          .order("created_at", { ascending: true })
      : { data: [] };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Page header */}
      <div className="p-4 md:p-6 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Unser Familien-Netzwerk
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Gemeinsam koordinieren — Aufgaben verteilen und verfolgen
            </p>
          </div>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-hidden">
        <NetzwerkClient
          initialAufgaben={aufgaben || []}
          initialKommentare={kommentare || []}
          currentUserId={user.id}
          currentUserProfile={profile}
          familieProfileId={user.id}
        />
      </div>
    </div>
  );
}

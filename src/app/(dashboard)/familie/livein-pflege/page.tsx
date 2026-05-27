import { Metadata } from "next";
import { LiveinPflegeClient } from "@/components/livein/LiveinPflegeClient";
import { createClient } from "@/lib/supabase/server";
import { matchLiveinAgenturen } from "@/lib/livein/matching";

export const metadata: Metadata = {
  title: "24h Live-in Pflege | xcare",
  description:
    "Professionelle 24h-Betreuung zuhause nach §8 SGB XI — seriöse Vermittlung und Kostenrechner",
};

export default async function LiveinPflegePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Default matching (Pflegegrad 2)
  const agenturen = await matchLiveinAgenturen({
    pflegegrad: 2,
    demenz_pflege: false,
    fuehrerschein_noetig: false,
    haustiere_vorhanden: false,
  });

  const { data: anfragen } = user
    ? await supabase
        .from("livein_anfragen")
        .select("id, status, created_at, agentur_id, livein_agenturen(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10)
    : { data: [] };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          24h Live-in Pflege
        </h1>
        <p className="text-gray-500 mt-1">
          Professionelle Rund-um-die-Uhr-Betreuung im eigenen Zuhause nach
          § 8 SGB XI
        </p>
      </div>
      <LiveinPflegeClient
        initialAgenturen={agenturen}
        initialAnfragen={anfragen ?? []}
      />
    </div>
  );
}

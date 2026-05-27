import { createClient } from "@/lib/supabase/server";
import CommunityClient from "@/components/community/CommunityClient";

export const metadata = {
  title: "Nachbarschaftshilfe | xcare",
  description: "Nachbarschaftliche Hilfsangebote und Gesuche in Ihrer Nähe",
};

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: { plz?: string; kategorie?: string };
}) {
  const supabase = await createClient();

  let query = supabase
    .from("community_hilfe")
    .select("*")
    .eq("aktiv", true)
    .order("created_at", { ascending: false });

  if (searchParams.plz) {
    query = query.eq("plz", searchParams.plz);
  }
  if (searchParams.kategorie) {
    query = query.eq("kategorie", searchParams.kategorie);
  }

  const { data: posts } = await query.limit(50);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Nachbarschaftshilfe</h1>
          <p className="text-gray-500 mt-1">
            Gegenseitige Unterstützung in Ihrer Gemeinde — Hilfe anbieten oder finden.
          </p>
        </div>
        <CommunityClient initialPosts={posts ?? []} />
      </div>
    </div>
  );
}

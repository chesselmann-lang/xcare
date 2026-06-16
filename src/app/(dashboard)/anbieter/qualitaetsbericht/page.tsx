import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { QualitaetsberichtClient } from "@/components/qualitaetsbericht/QualitaetsberichtClient";

export const metadata = { title: "Qualitätsbericht | xcare" };

export default async function QualitaetsberichtPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("anbieter_id, role")
    .eq("id", user.id)
    .single();
  if (!profile?.anbieter_id) notFound();

  // Default: current year
  const now = new Date();
  const von = `${now.getFullYear()}-01-01`;
  const bis = now.toISOString().slice(0, 10);

  // Fetch via API (keeps aggregation logic in one place)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll()
    .map(c => `${c.name}=${c.value}`)
    .join("; ");

  const res = await fetch(
    `${baseUrl}/api/qualitaetsbericht?von=${von}&bis=${bis}`,
    {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    // Return empty shell so client can still load
    const empty = {
      von, bis,
      anbieterName: "",
      kennzahlen: { bewohnerAnz: 0, teamGroesse: 0, betreuungsquote: null },
      bereiche: {
        pflege: { label: "Pflege und medizinische Versorgung", score: 0, items: [] },
        sozial: { label: "Soziale Betreuung und Alltagsgestaltung", score: 0, items: [] },
        hotel: { label: "Wohnen, Verpflegung, Hauswirtschaft", score: 0, items: [] },
        organisation: { label: "Unternehmensführung und -entwicklung", score: 0, items: [] },
      },
      gesamtscore: 0,
      gesamtnote: 6,
      empfehlungen: [],
      massnahmen: [],
      datengrundlage: {},
      berichteListe: [],
    };
    return <QualitaetsberichtClient {...empty} />;
  }

  const data = await res.json();

  return <QualitaetsberichtClient {...data} von={von} bis={bis} />;
}

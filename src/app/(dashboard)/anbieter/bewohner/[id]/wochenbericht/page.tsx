import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { notFound } from "next/navigation";
import { WochenberichtClient } from "@/components/wochenbericht/WochenberichtClient";

export const metadata = { title: "Wochenbericht" };

export default async function WochenberichtPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("anbieter_id, anbieter:anbieter(id)")
    .eq("user_id", user.id)
    .single();

  if (!profile?.anbieter_id) notFound();

  // Verify bewohner belongs to this anbieter
  const { data: bewohner } = await supabase
    .from("bewohner")
    .select("id, vorname, nachname")
    .eq("id", id)
    .eq("anbieter_id", profile.anbieter_id)
    .single();

  if (!bewohner) notFound();

  // Load current week data from API
  const headerStore = await headers();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${headerStore.get("host")}`;

  let initialData = {
    von: (() => { const d = new Date(); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); return new Date(d.setDate(diff)).toISOString().slice(0, 10); })(),
    bis: (() => { const d = new Date(); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? 0 : 7); return new Date(d.setDate(diff)).toISOString().slice(0, 10); })(),
    zusammenfassung: {
      vitalwerte: {}, medikamente: {}, schlaf: {}, wohlbefinden: {}, aktivitaeten: [], tagesupdates: []
    },
    bestehendesBericht: null,
    frühereBerichteListe: [],
  };

  try {
    const res = await fetch(`${baseUrl}/api/bewohner/${id}/wochenbericht`, {
      headers: { cookie: cookieStore.toString() },
      cache: "no-store",
    });
    if (res.ok) {
      initialData = await res.json();
    }
  } catch (_) { /* use defaults */ }

  return (
    <WochenberichtClient
      bewohnerId={id}
      bewohnerName={`${bewohner.vorname} ${bewohner.nachname}`}
      von={initialData.von}
      bis={initialData.bis}
      zusammenfassung={initialData.zusammenfassung as any}
      bestehendesBericht={initialData.bestehendesBericht}
      frühereBerichteListe={initialData.frühereBerichteListe}
    />
  );
}

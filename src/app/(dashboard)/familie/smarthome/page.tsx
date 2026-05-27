import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SmarthomeClient from "@/components/smarthome/SmarthomeClient";

export const metadata = {
  title: "Smart Home | xcare Familie",
};

export default async function SmarthomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "familie") redirect("/anbieter/dashboard");

  // Load connected devices
  const { data: geraete } = await supabase
    .from("smarthome_geraete")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Load last 24h events
  const seit24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: ereignisse } = await supabase
    .from("smarthome_ereignisse")
    .select("*, geraet:smarthome_geraete(name, typ)")
    .eq("user_id", user.id)
    .gte("created_at", seit24h)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[--foreground]">Smart Home</h1>
        <p className="text-sm text-[--muted-foreground] mt-0.5">
          Verbinden Sie Hue-Leuchten, MQTT-Sensoren und Alexa für intelligente Pflege-Unterstützung.
        </p>
      </div>

      <SmarthomeClient
        initialGeraete={geraete ?? []}
        initialEreignisse={ereignisse ?? []}
        userId={user.id}
      />
    </div>
  );
}

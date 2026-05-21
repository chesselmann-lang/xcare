import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { KostenrechnerClient } from "./KostenrechnerClient";

export const metadata: Metadata = {
  title: "Pflegeleistungen-Kostenrechner | xcare",
  description: "Berechnen Sie Ihren Eigenanteil für ambulante, stationäre Pflege und Tagespflege.",
};

export default async function KostenrechnerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "familie") redirect("/anbieter/dashboard");

  return <KostenrechnerClient />;
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AntragsAssistentClient } from "@/components/antraege/AntragsAssistentClient";

export default async function NeuenAntragPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, vorname, nachname, telefon, plz, ort")
    .eq("user_id", user.id)
    .single();

  if (profile?.role === "anbieter") redirect("/anbieter/dashboard");

  const prefill = {
    antragsteller_vorname: profile?.vorname ?? "",
    antragsteller_nachname: profile?.nachname ?? "",
    antragsteller_email: user.email ?? "",
    antragsteller_telefon: profile?.telefon ?? "",
    antragsteller_plz: profile?.plz ?? "",
    antragsteller_ort: profile?.ort ?? "",
    datum: new Date().toLocaleDateString("de-DE"),
  };

  return (
    <div className="max-w-3xl mx-auto">
      <AntragsAssistentClient prefill={prefill} />
    </div>
  );
}

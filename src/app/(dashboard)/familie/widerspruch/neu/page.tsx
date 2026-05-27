import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { WiderspruchAssistentClient } from "@/components/widerspruch/WiderspruchAssistentClient";

export const metadata: Metadata = {
  title: "Neuer Widerspruch | xcare Familie",
  description:
    "KI-gestützter Widerspruchsgenerator nach SGB XI § 78 ff.",
};

export default async function NeuerWiderspruchPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role === "anbieter") redirect("/anbieter/dashboard");

  return (
    <div className="max-w-3xl mx-auto">
      <WiderspruchAssistentClient />
    </div>
  );
}

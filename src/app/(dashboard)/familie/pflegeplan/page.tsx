import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HeartHandshake } from "lucide-react";
import { PflegeplanHub } from "@/components/pflegeplan/PflegeplanHub";
import { PflegeplanGenerator } from "@/components/pflegeplan/PflegeplanGenerator";

export const metadata = {
  title: "Pflegeplan | xcare Familie",
};

export default async function PflegeplanPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "familie") redirect("/anbieter/dashboard");

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[--foreground] flex items-center gap-2">
          <HeartHandshake className="h-6 w-6 text-[--primary]" />
          Pflegeplan
        </h1>
        <p className="text-sm text-[--muted-foreground] mt-0.5">
          Termine, Aufgaben, Ziele, Tagebuch, Kosten und Notfallkontakte an einem Ort.
        </p>
      </div>

      {/* KI-Pflegeplan-Generator */}
      <div className="rounded-2xl border border-[--border] bg-[--card] p-5">
        <PflegeplanGenerator />
      </div>

      <PflegeplanHub />
    </div>
  );
}

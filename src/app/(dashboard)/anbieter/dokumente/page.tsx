import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DokumentUpload } from "@/components/upload/DokumentUpload";
import { FileCheck } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dokumente – xcare",
};

export default async function DokumentePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!profile) redirect("/login");

  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("id, name")
    .eq("profile_id", profile.id)
    .single();
  if (!anbieter) redirect("/anbieter");

  // Load existing documents
  const { data: dokumente } = await supabase
    .from("anbieter_dokumente")
    .select("*")
    .eq("anbieter_id", anbieter.id)
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-[--primary]/10 rounded-xl">
          <FileCheck className="h-5 w-5 text-[--primary]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[--foreground]">Dokumente & Nachweise</h1>
          <p className="text-xs text-[--muted-foreground] mt-0.5">
            Zertifikate, Genehmigungen und Qualitätsnachweise für {anbieter.name}
          </p>
        </div>
      </div>

      <DokumentUpload
        anbieterId={anbieter.id}
        initialDokumente={dokumente ?? []}
      />
    </div>
  );
}

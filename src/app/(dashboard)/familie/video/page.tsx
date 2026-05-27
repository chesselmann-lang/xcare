import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Video } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { VideoKonsultationClient } from "@/components/video/VideoKonsultationClient";

export const metadata: Metadata = {
  title: "Video-Konsultation | xcare Familie",
  description: "Planen und starten Sie Video-Konsultationen mit Pflegedienstleistern, Ärzten und Ihrer Familie.",
};

export default async function VideoKonsultationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, vorname, nachname")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "familie") redirect("/");

  // Load upcoming video appointments for SSR
  const { data: termine } = await supabase
    .from("video_termine")
    .select("*")
    .or(`gastgeber_id.eq.${user.id},teilnehmer_ids.cs.{${user.id}}`)
    .gte("geplant_fuer", new Date().toISOString())
    .order("geplant_fuer", { ascending: true })
    .limit(20);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
          <Video className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Video-Konsultation</h1>
          <p className="text-sm text-[--muted-foreground] mt-0.5">
            Virtuelle Gespräche mit Pflegedienstleistern, Ärzten und Ihrer Familie
          </p>
        </div>
      </div>

      <VideoKonsultationClient
        initialTermine={termine ?? []}
        userId={user.id}
        userName={`${profile.vorname ?? ""} ${profile.nachname ?? ""}`.trim() || "Gast"}
      />
    </div>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Activity } from "lucide-react";
import { GesundheitsHub } from "@/components/health/GesundheitsHub";

export const metadata = {
  title: "Gesundheits-Hub | xcare Familie",
};

export default async function GesundheitsHubPage() {
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
          <Activity className="h-6 w-6 text-[--primary]" />
          Gesundheits-Hub
        </h1>
        <p className="text-sm text-[--muted-foreground] mt-0.5">
          Medikamentenplan, Diagnosen und Impfpass an einem Ort — sicher und privat.
        </p>
      </div>

      <GesundheitsHub />
    </div>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Bot } from "lucide-react";
import { CopilotChat } from "@/components/copilot/CopilotChat";

export const metadata = {
  title: "KI-Co-Pilot | xcare Familie",
};

export default async function CopilotPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, plz")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "familie") redirect("/anbieter/dashboard");

  const kontext = {
    plz: profile.plz ?? undefined,
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[--foreground] flex items-center gap-2">
          <Bot className="h-6 w-6 text-[--primary]" />
          KI-Co-Pilot
        </h1>
        <p className="text-sm text-[--muted-foreground] mt-0.5">
          Ihr persönlicher Sozialberater — stellt Ansprüche sicher über die deterministische Engine fest.
        </p>
      </div>

      <CopilotChat kontext={kontext} />
    </div>
  );
}

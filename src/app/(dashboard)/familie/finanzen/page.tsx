import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Wallet } from "lucide-react";
import { FinanzHub } from "@/components/finanzen/FinanzHub";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Finanz-Hub | xcare",
};

export default async function FinanzHubPage() {
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
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-[--foreground] flex items-center gap-2">
          <Wallet className="h-6 w-6 text-[--primary]" />
          Finanz-Hub
        </h1>
        <p className="text-[--muted-foreground] mt-1">
          Pflegekassen-Budgets, Steuerbelege und Haushaltsscheck auf einen Blick
        </p>
      </div>

      <FinanzHub />
    </div>
  );
}

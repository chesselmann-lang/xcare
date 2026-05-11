import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import WhiteLabelForm from "../WhiteLabelForm";

export const metadata = { title: "Neuer White-Label Partner | Admin xcare" };

export default async function AdminWhiteLabelNeuPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/white-label"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
          White-Label Partner
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Neuen Partner anlegen</h1>
        <p className="text-sm text-gray-500 mt-1">
          GKV, Versicherung oder Kommunal-Partner konfigurieren
        </p>
      </div>

      <WhiteLabelForm mode="create" />
    </div>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Bell, Shield, KeyRound, ExternalLink } from "lucide-react";
import Link from "next/link";
import { FamilieProfilFormular } from "./familie-profil-formular";
import { BenachrichtigungsEinstellungen } from "./benachrichtigungs-einstellungen";

export const metadata = {
  title: "Einstellungen | xcare Familie",
};

export default async function FamilieEinstellungenPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "familie") redirect("/anbieter/dashboard");

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-[--foreground]">Einstellungen</h1>
        <p className="text-sm text-[--muted-foreground] mt-0.5">
          Verwalten Sie Ihr Profil, Benachrichtigungen und Datenschutzoptionen.
        </p>
      </div>

      {/* Profil */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
   
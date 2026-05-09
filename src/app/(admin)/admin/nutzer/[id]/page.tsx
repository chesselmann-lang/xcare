import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, User, Mail, Phone, MapPin, Calendar,
  Building2, Heart, FileText, Star, MessageSquare,
  CheckCircle2, Clock, AlertCircle, Shield
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AnfrageStatus } from "@/lib/types";

const statusColors: Record<AnfrageStatus, string> = {
  offen: "bg-yellow-100 text-yellow-800",
  in_bearbeitung: "bg-blue-100 text-blue-800",
  angeboten: "bg-purple-100 text-purple-800",
  bestaetigt: "bg-green-100 text-green-800",
  abgelehnt: "bg-red-100 text-red-800",
  abgeschlossen: "bg-gray-100 text-gray-700",
};
const statusLabel: Record<AnfrageStatus, string> = {
  offen: "Offen",
  in_bearbeitung: "In Bearbeitung",
  angeboten: "Angeboten",
  bestaetigt: "Bestätigt",
  abgelehnt: "Abgelehnt",
  abgeschlossen: "Abgeschlossen",
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Nutzer ${id} | xcare Admin` };
}

export default async function AdminNutzerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Auth check - must be admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (adminProfile?.role !== "admin") redirect("/");

  // Load the target profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (!profile) notFound();

  const isFamilie = profile.role === "familie";
  const isAnbieter = profile.role === "anbieter";

  // Load role-specific data
  let anbieterData: {
    id: string;
    name: string;
    verifiziert: boolean;
    aktiv: boolean;
    plz: string | null;
    ort: string | null;
    created_at: string;
  } | null = null;

  let familieAnfragen: Array<{
    id: string;
    status: string;
    lebenslage: string;
    created_at: string;
    anbieter: { name: string } | null;
  }> = [];

  let anbieterAnfragen: Array<{
    id: string;
    status: string;
    lebenslage: string;
    created_at: string;
    profiles: { vorname: string | null; nachname: string | null } | null;
  }> = [];

  let bewertungenCount = 0;
  let favoritenCount = 0;

  if (isAnbieter) {
    const { data: anb } = await supabase
      .from("anbieter")
      .select("id, name, verifiziert, aktiv, plz, ort, created_at")
      .eq("profile_id", id)
      .single();

    anbieterData = anb;

    if (anb) {
      const [{ data: anfragen }, { count: bew }] = await Promise.all([
        supabase
          .from("anfragen")
          .select("id, status, lebenslage, created_at, profiles!familie_id(vorname, nachname)")
          .eq("anbieter_id", anb.id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("bewertungen")
          .select("*", { count: "exact", head: true })
          .eq("anbieter_id", anb.id),
      ]);

      anbieterAnfragen = (anfragen ?? []).map((a) => ({
        ...a,
        profiles: a.profiles as { vorname: string | null; nachname: string | null } | null,
      }));
      bewertungenCount = bew ?? 0;
    }
  }

  if (isFamilie) {
    const [{ data: anfragen }, { count: favs }] = await Promise.all([
      supabase
        .from("anfragen")
        .select("id, status, lebenslage, created_at, anbieter(name)")
        .eq("familie_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("favoriten")
        .select("*", { count: "exact", head: true })
        .eq("familie_id", id),
    ]);

    familieAnfragen = (anfragen ?? []).map((a) => ({
      ...a,
      anbieter: a.anbieter as { name: string } | null,
    }));
    favoritenCount = favs ?? 0;
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/nutzer">
          <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> Alle Nutzer
          </Button>
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Profile Card */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            {/* Avatar */}
            <div className="flex flex-col items-center text-center mb-4">
              <div className={`h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold mb-3 ${
                isAnbieter ? "bg-blue-50 text-blue-700" : "bg-rose-50 text-rose-600"
              }`}>
                {profile.vorname
                  ? profile.vorname.charAt(0).toUpperCase()
                  : profile.email.charAt(0).toUpperCase()}
              </div>
              <h1 className="text-lg font-bold text-gray-900">
                {profile.vorname || profile.nachname
                  ? `${profile.vorname ?? ""} ${profile.nachname ?? ""}`.trim()
                  : "Kein Name"}
              </h1>
              <span className={`mt-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium ${
                isAnbieter ? "bg-blue-50 text-blue-700" : "bg-rose-50 text-rose-600"
              }`}>
                {isAnbieter ? "Anbieter" : "Familie"}
              </span>
            </div>

            {/* Contact info */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                <span className="truncate">{profile.email}</span>
              </div>
              {profile.telefon && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  {profile.telefon}
                </div>
              )}
              {(profile.plz || profile.ort) && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  {profile.plz}{profile.ort ? ` ${profile.ort}` : ""}
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-400 text-xs pt-1">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                Registriert: {memberSince}
              </div>
            </div>

            {/* Onboarding status */}
            <div className={`mt-4 flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${
              profile.onboarding_done
                ? "bg-green-50 text-green-700"
                : "bg-yellow-50 text-yellow-700"
            }`}>
              {profile.onboarding_done
                ? <><CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Onboarding abgeschlossen</>
                : <><AlertCircle className="h-3.5 w-3.5 shrink-0" /> Onboarding ausstehend</>}
            </div>
          </div>

          {/* Quick stats */}
          {isAnbieter && anbieterData && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
              <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-500" /> Anbieter-Profil
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Name</span>
                  <Link
                    href={`/admin/anbieter/${anbieterData.id}`}
                    className="font-medium text-blue-600 hover:underline truncate max-w-[140px]"
                  >
                    {anbieterData.name}
                  </Link>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    anbieterData.verifiziert
                      ? "bg-green-100 text-green-700"
                      : "bg-orange-100 text-orange-700"
                  }`}>
                    {anbieterData.verifiziert ? "Verifiziert" : "Ausstehend"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Anfragen</span>
                  <span className="font-semibold text-gray-900">{anbieterAnfragen.length}+</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Bewertungen</span>
                  <span className="font-semibold text-gray-900">{bewertungenCount}</span>
                </div>
              </div>
              <Link href={`/admin/anbieter/${anbieterData.id}`}>
                <Button variant="outline" size="sm" className="w-full text-xs mt-2">
                  <Building2 className="h-3.5 w-3.5 mr-1.5" />
                  Anbieter-Profil verwalten
                </Button>
              </Link>
            </div>
          )}

          {isFamilie && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
              <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Heart className="h-4 w-4 text-rose-500" /> Familie-Statistiken
              </h2>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xl font-bold text-gray-900">{familieAnfragen.length}</p>
                  <p className="text-xs text-gray-500">Anfragen</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xl font-bold text-gray-900">{favoritenCount}</p>
                  <p className="text-xs text-gray-500">Favoriten</p>
                </div>
              </div>
            </div>
          )}

          {/* Admin actions */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-gray-400" /> Admin-Aktionen
            </h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Weitere Aktionen wie Rollenänderungen oder Kontosperrungen sind
              über das Supabase Dashboard verfügbar.
            </p>
          </div>
        </div>

        {/* Right: Activity */}
        <div className="lg:col-span-2 space-y-4">
          {/* Anbieter: Recent anfragen received */}
          {isAnbieter && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  Empfangene Anfragen
                </h2>
                <span className="text-sm text-gray-400">{anbieterAnfragen.length} (letzte 10)</span>
              </div>
              <div className="divide-y divide-gray-50">
                {anbieterAnfragen.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Noch keine Anfragen</p>
                ) : (
                  anbieterAnfragen.map((a) => {
                    const familie = a.profiles;
                    const familieName = familie?.vorname || familie?.nachname
                      ? `${familie.vorname ?? ""} ${familie.nachname ?? ""}`.trim()
                      : "Familie";
                    return (
                      <div key={a.id} className="flex items-center justify-between px-5 py-3.5">
                        <div>
                          <p className="text-sm font-medium text-gray-800 capitalize">
                            {a.lebenslage.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-gray-400">
                            Von: {familieName} · {new Date(a.created_at).toLocaleDateString("de-DE")}
                          </p>
                        </div>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusColors[a.status as AnfrageStatus] ?? "bg-gray-100 text-gray-600"}`}>
                          {statusLabel[a.status as AnfrageStatus] ?? a.status}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Familie: Recent anfragen sent */}
          {isFamilie && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-rose-500" />
                  Gesendete Anfragen
                </h2>
                <span className="text-sm text-gray-400">{familieAnfragen.length} (letzte 10)</span>
              </div>
              <div className="divide-y divide-gray-50">
                {familieAnfragen.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Noch keine Anfragen</p>
                ) : (
                  familieAnfragen.map((a) => (
                    <div key={a.id} className="flex items-center justify-between px-5 py-3.5">
                      <div>
                        <p className="text-sm font-medium text-gray-800 capitalize">
                          {a.lebenslage.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-gray-400">
                          An: {a.anbieter?.name ?? "Unbekannt"} · {new Date(a.created_at).toLocaleDateString("de-DE")}
                        </p>
                      </div>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusColors[a.status as AnfrageStatus] ?? "bg-gray-100 text-gray-600"}`}>
                        {statusLabel[a.status as AnfrageStatus] ?? a.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Profile details */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" /> Profil-Details
              </h2>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-4 text-sm">
              {[
                { label: "Vorname", value: profile.vorname ?? "—" },
                { label: "Nachname", value: profile.nachname ?? "—" },
                { label: "E-Mail", value: profile.email },
                { label: "Telefon", value: profile.telefon ?? "—" },
                { label: "PLZ", value: profile.plz ?? "—" },
                { label: "Ort", value: profile.ort ?? "—" },
                { label: "Rolle", value: profile.role },
                { label: "Profil-ID", value: profile.id.substring(0, 8) + "…" },
                { label: "Registriert", value: new Date(profile.created_at).toLocaleDateString("de-DE") },
                { label: "Onboarding", value: profile.onboarding_done ? "Abgeschlossen" : "Ausstehend" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                  <p className="font-medium text-gray-800 truncate">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, MapPin, Phone, Globe, Mail, Package, FileText } from "lucide-react";
import { VerifizierungsButtons } from "../verifizierungs-buttons";
import { formatDate } from "@/lib/utils";

export default async function AdminAnbieterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("*, profiles(email, vorname, nachname, telefon), leistungen(*)")
    .eq("id", id)
    .single();

  if (!anbieter) notFound();

  const profile = anbieter.profiles as {
    email: string;
    vorname: string | null;
    nachname: string | null;
    telefon: string | null;
  } | null;

  const leistungen = anbieter.leistungen as {
    id: string;
    name: string;
    kategorie: string;
    preis_von: number | null;
    aktiv: boolean;
  }[];

  const { count: anfragenCount } = await supabase
    .from("anfragen")
    .select("*", { count: "exact", head: true })
    .eq("anbieter_id", id);

  return (
    <div className="max-w-3xl">
      <Link href="/admin/anbieter" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ArrowLeft className="h-3.5 w-3.5" /> Zurück zur Liste
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{anbieter.name}</h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${anbieter.verifiziert ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-600"}`}>
              {anbieter.verifiziert ? "✓ Verifiziert" : "Ausstehend"}
            </span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${anbieter.aktiv ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
              {anbieter.aktiv ? "Aktiv" : "Inaktiv"}
            </span>
          </div>
        </div>
        <VerifizierungsButtons anbieterId={id} isVerifiziert={anbieter.verifiziert} isAktiv={anbieter.aktiv} />
      </div>

      <div className="space-y-4">
        {/* Stammdaten */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Stammdaten
          </h2>
          <dl className="space-y-2.5">
            {anbieter.beschreibung && (
              <div>
                <dt className="text-xs text-gray-400 font-medium">Beschreibung</dt>
                <dd className="text-sm text-gray-700 mt-0.5">{anbieter.beschreibung}</dd>
              </div>
            )}
            {(anbieter.plz || anbieter.ort) && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                <span>{anbieter.plz} {anbieter.ort}{anbieter.strasse ? `, ${anbieter.strasse}` : ""}</span>
              </div>
            )}
            {anbieter.telefon && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-3.5 w-3.5 text-gray-400" />
                <a href={`tel:${anbieter.telefon}`} className="hover:underline">{anbieter.telefon}</a>
              </div>
            )}
            {anbieter.website && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-3.5 w-3.5 text-gray-400" />
                <a href={anbieter.website} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600">{anbieter.website}</a>
              </div>
            )}
            {profile?.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-3.5 w-3.5 text-gray-400" />
                <a href={`mailto:${profile.email}`} className="hover:underline">{profile.email}</a>
              </div>
            )}
            <div className="text-xs text-gray-400 pt-1">
              Registriert: {formatDate(anbieter.created_at)}
            </div>
          </dl>
        </div>

        {/* Leistungen */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Package className="h-4 w-4" /> Leistungen ({leistungen.length})
          </h2>
          {leistungen.length === 0 ? (
            <p className="text-sm text-gray-400">Noch keine Leistungen eingetragen</p>
          ) : (
            <div className="space-y-2">
              {leistungen.map((l) => (
                <div key={l.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{l.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{l.kategorie.replace(/_/g, " ")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {l.preis_von && <span className="text-sm text-gray-600">ab {l.preis_von}€</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${l.aktiv ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                      {l.aktiv ? "Aktiv" : "Inaktiv"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Anfragen Stats */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Anfragen
          </h2>
          <p className="text-3xl font-bold text-gray-900">{anfragenCount ?? 0}</p>
          <p className="text-xs text-gray-400 mt-0.5">Anfragen insgesamt erhalten</p>
        </div>
      </div>
    </div>
  );
}

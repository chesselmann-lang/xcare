import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Star, MessageSquare, Calendar, User } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { BewertungAntwortForm } from "./bewertung-antwort-form";

export const metadata = { title: "Meine Bewertungen — xcare" };

function SterneBadge({ sterne }: { sterne: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < sterne ? "fill-amber-400 text-amber-400" : "text-gray-200 fill-gray-200"}`}
        />
      ))}
    </span>
  );
}

export default async function AnbieterBewertungenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("id, name")
    .eq("user_id", user.id)
    .single();

  if (!anbieter) redirect("/anbieter/dashboard");

  const { data: bewertungen } = await supabase
    .from("bewertungen")
    .select("id, sterne, kommentar, antwort, antwort_at, created_at, profiles!familie_id(vorname, nachname)")
    .eq("anbieter_id", anbieter.id)
    .order("created_at", { ascending: false });

  const list = bewertungen ?? [];
  const avgSterne = list.length > 0
    ? list.reduce((sum, b) => sum + b.sterne, 0) / list.length
    : null;
  const ohneAntwort = list.filter((b) => !b.antwort).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Meine Bewertungen</h1>
        <p className="text-sm text-gray-500 mt-0.5">{anbieter.name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{list.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Bewertungen gesamt</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-3xl font-bold text-amber-500">
            {avgSterne !== null ? avgSterne.toFixed(1) : "–"}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Durchschnitt</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{ohneAntwort}</p>
          <p className="text-xs text-gray-500 mt-0.5">Ohne Antwort</p>
        </div>
      </div>

      {list.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <Star className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Noch keine Bewertungen</p>
          <p className="text-sm text-gray-400 mt-1">Bewertungen von Familien erscheinen hier.</p>
        </div>
      )}

      <div className="space-y-4">
        {list.map((b) => {
          const familie = b.profiles as { vorname: string | null; nachname: string | null } | null;
          return (
            <div key={b.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Review header */}
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <SterneBadge sterne={b.sterne} />
                    <div className="flex items-center gap-3 mt-1.5">
                      {familie && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <User className="h-3 w-3" />
                          {familie.vorname} {familie.nachname}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar className="h-3 w-3" />
                        {formatDate(b.created_at)}
                      </span>
                    </div>
                  </div>
                  {!b.antwort && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-medium shrink-0">
                      Antwort ausstehend
                    </span>
                  )}
                  {b.antwort && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-100 font-medium shrink-0">
                      Beantwortet
                    </span>
                  )}
                </div>

                {b.kommentar ? (
                  <p className="text-sm text-gray-700 leading-relaxed">{b.kommentar}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">Kein Kommentar</p>
                )}
              </div>

              {/* Existing reply */}
              {b.antwort && (
                <div className="px-5 py-4 bg-blue-50/40 border-t border-blue-100">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 mb-1.5">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Ihre Antwort
                    {b.antwort_at && (
                      <span className="text-blue-400 font-normal ml-1">· {formatDate(b.antwort_at)}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{b.antwort}</p>
                </div>
              )}

              {/* Reply form */}
              <BewertungAntwortForm
                bewertungId={b.id}
                anbieterId={anbieter.id}
                existingAntwort={b.antwort ?? null}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

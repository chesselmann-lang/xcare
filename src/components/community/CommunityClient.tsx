"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type Kategorie =
  | "einkaufen"
  | "fahrdienst"
  | "gesellschaft"
  | "gartenarbeit"
  | "kochen"
  | "handwerk"
  | "haustiere"
  | "sonstiges";

type Typ = "suche" | "biete";

interface CommunityPost {
  id: string;
  autor_id: string;
  typ: Typ;
  kategorie: Kategorie;
  titel: string;
  beschreibung?: string;
  plz?: string;
  zeitraum?: string;
  kontakt_email?: string;
  kontakt_telefon?: string;
  aktiv: boolean;
  created_at: string;
}

const KATEGORIE_ICONS: Record<Kategorie, string> = {
  einkaufen: "🛒",
  fahrdienst: "🚗",
  gesellschaft: "🤝",
  gartenarbeit: "🌿",
  kochen: "🍳",
  handwerk: "🔧",
  haustiere: "🐾",
  sonstiges: "💡",
};

const KATEGORIE_LABELS: Record<Kategorie, string> = {
  einkaufen: "Einkaufen",
  fahrdienst: "Fahrdienst",
  gesellschaft: "Gesellschaft",
  gartenarbeit: "Gartenarbeit",
  kochen: "Kochen",
  handwerk: "Handwerk",
  haustiere: "Haustiere",
  sonstiges: "Sonstiges",
};

const ALL_KATEGORIEN = Object.keys(KATEGORIE_ICONS) as Kategorie[];

interface FormData {
  typ: Typ;
  kategorie: Kategorie;
  titel: string;
  beschreibung: string;
  plz: string;
  zeitraum: string;
  kontakt_email: string;
  kontakt_telefon: string;
}

export default function CommunityClient({
  initialPosts,
}: {
  initialPosts: CommunityPost[];
}) {
  const supabase = createClient();

  const [posts, setPosts] = useState<CommunityPost[]>(initialPosts);
  const [typFilter, setTypFilter] = useState<"alle" | Typ>("alle");
  const [kategorieFilter, setKategorieFilter] = useState<Kategorie | "alle">("alle");
  const [showModal, setShowModal] = useState(false);
  const [revealedContact, setRevealedContact] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [form, setForm] = useState<FormData>({
    typ: "biete",
    kategorie: "sonstiges",
    titel: "",
    beschreibung: "",
    plz: "",
    zeitraum: "",
    kontakt_email: "",
    kontakt_telefon: "",
  });

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("community_hilfe_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_hilfe" },
        (payload) => {
          const newPost = payload.new as CommunityPost;
          if (newPost.aktiv) {
            setPosts((prev) => [newPost, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const filtered = posts.filter((p) => {
    if (typFilter !== "alle" && p.typ !== typFilter) return false;
    if (kategorieFilter !== "alle" && p.kategorie !== kategorieFilter) return false;
    return true;
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.from("community_hilfe").insert([
        {
          ...form,
          aktiv: true,
        },
      ]);
      if (error) throw error;
      setSuccessMsg("Ihr Beitrag wurde veröffentlicht!");
      setShowModal(false);
      setForm({
        typ: "biete",
        kategorie: "sonstiges",
        titel: "",
        beschreibung: "",
        plz: "",
        zeitraum: "",
        kontakt_email: "",
        kontakt_telefon: "",
      });
    } catch (err) {
      console.error(err);
      alert("Fehler beim Veröffentlichen. Bitte erneut versuchen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {successMsg && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 text-green-800 text-sm flex items-center gap-2">
          <span>✓</span> {successMsg}
          <button onClick={() => setSuccessMsg("")} className="ml-auto text-green-600 hover:text-green-800">×</button>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-2">
          {(["alle", "suche", "biete"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypFilter(t)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                typFilter === t
                  ? t === "suche"
                    ? "bg-blue-600 text-white"
                    : t === "biete"
                    ? "bg-green-600 text-white"
                    : "bg-gray-800 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t === "alle" ? "Alle" : t === "suche" ? "Gesuche" : "Angebote"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="ml-auto bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Hilfe anbieten / suchen
        </button>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setKategorieFilter("alle")}
          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
            kategorieFilter === "alle"
              ? "bg-gray-800 text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          Alle Kategorien
        </button>
        {ALL_KATEGORIEN.map((k) => (
          <button
            key={k}
            onClick={() => setKategorieFilter(k)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors flex items-center gap-1.5 ${
              kategorieFilter === k
                ? "bg-blue-100 text-blue-700 border border-blue-200"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <span>{KATEGORIE_ICONS[k]}</span>
            {KATEGORIE_LABELS[k]}
          </button>
        ))}
      </div>

      {/* Posts grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">🤝</div>
          <p>Keine Beiträge gefunden.</p>
          <p className="text-sm mt-1">Seien Sie der Erste und helfen Sie Ihrer Nachbarschaft!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((post) => (
            <div
              key={post.id}
              className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{KATEGORIE_ICONS[post.kategorie]}</span>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm leading-tight">{post.titel}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{KATEGORIE_LABELS[post.kategorie]}</div>
                  </div>
                </div>
                <span
                  className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                    post.typ === "suche"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {post.typ === "suche" ? "Suche" : "Biete"}
                </span>
              </div>

              {post.beschreibung && (
                <p className="text-sm text-gray-600 line-clamp-2">{post.beschreibung}</p>
              )}

              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                {post.plz && (
                  <span className="flex items-center gap-1">
                    <span>📍</span> {post.plz}
                  </span>
                )}
                {post.zeitraum && (
                  <span className="flex items-center gap-1">
                    <span>🕐</span> {post.zeitraum}
                  </span>
                )}
              </div>

              <div className="mt-auto">
                {revealedContact === post.id ? (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                    {post.kontakt_email && (
                      <div>
                        <span className="text-gray-400">E-Mail: </span>
                        <a href={`mailto:${post.kontakt_email}`} className="text-blue-600 hover:underline">
                          {post.kontakt_email}
                        </a>
                      </div>
                    )}
                    {post.kontakt_telefon && (
                      <div>
                        <span className="text-gray-400">Tel: </span>
                        <a href={`tel:${post.kontakt_telefon}`} className="text-blue-600 hover:underline">
                          {post.kontakt_telefon}
                        </a>
                      </div>
                    )}
                    {!post.kontakt_email && !post.kontakt_telefon && (
                      <span className="text-gray-400">Keine Kontaktdaten hinterlegt.</span>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setRevealedContact(post.id)}
                    className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-sm py-2 rounded-lg transition-colors"
                  >
                    Kontakt aufnehmen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">Hilfe anbieten oder suchen</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Typ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ich möchte …</label>
                  <div className="flex gap-2">
                    {(["biete", "suche"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, typ: t }))}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          form.typ === t
                            ? t === "biete"
                              ? "bg-green-600 text-white border-green-600"
                              : "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {t === "biete" ? "Hilfe anbieten" : "Hilfe suchen"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Kategorie */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kategorie</label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_KATEGORIEN.map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, kategorie: k }))}
                        className={`px-3 py-1.5 rounded-full text-xs flex items-center gap-1 border transition-colors ${
                          form.kategorie === k
                            ? "bg-blue-100 text-blue-700 border-blue-300"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {KATEGORIE_ICONS[k]} {KATEGORIE_LABELS[k]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Titel */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
                  <input
                    type="text"
                    required
                    value={form.titel}
                    onChange={(e) => setForm((f) => ({ ...f, titel: e.target.value }))}
                    placeholder="z.B. Einkaufshilfe für ältere Nachbarin gesucht"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Beschreibung */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                  <textarea
                    value={form.beschreibung}
                    onChange={(e) => setForm((f) => ({ ...f, beschreibung: e.target.value }))}
                    rows={3}
                    placeholder="Weitere Details zu Ihrem Angebot oder Gesuch …"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* PLZ */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
                    <input
                      type="text"
                      value={form.plz}
                      onChange={(e) => setForm((f) => ({ ...f, plz: e.target.value }))}
                      placeholder="12345"
                      maxLength={5}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {/* Zeitraum */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Zeitraum</label>
                    <input
                      type="text"
                      value={form.zeitraum}
                      onChange={(e) => setForm((f) => ({ ...f, zeitraum: e.target.value }))}
                      placeholder="Montags 14–16 Uhr"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                    <input
                      type="email"
                      value={form.kontakt_email}
                      onChange={(e) => setForm((f) => ({ ...f, kontakt_email: e.target.value }))}
                      placeholder="name@beispiel.de"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                    <input
                      type="tel"
                      value={form.kontakt_telefon}
                      onChange={(e) => setForm((f) => ({ ...f, kontakt_telefon: e.target.value }))}
                      placeholder="+49 …"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {submitting ? "Wird veröffentlicht …" : "Veröffentlichen"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

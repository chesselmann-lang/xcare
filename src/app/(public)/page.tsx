import Link from "next/link";
import {
  ArrowRight, Compass, Search, Shield, Heart, Users, Building2,
  Zap, CheckCircle2, MapPin, Star, Clock, Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { LEBENSLAGEN } from "@/lib/constants";
import type { LebenslageTyp } from "@/lib/types";
import { AutocompleteSearch } from "@/components/suche/AutocompleteSearch";
import { WebSiteJsonLd } from "@/components/seo/JsonLd";

export default async function HomePage() {
  const supabase = await createClient();

  const topLebenslagen = (
    ["alter_pflege", "geburt_fruehe_kindheit", "krankheit_genesung", "eingliederung_behinderung"] as LebenslageTyp[]
  ).map((k) => ({ key: k, ...LEBENSLAGEN[k] }));

  // Live stats from DB
  const [{ count: anbieterCount }, { count: anfragenCount }] = await Promise.all([
    supabase.from("anbieter").select("*", { count: "exact", head: true }).eq("aktiv", true),
    supabase.from("anfragen").select("*", { count: "exact", head: true }),
  ]);

  const featuredLebenslagen = (
    ["alter_pflege", "geburt_fruehe_kindheit", "krankheit_genesung", "eingliederung_behinderung",
     "schulkind_jugend", "hospiz_palliativ", "trauer_nachlass", "erwerbsleben_vereinbarkeit"] as LebenslageTyp[]
  ).map((k) => ({ key: k, ...LEBENSLAGEN[k] })).filter(Boolean);

  return (
    <div className="flex flex-col">
      <WebSiteJsonLd />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1A5276 0%, #1F618D 60%, #154360 100%)", color: "white" }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-10 bg-white blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full opacity-10 bg-white blur-2xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full opacity-5 bg-[#AADDFF] blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-32">
          <div className="max-w-3xl">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium mb-6" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
              <Heart className="h-4 w-4" style={{ fill: "white" }} />
              Ihr digitales Pflege-Ökosystem für Deutschland
            </div>

            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Die richtige Hilfe finden —<br />
              <span style={{ color: "#AADDFF" }}>schnell, lokal, menschlich.</span>
            </h1>
            <p className="text-xl mb-8 max-w-2xl leading-relaxed" style={{ color: "#C5E3F5" }}>
              xcare verbindet Familien mit verifizierten Pflege- und Sozialdienstleistern.
              Unser KI-Lotse führt Sie durch jede Lebenssituation und findet die passenden
              Hilfsangebote in Ihrer Nähe.
            </p>

            {/* Hero Search */}
            <div className="mb-8 max-w-xl">
              <AutocompleteSearch
                placeholder="Anbieter oder Leistung suchen…"
                className="[&_input]:bg-white [&_input]:text-gray-900 [&_input]:placeholder-gray-400 [&_input]:shadow-lg [&_input]:h-12 [&_input]:text-base"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/lotse">
                <Button size="lg" className="gap-2 font-semibold shadow-lg" style={{ background: "white", color: "#1A5276" }}>
                  <Compass className="h-5 w-5" />
                  KI-Lotse starten
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/suche">
                <Button size="lg" variant="outline" className="gap-2 border-white/50 text-white hover:bg-white/10 backdrop-blur-sm">
                  <Search className="h-5 w-5" />
                  Alle Anbieter
                </Button>
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-4 mt-8">
              {[
                { icon: CheckCircle2, text: "Verifizierte Anbieter" },
                { icon: Shield, text: "DSGVO-konform" },
                { icon: Zap, text: "KI-gestützte Beratung" },
              ].map((b) => (
                <div key={b.text} className="flex items-center gap-1.5 text-sm" style={{ color: "#C5E3F5" }}>
                  <b.icon className="h-4 w-4" />
                  {b.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Live Stats Bar ────────────────────────────────────────────────── */}
      <section className="border-b" style={{ background: "var(--muted)", borderColor: "var(--border)" }}>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            {[
              { value: anbieterCount?.toLocaleString("de-DE") ?? "—", label: "Aktive Anbieter", icon: Building2 },
              { value: "8", label: "Lebenslagen", icon: Heart },
              { value: anfragenCount?.toLocaleString("de-DE") ?? "—", label: "Anfragen gestellt", icon: Users },
              { value: "100%", label: "Kostenlos für Familien", icon: Star },
            ].map((s) => (
              <div key={s.label} className="text-center flex flex-col items-center gap-1">
                <s.icon className="h-5 w-5 text-[--primary] mb-1" />
                <p className="text-2xl font-bold text-[--foreground]">{s.value}</p>
                <p className="text-sm text-[--muted-foreground]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Lebenslagen Grid ─────────────────────────────────────────────── */}
      <section className="py-16 md:py-24" style={{ background: "var(--background)" }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest text-[--primary] mb-2">Lebenslagen</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              In welcher Situation befinden Sie sich?
            </h2>
            <p className="text-lg text-[--muted-foreground] max-w-xl mx-auto">
              Wählen Sie Ihre Situation — unser KI-Lotse führt Sie zu den richtigen Angeboten.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-8">
            {featuredLebenslagen.map(({ key, emoji, label, beschreibung }) => (
              <Link key={key} href={`/lotse?lebenslage=${key}`}>
                <div className="group flex flex-col items-center gap-2 p-5 rounded-2xl border border-[--border] hover:border-[--primary]/40 hover:bg-[--primary]/5 transition-all cursor-pointer text-center h-full">
                  <span className="text-4xl">{emoji}</span>
                  <p className="font-semibold text-sm text-[--foreground] group-hover:text-[--primary] transition-colors leading-tight">
                    {label}
                  </p>
                  {beschreibung && (
                    <p className="text-[11px] text-[--muted-foreground] leading-relaxed line-clamp-2 hidden sm:block">
                      {beschreibung}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center">
            <Link href="/lotse">
              <Button variant="outline" size="lg" className="gap-2">
                <Compass className="h-4 w-4" />
                KI-Lotse für alle Lebenslagen starten
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 border-t" style={{ background: "var(--muted)", borderColor: "var(--border)" }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest text-[--primary] mb-2">Warum xcare?</p>
            <h2 className="text-3xl md:text-4xl font-bold">
              Alles, was Sie brauchen — an einem Ort
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Compass,
                title: "KI-Lotse",
                desc: "Unser intelligenter Berater führt Sie in wenigen Minuten durch Ihre Lebenssituation und erklärt Ihre Ansprüche verständlich.",
                color: "bg-blue-50 text-blue-600",
                href: "/lotse",
              },
              {
                icon: MapPin,
                title: "Lokale Anbieter",
                desc: "Finden Sie verifizierte Pflege- und Sozialdienstleister in Ihrer Region — mit echten Bewertungen und direktem Kontakt.",
                color: "bg-rose-50 text-rose-600",
                href: "/suche",
              },
              {
                icon: Headphones,
                title: "Direkte Anfragen",
                desc: "Stellen Sie Anfragen mit einem Klick, erhalten Sie Angebote und kommunizieren Sie direkt mit Ihrem Wunschanbieter.",
                color: "bg-green-50 text-green-600",
                href: "/registrieren",
              },
              {
                icon: Shield,
                title: "Verifizierte Qualität",
                desc: "Alle Anbieter werden manuell geprüft. Nur seriöse Pflegedienste und Sozialeinrichtungen sind auf xcare gelistet.",
                color: "bg-purple-50 text-purple-600",
                href: "/suche",
              },
              {
                icon: Clock,
                title: "Immer aktuell",
                desc: "Öffnungszeiten, Verfügbarkeit und Leistungsangebote — immer auf dem neuesten Stand.",
                color: "bg-amber-50 text-amber-600",
                href: "/suche",
              },
              {
                icon: Heart,
                title: "Kostenlos für Familien",
                desc: "xcare ist und bleibt für Familien und Pflegebedürftige vollständig kostenlos. Keine versteckten Kosten.",
                color: "bg-teal-50 text-teal-600",
                href: "/registrieren",
              },
            ].map((f) => (
              <Link key={f.title} href={f.href}>
                <div className="group bg-[--card] border border-[--border] rounded-2xl p-6 hover:shadow-md hover:border-[--primary]/20 transition-all h-full flex flex-col gap-3 cursor-pointer">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${f.color}`}>
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-base group-hover:text-[--primary] transition-colors">{f.title}</h3>
                  <p className="text-sm text-[--muted-foreground] leading-relaxed flex-1">{f.desc}</p>
                  <div className="flex items-center gap-1 text-xs text-[--primary] font-medium mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Mehr erfahren <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA – Anbieter ───────────────────────────────────────────────── */}
      <section className="py-16 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium bg-[--primary]/10 text-[--primary] mb-4">
            <Building2 className="h-4 w-4" /> Für Pflegedienstleister
          </div>
          <h2 className="text-3xl font-bold mb-4">
            Werden Sie Teil von xcare
          </h2>
          <p className="text-lg text-[--muted-foreground] mb-8 max-w-xl mx-auto">
            Präsentieren Sie Ihre Einrichtung Tausenden von Familien. Verwalten Sie Anfragen,
            kommunizieren Sie direkt und bauen Sie Ihre digitale Präsenz auf.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/registrieren">
              <Button size="lg" className="gap-2">
                <Building2 className="h-4 w-4" />
                Als Anbieter registrieren
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/anbieter">
              <Button size="lg" variant="outline" className="gap-2">
                <Users className="h-4 w-4" />
                Alle Anbieter ansehen
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";
import { ArrowRight, Compass, Search, Shield, Heart, Users, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LEBENSLAGEN } from "@/lib/constants";
import type { LebenslageTyp } from "@/lib/types";
import { AutocompleteSearch } from "@/components/suche/AutocompleteSearch";

export default function HomePage() {
  const topLebenslagen = (
    ["alter_pflege", "geburt_fruehe_kindheit", "krankheit_genesung", "eingliederung_behinderung"] as LebenslageTyp[]
  ).map((k) => ({ key: k, ...LEBENSLAGEN[k] }));

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1A5276 0%, #1F618D 100%)", color: "white" }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white blur-2xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm mb-6" style={{ background: "rgba(255,255,255,0.15)" }}>
              <Heart className="h-4 w-4" style={{ fill: "white" }} />
              Ihr digitales Pflege-Ökosystem für Deutschland
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Pflege &amp; Sozialleistungen —<br />
              <span style={{ color: "#AADDFF" }}>einfach, schnell, menschlich.</span>
            </h1>
            <p className="text-xl mb-10 max-w-2xl" style={{ color: "#C5E3F5" }}>
              xcare verbindet Familien, Pflegebedürftige und Sozialdienstleister. Unser KI-Lotse
              begleitet Sie durch jede Lebenssituation und findet die richtigen Hilfsangebote in Ihrer Nähe.
            </p>
            {/* Hero Search */}
            <div className="mb-6 max-w-xl">
              <AutocompleteSearch
                placeholder="Anbieter oder Leistung suchen…"
                className="[&_input]:bg-white [&_input]:text-gray-900 [&_input]:placeholder-gray-400 [&_input]:shadow-md"
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <Link href="/lotse">
                <Button size="lg" className="gap-2 font-semibold" style={{ background: "white", color: "#1A5276" }}>
                  <Compass className="h-5 w-5" />
                  Lebenslage-Lotse starten
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/suche">
                <Button size="lg" variant="outline" className="gap-2 border-white text-white hover:bg-white/10">
                  <Search className="h-5 w-5" />
                  Alle Anbieter
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b" style={{ background: "var(--muted)", borderColor: "var(--border)" }}>
        <div className="max-
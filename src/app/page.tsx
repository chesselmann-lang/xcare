import Link from "next/link";
import { ArrowRight, Compass, Search, Shield, Heart, Users, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LEBENSLAGEN } from "@/lib/constants";
import type { LebenslageTyp } from "@/lib/types";

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
                  Anbieter suchen
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b" style={{ background: "var(--muted)", borderColor: "var(--border)" }}>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { zahl: "34 Mrd. €", label: "Marktvolumen Pflege DE" },
              { zahl: "5 Mio.", label: "Pflegebedürftige" },
              { zahl: "8", label: "Lebenslagen abgedeckt" },
              { zahl: "DSGVO", label: "Konform & in DE gehostet" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-bold" style={{ color: "var(--primary)" }}>{s.zahl}</div>
                <div className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lebenslagen */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-3">Wir begleiten Sie in jeder Lebenssituation</h2>
          <p className="max-w-xl mx-auto" style={{ color: "var(--muted-foreground)" }}>
            Von der Geburt bis zur Trauer — xcare kennt alle Lebenslagen und die passenden Hilfsangebote.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {topLebenslagen.map((ll) => (
            <Link key={ll.key} href={`/lotse?lebenslage=${ll.key}`}>
              <Card className="hover:shadow-lg transition-all cursor-pointer h-full" style={{ borderColor: "var(--border)" }}>
                <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                  <span className="text-4xl">{ll.emoji}</span>
                  <div>
                    <p className="font-semibold">{ll.label}</p>
                    <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>{ll.beschreibung}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        <div className="text-center">
          <Link href="/lotse">
            <Button variant="outline" className="gap-2">
              Alle 8 Lebenslagen anzeigen <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-16" style={{ background: "var(--muted)" }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Wie xcare Ihnen hilft</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                Icon: Compass,
                title: "KI-Lebenslage-Lotse",
                desc: "Unser KI-Assistent analysiert Ihre Situation und erklärt Schritt für Schritt, welche Leistungen Ihnen zustehen und wie Sie diese beantragen.",
              },
              {
                Icon: Search,
                title: "Anbietersuche",
                desc: "Finden Sie geprüfte Pflegedienste, Beratungsstellen und Sozialdienstleister in Ihrer Nähe — gefiltert nach PLZ, Leistung und Kostenträger.",
              },
              {
                Icon: Shield,
                title: "DSGVO & Datenschutz",
                desc: "Alle Daten werden ausschließlich auf deutschen Servern gespeichert. Keine Weitergabe an Dritte. Hosting: Mittwald mStudio DE.",
              },
            ].map((f) => (
              <Card key={f.title} className="shadow-none" style={{ background: "var(--background)" }}>
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl mb-4" style={{ background: "var(--primary-light)" }}>
                    <f.Icon className="h-6 w-6" style={{ color: "var(--primary)" }} />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Bereit anzufangen?</h2>
          <p className="mb-8" style={{ color: "var(--muted-foreground)" }}>
            Erstellen Sie ein kostenloses Konto und starten Sie noch heute.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                <Users className="h-5 w-5" />
                Als Familie registrieren
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" className="gap-2">
                <Building2 className="h-5 w-5" />
                Als Anbieter registrieren
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

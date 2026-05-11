import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Heart,
  Shield,
  Users,
  FileText,
  MessageCircle,
  Star,
  ArrowRight,
  CheckCircle,
  Phone,
  Mail,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ admin?: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: config } = await supabase
    .from("white_label_configs")
    .select("organisation, slug")
    .eq("slug", slug)
    .eq("aktiv", true)
    .single();

  if (!config) return { title: "Nicht gefunden" };
  return {
    title: `${config.organisation} – Pflegeberatung & Anbietersuche`,
    description: `Das Pflege-Portal von ${config.organisation}. Finden Sie geprüfte Pflegeanbieter und erhalten Sie individuelle Beratung.`,
  };
}

export default async function WhiteLabelPreviewPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { admin } = await searchParams;

  const supabase = await createClient();

  const { data: config } = await supabase
    .from("white_label_configs")
    .select("*")
    .eq("slug", slug)
    // In admin preview mode, allow inactive configs to be previewed
    .maybeSingle();

  if (!config) notFound();

  // Only show active configs publicly (admin param bypasses this)
  if (!config.aktiv && !admin) notFound();

  const features = config.features as Record<string, boolean>;
  const primaryColor = config.color_primary ?? "#2563eb";
  const secondaryColor = config.color_secondary ?? "#1e40af";
  const accentColor = config.color_accent ?? "#3b82f6";
  const fontFamily = config.font_family ?? "Inter";

  const featureCards = [
    {
      key: "ki_lotse",
      icon: Shield,
      title: "KI-Pflegeberatung",
      desc: "Persönliche Beratung zu Pflegeleistungen, Ansprüchen und Finanzierung – schnell und unkompliziert.",
    },
    {
      key: "anbieter_suche",
      icon: Search,
      title: "Anbieter finden",
      desc: "Geprüfte Pflegeanbieter in Ihrer Nähe mit detaillierten Profilen und echten Bewertungen.",
    },
    {
      key: "pflegekrafte",
      icon: Users,
      title: "Pflegefachkräfte",
      desc: "Qualifizierte Pflegekräfte für häusliche Unterstützung – transparent und sicher vermittelt.",
    },
    {
      key: "dokumente_tresor",
      icon: FileText,
      title: "Dokumenten-Tresor",
      desc: "Wichtige Dokumente sicher und jederzeit verfügbar – verschlüsselt gespeichert in der Cloud.",
    },
    {
      key: "chat",
      icon: MessageCircle,
      title: "Direktkommunikation",
      desc: "Schreiben Sie Anbietern direkt und klären Sie alle Fragen schnell und einfach.",
    },
    {
      key: "traeger_portal",
      icon: Heart,
      title: "Träger-Portal",
      desc: "Professionelles Portal für Sozialträger und Kommunen zur Anspruchsprüfung.",
    },
  ].filter((f) => features[f.key] !== false);

  return (
    <div style={{ fontFamily: `'${fontFamily}', system-ui, sans-serif` }}>
      {/* Admin preview banner */}
      {admin && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-800 flex items-center justify-center gap-2">
          <span className="font-medium">Vorschau-Modus</span> — Dies ist eine Admin-Vorschau. Der Partner sieht diese Seite mit seiner eigenen Domain.
          <Link href="/admin/white-label" className="underline hover:no-underline ml-2">
            ← Zurück zur Admin-Übersicht
          </Link>
        </div>
      )}

      {/* Navigation */}
      <nav
        style={{ background: primaryColor }}
        className="sticky top-0 z-50 shadow-sm"
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm"
              style={{ background: secondaryColor, color: "#fff" }}
            >
              {config.organisation.charAt(0)}
            </div>
            <span className="font-semibold text-white text-sm">
              {config.organisation}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/wl/${slug}/suche`}
              className="text-white/80 hover:text-white text-sm hidden sm:block transition-colors"
            >
              Anbieter suchen
            </Link>
            <Link
              href="/register"
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}
            >
              Kostenlos starten
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="py-20 px-4 text-white"
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-6"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Offizielles Portal von {config.organisation}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-5 leading-tight">
            Pflege einfach finden und organisieren
          </h1>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Das Pflegeportal von {config.organisation}. Finden Sie geprüfte Anbieter,
            prüfen Sie Ihre Ansprüche und organisieren Sie die Pflege Ihrer Liebsten.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-sm shadow-lg transition-transform hover:scale-105"
              style={{ background: "#fff", color: primaryColor }}
            >
              Jetzt kostenlos starten
              <ArrowRight className="h-4 w-4" />
            </Link>
            {features.anbieter_suche !== false && (
              <Link
                href={`/suche`}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-colors"
                style={{
                  background: "rgba(255,255,255,0.15)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.3)",
                }}
              >
                <Search className="h-4 w-4" />
                Anbieter suchen
              </Link>
            )}
          </div>
          <div className="flex items-center justify-center gap-6 mt-10 text-sm text-white/70">
            <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> DSGVO-konform</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> Kostenlos nutzbar</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> Geprüfte Anbieter</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-3">
            Alles für die beste Pflege
          </h2>
          <p className="text-center text-gray-500 mb-10 max-w-xl mx-auto">
            {config.organisation} bietet Ihnen ein umfassendes Portal für alle Pflegethemen.
          </p>
          <div className="grid md:grid-cols-3 gap-5">
            {featureCards.map((f) => (
              <div
                key={f.key}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div
                  className="inline-flex p-2.5 rounded-xl mb-4"
                  style={{ background: `${primaryColor}15` }}
                >
                  <f.icon
                    className="h-5 w-5"
                    style={{ color: primaryColor }}
                  />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center gap-8 flex-wrap">
            {[
              { value: "10.000+", label: "Familien begleitet" },
              { value: "500+", label: "Geprüfte Anbieter" },
              { value: "4,8", label: "Durchschnittsbewertung", suffix: <Star className="h-4 w-4 text-yellow-400 inline" /> },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-1">
                  {stat.value}
                  {stat.suffix}
                </div>
                <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-14 px-4 text-white"
        style={{ background: primaryColor }}
      >
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">
            Jetzt starten – kostenlos und unverbindlich
          </h2>
          <p className="text-white/80 mb-6">
            Registrieren Sie sich in wenigen Minuten und erhalten Sie sofort Zugang
            zu allen Leistungen des Portals.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all"
            style={{ background: "#fff", color: primaryColor }}
          >
            Kostenlos registrieren
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white"
                  style={{ background: primaryColor }}
                >
                  {config.organisation.charAt(0)}
                </div>
                <span className="text-white font-medium text-sm">{config.organisation}</span>
              </div>
              <p className="text-xs text-gray-500 max-w-xs">
                Ihr offizielles Pflegeportal – powered by xcare
              </p>
            </div>
            <div className="flex gap-8 text-sm">
              {config.support_email && (
                <a
                  href={`mailto:${config.support_email}`}
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {config.support_email}
                </a>
              )}
              {config.support_tel && (
                <a
                  href={`tel:${config.support_tel}`}
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {config.support_tel}
                </a>
              )}
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-6 flex flex-col sm:flex-row gap-3 justify-between text-xs">
            <span>© {new Date().getFullYear()} {config.organisation} · Powered by xcare</span>
            <div className="flex gap-4">
              {config.impressum_url && (
                <a href={config.impressum_url} className="hover:text-white transition-colors" target="_blank" rel="noopener">Impressum</a>
              )}
              {config.datenschutz_url && (
                <a href={config.datenschutz_url} className="hover:text-white transition-colors" target="_blank" rel="noopener">Datenschutz</a>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutzerklärung – xcare",
  description: "Datenschutzerklärung der xcare gemeinnützigen GmbH gemäß DSGVO",
  robots: { index: false },
};

export default function DatenschutzPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">Datenschutzerklärung</h1>
      <p className="text-sm text-[--muted-foreground] mb-8">Stand: {new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" })}</p>

      <div className="space-y-8 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Verantwortlicher</h2>
          <p>xcare gemeinnützige GmbH, Musterstraße 1, 12345 Musterstadt<br />
          E-Mail: datenschutz@xcare.de</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Datenerfassung auf unserer Website</h2>
          <h3 className="font-medium mb-1">Cookies und Speicherung</h3>
          <p>Wir verwenden technisch notwendige Cookies für die Authentifizierung. Es werden keine Werbe-Cookies gesetzt.</p>
          <h3 className="font-medium mt-3 mb-1">Nutzerkonten</h3>
          <p>Bei der Registrierung speichern wir Name, E-Mail-Adresse, Rolle sowie Profildaten. Diese Daten sind zur Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO) erforderlich.</p>
          <h3 className="font-medium mt-3 mb-1">Anfragen und Nachrichten</h3>
          <p>Anfragen und Direktnachrichten zwischen Familien und Anbietern werden zur Vertragserfüllung gespeichert und sind nur den Beteiligten zugänglich.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Hosting und Infrastruktur</h2>
          <p><strong>Vercel Inc.</strong> (Frontend-Hosting): 340 S Lemon Ave #4133, Walnut, CA 91789, USA. Verarbeitung auf Basis von EU-Standardvertragsklauseln.</p>
          <p className="mt-2"><strong>Supabase Inc.</strong> (Datenbank): Daten in der Region EU-Central-1 (Frankfurt). DSGVO-konform.</p>
          <p className="mt-2"><strong>Resend Inc.</strong> (E-Mail-Versand): Verarbeitung auf Basis von EU-Standardvertragsklauseln.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Ihre Rechte</h2>
          <p>Sie haben das Recht auf:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Auskunft</strong> über Ihre gespeicherten Daten (Art. 15 DSGVO)</li>
            <li><strong>Berichtigung</strong> unrichtiger Daten (Art. 16 DSGVO)</li>
            <li><strong>Löschung</strong> Ihrer Daten (Art. 17 DSGVO)</li>
            <li><strong>Einschränkung</strong> der Verarbeitung (Art. 18 DSGVO)</li>
            <li><strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO) — über Einstellungen → Daten exportieren</li>
            <li><strong>Widerspruch</strong> gegen die Verarbeitung (Art. 21 DSGVO)</li>
          </ul>
          <p className="mt-3">Wenden Sie sich an: <a href="mailto:datenschutz@xcare.de" className="text-[--primary] hover:underline">datenschutz@xcare.de</a></p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Speicherdauer</h2>
          <p>Daten werden gelöscht, sobald sie für den Zweck, für den sie erhoben wurden, nicht mehr benötigt werden oder Sie Ihr Konto löschen — spätestens jedoch nach 3 Jahren Inaktivität.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Beschwerde</h2>
          <p>Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Zuständig ist die für Ihren Wohnsitz zuständige Landesbehörde.</p>
        </section>
      </div>
    </div>
  );
}

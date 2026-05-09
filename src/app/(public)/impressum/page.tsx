import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum – xcare",
  description: "Impressum der xcare gemeinnützigen GmbH",
  robots: { index: false },
};

export default function ImpressumPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-8">Impressum</h1>
      <div className="prose prose-gray max-w-none space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold mb-2">Angaben gemäß § 5 TMG</h2>
          <p>xcare gemeinnützige GmbH<br />
          Musterstraße 1<br />
          12345 Musterstadt<br />
          Deutschland</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2">Vertreten durch</h2>
          <p>Geschäftsführung: [Name der Geschäftsführung]</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2">Kontakt</h2>
          <p>Telefon: +49 (0) XXX XXXXXXX<br />
          E-Mail: <a href="mailto:kontakt@xcare.de" className="text-[--primary] hover:underline">kontakt@xcare.de</a></p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2">Registereintrag</h2>
          <p>Eintragung im Handelsregister.<br />
          Registergericht: Amtsgericht Musterstadt<br />
          Registernummer: HRB XXXXX</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2">Umsatzsteuer-ID</h2>
          <p>Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz: DE XXX XXX XXX</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
          <p>[Name]<br />Musterstraße 1<br />12345 Musterstadt</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2">Streitschlichtung</h2>
          <p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
          <a href="https://ec.europa.eu/consumers/odr/" className="text-[--primary] hover:underline ml-1" target="_blank" rel="noopener noreferrer">
            https://ec.europa.eu/consumers/odr/
          </a>.<br />
          Unsere E-Mail-Adresse finden Sie oben im Impressum.</p>
          <p className="mt-2">Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
        </section>
      </div>
    </div>
  );
}

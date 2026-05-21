import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum – xcare",
  description: "Impressum der xcare gemeinnützigen GmbH",
  robots: { index: false },
};

// All contact details are driven by environment variables so no placeholder
// data ends up in source control. Fallback to clearly-marked stub values.
const COMPANY_NAME    = process.env.IMPRESSUM_COMPANY_NAME    ?? "xcare gemeinnützige GmbH";
const STREET          = process.env.IMPRESSUM_STREET          ?? "[Straße und Hausnummer]";
const ZIP_CITY        = process.env.IMPRESSUM_ZIP_CITY        ?? "[PLZ Ort]";
const COUNTRY         = process.env.IMPRESSUM_COUNTRY         ?? "Deutschland";
const MANAGING_DIR    = process.env.IMPRESSUM_MANAGING_DIR    ?? "[Name der Geschäftsführung]";
const PHONE           = process.env.IMPRESSUM_PHONE           ?? "+49 (0) XXX XXXXXXX";
const EMAIL           = process.env.IMPRESSUM_EMAIL           ?? "kontakt@xcare.de";
const COURT           = process.env.IMPRESSUM_COURT           ?? "Amtsgericht [Ort]";
const HRB             = process.env.IMPRESSUM_HRB             ?? "HRB XXXXX";
const VAT_ID          = process.env.IMPRESSUM_VAT_ID          ?? "DE XXX XXX XXX";
const RESPONSIBLE     = process.env.IMPRESSUM_RESPONSIBLE     ?? "[Name]";

export default function ImpressumPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-8">Impressum</h1>
      <div className="prose prose-gray max-w-none space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold mb-2">Angaben gemäß § 5 TMG</h2>
          <p>
            {COMPANY_NAME}<br />
            {STREET}<br />
            {ZIP_CITY}<br />
            {COUNTRY}
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2">Vertreten durch</h2>
          <p>Geschäftsführung: {MANAGING_DIR}</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2">Kontakt</h2>
          <p>
            Telefon: {PHONE}<br />
            E-Mail:{" "}
            <a href={`mailto:${EMAIL}`} className="text-[--primary] hover:underline">
              {EMAIL}
            </a>
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2">Registereintrag</h2>
          <p>
            Eintragung im Handelsregister.<br />
            Registergericht: {COURT}<br />
            Registernummer: {HRB}
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2">Umsatzsteuer-ID</h2>
          <p>
            Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:{" "}
            {VAT_ID}
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2">
            Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
          </h2>
          <p>
            {RESPONSIBLE}<br />
            {STREET}<br />
            {ZIP_CITY}
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2">Streitschlichtung</h2>
          <p>
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung
            (OS) bereit:{" "}
            <a
              href="https://ec.europa.eu/consumers/odr/"
              className="text-[--primary] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://ec.europa.eu/consumers/odr/
            </a>
            .<br />
            Unsere E-Mail-Adresse finden Sie oben im Impressum.
          </p>
          <p className="mt-2">
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor
            einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </section>
      </div>
    </div>
  );
}

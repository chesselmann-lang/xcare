import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum – xcare",
  description: "Impressum gemäß § 5 TMG",
  robots: { index: false },
};

// Driven by NEXT_PUBLIC_COMPANY_* env vars (S275).
// Falls back to clearly-marked placeholder text if not configured.
const COMPANY_NAME    = process.env.NEXT_PUBLIC_COMPANY_NAME     ?? "[FIRMA]";
const COMPANY_ADDRESS = process.env.NEXT_PUBLIC_COMPANY_ADDRESS  ?? "[ADRESSE]";
const COMPANY_EMAIL   = process.env.NEXT_PUBLIC_COMPANY_EMAIL    ?? "[EMAIL]";
const COMPANY_PHONE   = process.env.NEXT_PUBLIC_COMPANY_PHONE    ?? "[TELEFON]";
const COMPANY_REGISTER = process.env.NEXT_PUBLIC_COMPANY_REGISTER ?? "[REGISTEREINTRAG]";
const COMPANY_CEO     = process.env.NEXT_PUBLIC_COMPANY_CEO      ?? "[GESCHÄFTSFÜHRUNG]";

export default function ImpressumPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-16" id="main-content">
      <h1 className="text-3xl font-bold mb-8">Impressum</h1>

      <div className="prose prose-gray max-w-none space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold mb-2">Angaben gemäß § 5 TMG</h2>
          <address className="not-italic">
            {COMPANY_NAME}
            <br />
            {COMPANY_ADDRESS}
          </address>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Vertreten durch</h2>
          <p>Geschäftsführung: {COMPANY_CEO}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Kontakt</h2>
          <p>
            Telefon:{" "}
            <a
              href={`tel:${COMPANY_PHONE.replace(/\s/g, "")}`}
              className="text-[--primary] hover:underline"
            >
              {COMPANY_PHONE}
            </a>
            <br />
            E-Mail:{" "}
            <a
              href={`mailto:${COMPANY_EMAIL}`}
              className="text-[--primary] hover:underline"
            >
              {COMPANY_EMAIL}
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Registereintrag</h2>
          <p>{COMPANY_REGISTER}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">
            Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
          </h2>
          <p>
            {COMPANY_CEO}
            <br />
            {COMPANY_ADDRESS}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Streitschlichtung</h2>
          <p>
            Die Europäische Kommission stellt eine Plattform zur
            Online-Streitbeilegung (OS) bereit:{" "}
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
            Wir sind nicht bereit oder verpflichtet, an
            Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
            teilzunehmen.
          </p>
        </section>
      </div>
    </main>
  );
}

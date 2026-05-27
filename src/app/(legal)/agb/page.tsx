import type { Metadata } from "next";
import Link from "next/link";

// Driven by NEXT_PUBLIC_COMPANY_* env vars (S275).
const COMPANY_NAME  = process.env.NEXT_PUBLIC_COMPANY_NAME  ?? "[FIRMA]";
const COMPANY_EMAIL = process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? "[EMAIL]";
const APP_URL       = process.env.NEXT_PUBLIC_APP_URL        ?? "https://xcare.app";

export const metadata: Metadata = {
  title: "AGB – Allgemeine Geschäftsbedingungen | xcare",
  description: `Allgemeine Geschäftsbedingungen der ${COMPANY_NAME}.`,
  alternates: { canonical: `${APP_URL}/agb` },
};

export default function AgbPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 prose prose-sm" id="main-content">
      <h1 className="text-3xl font-bold mb-2">
        Allgemeine Geschäftsbedingungen (AGB)
      </h1>
      <p className="text-[--muted-foreground] mb-8">Stand: Mai 2026</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">§ 1 Geltungsbereich</h2>
        <p>
          Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge, die
          zwischen {COMPANY_NAME} (nachfolgend „xcare") und den Nutzern der
          Plattform unter{" "}
          <Link href="/" className="text-[--primary] hover:underline">
            xcare.app
          </Link>{" "}
          geschlossen werden.
        </p>
        <p className="mt-2">
          Abweichende Bedingungen des Nutzers werden nicht anerkannt, es sei
          denn, xcare stimmt ihrer Geltung ausdrücklich schriftlich zu.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">§ 2 Leistungen von xcare</h2>
        <p>
          xcare betreibt einen Online-Marktplatz, auf dem Pflegeanbieter
          (nachfolgend „Anbieter") ihre Dienstleistungen einstellen und
          Pflegesuchende (nachfolgend „Familien") diese Dienstleistungen finden
          und anfragen können.
        </p>
        <p className="mt-2">
          xcare erbringt keine eigenen Pflegeleistungen, sondern vermittelt
          lediglich den Kontakt zwischen Anbietern und Familien. xcare übernimmt
          keine Verantwortung für die Qualität der vermittelten Dienstleistungen.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">§ 3 Registrierung und Nutzerkonto</h2>
        <p>
          Für die Nutzung der Plattform ist eine Registrierung erforderlich. Die
          angegebenen Daten müssen vollständig und wahrheitsgemäß sein. Nutzer
          sind verpflichtet, ihre Zugangsdaten vertraulich zu behandeln und xcare
          unverzüglich über missbräuchliche Nutzung zu informieren.
        </p>
        <p className="mt-2">
          Ein Anspruch auf Zulassung zur Plattform besteht nicht. xcare behält
          sich das Recht vor, Konten ohne Angabe von Gründen zu sperren oder zu
          löschen.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">§ 4 Pflichten der Anbieter</h2>
        <p>Anbieter verpflichten sich,</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>nur wahrheitsgemäße Angaben zu ihren Dienstleistungen zu machen,</li>
          <li>
            alle erforderlichen behördlichen Erlaubnisse und Zertifikate
            vorzuhalten,
          </li>
          <li>Anfragen von Familien zeitnah und professionell zu bearbeiten,</li>
          <li>keine irreführenden oder rechtswidrigen Inhalte einzustellen.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">§ 5 Entgelte und Abonnements</h2>
        <p>
          Die Basisnutzung von xcare ist für Familien kostenlos. Anbieter können
          zwischen verschiedenen Abonnement-Modellen wählen, deren aktuelle
          Preise auf der{" "}
          <Link href="/anbieter/abo" className="text-[--primary] hover:underline">
            Preisseite
          </Link>{" "}
          einzusehen sind.
        </p>
        <p className="mt-2">
          Abonnements verlängern sich automatisch, sofern sie nicht rechtzeitig
          gekündigt werden. Die Mindestlaufzeit beträgt einen Monat (monatliches
          Abo) bzw. ein Jahr (Jahresabo). Die Kündigung ist jederzeit zum Ende
          der laufenden Periode möglich.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">§ 6 Bewertungen</h2>
        <p>
          Familien können Anbieter nach abgeschlossenen Anfragen bewerten.
          Bewertungen müssen wahrheitsgemäß sein und dürfen keine beleidigenden,
          diskriminierenden oder unwahren Aussagen enthalten. xcare behält sich
          das Recht vor, Bewertungen zu moderieren und bei Verstößen zu entfernen.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">§ 7 Haftungsausschluss</h2>
        <p>
          xcare haftet nicht für Schäden, die durch die vermittelten
          Dienstleistungen entstehen. Die Plattform dient ausschließlich der
          Vermittlung. Verträge über Pflegeleistungen kommen ausschließlich
          zwischen Anbietern und Familien zustande.
        </p>
        <p className="mt-2">
          xcare haftet für Vorsatz und grobe Fahrlässigkeit. Für leichte
          Fahrlässigkeit haftet xcare nur bei Verletzung wesentlicher
          Vertragspflichten (Kardinalpflichten), und zwar begrenzt auf den
          vorhersehbaren, vertragstypischen Schaden.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">§ 8 Datenschutz</h2>
        <p>
          Informationen zur Verarbeitung personenbezogener Daten finden Sie in
          unserer{" "}
          <Link href="/datenschutz" className="text-[--primary] hover:underline">
            Datenschutzerklärung
          </Link>
          .
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">§ 9 Änderungen der AGB</h2>
        <p>
          xcare behält sich das Recht vor, diese AGB mit einer Ankündigungsfrist
          von mindestens 30 Tagen zu ändern. Nutzer werden über Änderungen per
          E-Mail informiert. Widerspricht ein Nutzer nicht innerhalb von 30 Tagen
          nach Zugang der Änderungsmitteilung, gelten die neuen AGB als
          akzeptiert.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">
          § 10 Anwendbares Recht und Gerichtsstand
        </h2>
        <p>
          Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand für
          alle Streitigkeiten ist, soweit gesetzlich zulässig, der Sitz von
          xcare.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">§ 11 Kontakt</h2>
        <p>
          Bei Fragen zu diesen AGB wenden Sie sich bitte an:{" "}
          <a
            href={`mailto:${COMPANY_EMAIL}`}
            className="text-[--primary] hover:underline"
          >
            {COMPANY_EMAIL}
          </a>
        </p>
      </section>

      <div className="mt-12 pt-8 border-t border-[--border] flex gap-4 text-sm text-[--muted-foreground]">
        <Link href="/datenschutz" className="hover:text-[--foreground]">
          Datenschutz
        </Link>
        <Link href="/impressum" className="hover:text-[--foreground]">
          Impressum
        </Link>
      </div>
    </main>
  );
}

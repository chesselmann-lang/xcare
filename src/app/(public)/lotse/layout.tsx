import type { Metadata } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://xcare.de";

export const metadata: Metadata = {
  title: "KI-Lotse – Pflegeberatung & Leistungsermittlung | xcare",
  description:
    "Unser KI-Lotse hilft Ihnen, passende Pflegedienste zu finden und Ihre Leistungsansprüche zu ermitteln. Kostenlos, anonym und in Minuten.",
  alternates: { canonical: `${APP_URL}/lotse` },
  openGraph: {
    title: "KI-Lotse – Pflegeberatung | xcare",
    description:
      "Passende Pflegedienste finden und Leistungsansprüche ermitteln – mit dem KI-Lotsen von xcare.",
    url: `${APP_URL}/lotse`,
    type: "website",
  },
};

export default function LotseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

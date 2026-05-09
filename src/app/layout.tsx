import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { CookieBanner } from "@/components/cookie/CookieBanner";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "xcare — Ihr digitales Pflege-Ökosystem",
    template: "%s – xcare",
  },
  description:
    "xcare verbindet Familien, Pflegebedürftige und Sozialdienstleister in Deutschland. KI-gestützte Beratung, Anbietersuche und Fallmanagement.",
  keywords: ["Pflege", "Sozialleistungen", "Anbietersuche", "Lebenslage", "SGB XI", "xcare"],
  authors: [{ name: "xcare" }],
  creator: "xcare gemeinnützige GmbH",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://xcare-git-main-mindry.vercel.app"
  ),
  openGraph: {
    title: "xcare — Ihr digitales Pflege-Ökosystem",
    description: "KI-gestützte Beratung und Anbietersuche für alle Pflegesituationen.",
    type: "website",
    locale: "de_DE",
    siteName: "xcare",
  },
  twitter: {
    card: "summary_large_image",
    title: "xcare — Ihr digitales Pflege-Ökosystem",
    description: "KI-gestützte Beratung und Anbietersuche für alle Pflegesituationen.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-[--background] text-[--foreground]">
        {children}
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            style: { fontFamily: "var(--font-geist-sans)" },
          }}
        />
        <CookieBanner />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navigation/Navbar";
import { createClient } from "@/lib/supabase/server";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "xcare — Ihr digitales Pflege-Ökosystem",
  description:
    "xcare verbindet Familien, Pflegebedürftige und Sozialdienstleister in Deutschland. KI-gestützte Beratung, Anbietersuche und Fallmanagement.",
  keywords: ["Pflege", "Sozialleistungen", "Anbietersuche", "Lebenslage", "SGB XI", "xcare"],
  openGraph: {
    title: "xcare — Ihr digitales Pflege-Ökosystem",
    description: "KI-gestützte Beratung und Anbietersuche für alle Pflegesituationen.",
    type: "website",
    locale: "de_DE",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    profile = data;
  }

  return (
    <html lang="de" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[--background] text-[--foreground]">
        <Navbar profile={profile} />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-[--border] py-8 mt-auto">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm text-[--muted-foreground]">
            <p>© {new Date().getFullYear()} xcare gemeinnützige GmbH · Datenschutz · Impressum</p>
            <p className="mt-1">Entwickelt mit ❤️ für ein besseres Pflege-Ökosystem in Deutschland</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

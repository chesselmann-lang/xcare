import { Navbar } from "@/components/navigation/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function PublicLayout({
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
    <div className="flex flex-col min-h-screen">
      {/* Skip link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[--primary] focus:text-white focus:font-medium focus:shadow-lg"
      >
        Zum Hauptinhalt springen
      </a>
      <Navbar profile={profile} />
      <main id="main-content" className="flex-1" tabIndex={-1}>{children}</main>
      <footer className="border-t border-[--border] py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-[--muted-foreground] mb-4">
            <a href="/anbieter" className="hover:text-[--foreground] transition-colors">Anbieter-Verzeichnis</a>
            <a href="/suche" className="hover:text-[--foreground] transition-colors">Anbieter suchen</a>
            <a href="/pflegekraefte" className="hover:text-[--foreground] transition-colors">Pflegekräfte finden</a>
            <a href="/lotse" className="hover:text-[--foreground] transition-colors">KI-Lotse</a>
            <a href="/register" className="hover:text-[--foreground] transition-colors">Registrieren</a>
            <a href="/agb" className="hover:text-[--foreground] transition-colors">AGB</a>
            <a href="/datenschutz" className="hover:text-[--foreground] transition-colors">Datenschutz</a>
            <a href="/impressum" className="hover:text-[--foreground] transition-colors">Impressum</a>
          </div>
          <p className="text-center text-xs text-[--muted-foreground]">
            © {new Date().getFullYear()} xcare gemeinnützige GmbH · Entwickelt mit ❤️ für ein besseres Pflege-Ökosystem in Deutschland
          </p>
        </div>
      </footer>
    </div>
  );
}

import Link from "next/link";
import { Heart, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[--primary-light] mb-6">
        <Heart className="h-10 w-10 text-[--primary]" />
      </div>
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <h2 className="text-xl font-semibold mb-3">Seite nicht gefunden</h2>
      <p className="text-[--muted-foreground] max-w-sm mb-8">
        Die Seite, die Sie suchen, existiert nicht oder wurde verschoben.
      </p>
      <div className="flex gap-3">
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <Home className="h-4 w-4" /> Startseite
          </Button>
        </Link>
        <Link href="/suche">
          <Button className="gap-2">
            <Search className="h-4 w-4" /> Anbieter suchen
          </Button>
        </Link>
      </div>
    </div>
  );
}

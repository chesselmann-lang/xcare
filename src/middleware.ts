import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Öffentliche Anbieter-Seiten sind frei zugänglich:
  // - /anbieter           (Verzeichnis-Listing)
  // - /anbieter/[uuid]    (Profil-Seite)
  // - /anbieter/[uuid]/*  (z.B. /bewertungen)
  const UUID_RE = /^\/anbieter\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const isPublicAnbieterPage =
    pathname === "/anbieter" || UUID_RE.test(pathname);

  // Geschützte Routen — alle Bereiche die Login erfordern
  const protectedPaths = ["/familie", "/anbieter", "/admin"];
  const isProtected =
    !isPublicAnbieterPage &&
    protectedPaths.some((p) => pathname.startsWith(p));

  // 1. Unauthentifizierte Nutzer aus geschützten Bereichen ableiten
  if (isProtected && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 2. Rollenbasierte Zugriffskontrolle via JWT-Metadata (kein DB-Query nötig)
  //    Gilt nur für explizite "familie"/"anbieter"-Rollen — Admins & unbekannte Rollen
  //    passieren ohne Umleitung (ihre Seitenzugriffe werden auf Seiten-Ebene geprüft).
  if (user && isProtected) {
    const metadataRole = (user.user_metadata?.rolle as string | undefined) ?? "";

    // Anbieter darf nicht ins Familien-Dashboard
    if (metadataRole === "anbieter" && pathname.startsWith("/familie")) {
      return NextResponse.redirect(new URL("/anbieter/dashboard", request.url));
    }

    // Familie darf nicht ins Anbieter-Dashboard
    // (Öffentliche Anbieter-Profilseiten sind bereits durch isPublicAnbieterPage ausgenommen)
    if (metadataRole === "familie" && pathname.startsWith("/anbieter")) {
      return NextResponse.redirect(new URL("/familie/dashboard", request.url));
    }
  }

  // 3. Auth-Seiten bei eingeloggtem User umleiten
  //    (Nur exakte Pfade, nicht Unterseiten wie /login/passwort-vergessen)
  if ((pathname === "/login" || pathname === "/register") && user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/inngest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

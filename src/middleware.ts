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

  // Geschützte Routen (Dashboard-Bereiche)
  const protectedPaths = ["/familie", "/anbieter"];
  const isProtected =
    !isPublicAnbieterPage &&
    protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.s
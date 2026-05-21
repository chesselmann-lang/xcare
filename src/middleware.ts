import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";

/**
 * Build a Content-Security-Policy string with a per-request nonce (S277).
 * The nonce allows inline scripts without needing 'unsafe-inline'.
 * In CSP Level 2+, 'nonce-xxx' causes 'unsafe-inline' to be ignored —
 * we keep 'unsafe-inline' only as a CSP Level 1 fallback.
 * 'unsafe-eval' is intentionally omitted.
 */
function buildCsp(nonce: string, isDev: boolean): string {
  return [
    "default-src 'self'",

    // Next.js inline hydration scripts need a nonce in production.
    // 'unsafe-inline' is here only for CSP1 fallback; CSP2+ ignores it when a nonce is present.
    `script-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://js.stripe.com https://cdn.jsdelivr.net`,

    // Styles — inline Tailwind & Next.js injects inline <style> tags
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

    // Fonts
    "font-src 'self' https://fonts.gstatic.com data:",

    // Images
    [
      "img-src 'self' data: blob:",
      "https://*.supabase.co",
      "https://avatars.githubusercontent.com",
      "https://*.openstreetmap.org",
      "https://*.tile.openstreetmap.org",
      "https://maptiles.p.rapidapi.com",
    ].join(" "),

    // Fetch / XHR
    [
      "connect-src 'self'",
      "https://*.supabase.co",
      "wss://*.supabase.co",
      "https://api.anthropic.com",
      "https://api.stripe.com",
      "https://inn.gs",
      "https://api.inngest.com",
      isDev ? "ws://localhost:* http://localhost:*" : "",
    ].filter(Boolean).join(" "),

    // Frames
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",

    // Prevent embedding
    "frame-ancestors 'none'",

    // Form actions
    "form-action 'self'",

    // Workers
    "worker-src 'self' blob:",

    // Manifest
    "manifest-src 'self'",
  ].join("; ");
}

export async function middleware(request: NextRequest) {
  // Per-request nonce for CSP inline-script allowlisting (S277)
  const nonce = Buffer.from(randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  // Attach a correlation ID to every request so log lines across route handlers
  // can be correlated. Re-use an existing header if the upstream (e.g. Vercel CDN)
  // already set one; otherwise generate a fresh UUID v4.
  const requestId =
    request.headers.get("x-request-id") ??
    request.headers.get("x-vercel-id") ??
    randomUUID();

  // Expose nonce to server components via a request header
  const requestWithNonce = new Request(request, {
    headers: new Headers(request.headers),
  });
  requestWithNonce.headers.set("x-nonce", nonce);

  let supabaseResponse = NextResponse.next({ request: requestWithNonce });

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

  // Propagate the correlation ID on both the request (readable by route handlers)
  // and the response (readable by clients / log aggregators).
  supabaseResponse.headers.set("x-request-id", requestId);

  // Set dynamic CSP with nonce (S277) — overrides the static CSP from next.config.ts
  // for all routes handled by middleware (i.e., all non-static-asset routes).
  supabaseResponse.headers.set("Content-Security-Policy", buildCsp(nonce, isDev));
  // Expose the nonce to server components (read via `headers().get("x-nonce")`)
  supabaseResponse.headers.set("x-nonce", nonce);

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/inngest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

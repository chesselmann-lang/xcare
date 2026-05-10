import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * GET /auth/callback
 *
 * Handles the PKCE OAuth / magic-link / password-reset code exchange.
 * Supabase redirects here after verifying a token; this route exchanges
 * the one-time `code` for a session cookie and forwards the user to `next`.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  // If Supabase returned an error (e.g. expired link), redirect to login with message
  if (error) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", errorDescription ?? error);
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      // Fire welcome email for new signups (email confirmation flow only — not password reset)
      // Distinguish: password reset uses next=/auth/update-password; signup uses next=/
      const isPasswordReset = next.startsWith("/auth/update-password");
      if (!isPasswordReset && sessionData?.user && process.env.INNGEST_EVENT_KEY) {
        const u = sessionData.user;
        const meta = u.user_metadata ?? {};
        // Only fire for freshly confirmed accounts (confirmed_at just set, ~60s window)
        const confirmedAt = u.email_confirmed_at ? new Date(u.email_confirmed_at).getTime() : 0;
        const isNewlyConfirmed = confirmedAt > 0 && Date.now() - confirmedAt < 60_000;
        if (isNewlyConfirmed) {
          fetch(`https://inn.gs/e/${process.env.INNGEST_EVENT_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: "user/registered",
              data: {
                email: u.email,
                vorname: meta.vorname ?? meta.name ?? "Nutzer",
                rolle: meta.rolle ?? "familie",
              },
            }),
          }).catch(() => {});
        }
      }

      // Safe redirect: only allow relative paths to prevent open redirects
      const safeNext = next.startsWith("/") ? next : "/";
      return NextResponse.redirect(new URL(safeNext, request.url));
    }
  }

  // Fallback: send to login
  return NextResponse.redirect(new URL("/login", request.url));
}

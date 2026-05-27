import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, getUserInfo } from "@/lib/auth/bundid";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieState = request.cookies.get("bundid_state")?.value;

  if (!code || state !== cookieState) {
    return NextResponse.redirect(new URL("/login?error=bundid_invalid", request.url));
  }

  try {
    const tokens = await exchangeCodeForToken(code);
    const userInfo = await getUserInfo(tokens.access_token);

    // TODO: Link BundID identity to Supabase user
    // For now: redirect with success + user data for profile prefill
    const params = new URLSearchParams({
      bundid_verified: "true",
      given_name: userInfo.given_name || "",
      family_name: userInfo.family_name || "",
    });
    return NextResponse.redirect(new URL(`/profil?${params}`, request.url));
  } catch {
    return NextResponse.redirect(new URL("/login?error=bundid_failed", request.url));
  }
}

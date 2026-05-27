import { NextRequest, NextResponse } from "next/server";
import { getBundIDAuthUrl } from "@/lib/auth/bundid";

// GET: redirect to BundID
export async function GET() {
  const state = crypto.randomUUID();
  const url = getBundIDAuthUrl(state);

  const response = NextResponse.redirect(url);
  response.cookies.set("bundid_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
  });
  return response;
}

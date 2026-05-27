import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/redis";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const identifier = user?.id || request.ip || "anonymous";
  const limiter = request.nextUrl.searchParams.get("limiter") as "api" | "ai" | "auth" || "api";

  const result = await checkRateLimit(limiter, identifier);

  if (!result.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded", reset: result.reset },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": String(result.remaining),
          "X-RateLimit-Reset": String(result.reset),
          "Retry-After": String(Math.ceil((result.reset - Date.now()) / 1000)),
        }
      }
    );
  }

  return NextResponse.json({ ok: true, remaining: result.remaining });
}

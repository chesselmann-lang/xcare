import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const MAX_KEYS_PER_USER = 10;
const KEY_PREFIX = "xc_live_";
const KEY_TOTAL_LENGTH = 48; // "xc_live_" (8) + 40 random chars

function generateApiKey(): { fullKey: string; prefix: string; hash: string; hint: string } {
  const randomPart = randomBytes(30).toString("base64url").slice(0, 40);
  const fullKey = `${KEY_PREFIX}${randomPart}`;
  const prefix = fullKey.slice(0, 16); // "xc_live_" + 8 chars
  const hash = createHash("sha256").update(fullKey).digest("hex");
  const hint = fullKey.slice(-4);
  return { fullKey, prefix, hash, hint };
}

/**
 * GET /api/keys
 * List the authenticated user's API keys (prefix + hint only, never the full key).
 */
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { data: keys, error } = await supabase
      .from("api_keys")
      .select(
        "id, name, key_prefix, key_hint, scopes, rate_limit_per_minute, rate_limit_per_day, last_used_at, total_requests, is_active, expires_at, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ keys: keys ?? [] });
  } catch (err) {
    logger.error("GET /api/keys", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/**
 * POST /api/keys
 * Create a new API key. Returns the full key ONCE — it will never be shown again.
 */
export async function POST(req: NextRequest) {
  // Stricter rate limit for key creation
  const rl = await rateLimit(req, { limit: 10, window: 3600 });
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await req.json() as {
      name?: string;
      scopes?: string[];
      expires_at?: string | null;
    };

    const { name, scopes, expires_at } = body;

    if (!name?.trim() || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Name ist erforderlich (min. 2 Zeichen)" },
        { status: 400 }
      );
    }

    // Validate scopes
    const allowedScopes = ["read", "write", "admin", "webhooks"] as const;
    type AllowedScope = typeof allowedScopes[number];
    const requestedScopes: AllowedScope[] = Array.isArray(scopes)
      ? (scopes.filter((s): s is AllowedScope =>
          allowedScopes.includes(s as AllowedScope)
        ))
      : ["read"];

    if (requestedScopes.length === 0) {
      return NextResponse.json(
        { error: "Mindestens ein gültiger Scope ist erforderlich: read, write, admin, webhooks" },
        { status: 400 }
      );
    }

    // Enforce per-user key limit
    const { count } = await supabase
      .from("api_keys")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_active", true);

    if ((count ?? 0) >= MAX_KEYS_PER_USER) {
      return NextResponse.json(
        { error: `Maximum von ${MAX_KEYS_PER_USER} aktiven API-Keys erreicht. Bitte widerrufen Sie einen Key zuerst.` },
        { status: 403 }
      );
    }

    // Generate the key
    const { fullKey, prefix, hash, hint } = generateApiKey();

    // Validate optional expires_at
    let expiresAt: string | null = null;
    if (expires_at) {
      const d = new Date(expires_at);
      if (isNaN(d.getTime()) || d <= new Date()) {
        return NextResponse.json(
          { error: "expires_at muss ein zukünftiges Datum sein" },
          { status: 400 }
        );
      }
      expiresAt = d.toISOString();
    }

    const { data: newKey, error: insertErr } = await supabase
      .from("api_keys")
      .insert({
        user_id: user.id,
        name: name.trim(),
        key_prefix: prefix,
        key_hash: hash,
        key_hint: hint,
        scopes: requestedScopes,
        expires_at: expiresAt,
      })
      .select("id, name, key_prefix, key_hint, scopes, created_at")
      .single();

    if (insertErr || !newKey) {
      logger.error("POST /api/keys: insert failed", { error: insertErr });
      return NextResponse.json({ error: "Fehler beim Erstellen des API-Keys" }, { status: 500 });
    }

    logger.info("API key created", { userId: user.id, keyId: newKey.id });

    return NextResponse.json(
      {
        success: true,
        key: {
          ...newKey,
          // Return full key exactly ONCE
          full_key: fullKey,
        },
        warning:
          "Dieser Key wird nur einmal angezeigt. Bitte kopieren und sicher aufbewahren.",
      },
      { status: 201 }
    );
  } catch (err) {
    logger.error("POST /api/keys", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/**
 * DELETE /api/keys?id=<keyId>
 * Revoke (soft-delete) an API key.
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
      return NextResponse.json({ error: "Ungültige Key-ID" }, { status: 400 });
    }

    // RLS ensures the user can only affect their own keys
    const { error } = await supabase
      .from("api_keys")
      .update({ is_active: false })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      logger.error("DELETE /api/keys: update failed", { error, id });
      return NextResponse.json({ error: "Fehler beim Widerrufen des Keys" }, { status: 500 });
    }

    logger.info("API key revoked", { userId: user.id, keyId: id });
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("DELETE /api/keys", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

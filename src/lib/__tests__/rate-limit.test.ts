/**
 * S311: Unit-Tests für rate-limit.ts
 *
 * Testet:
 * - rateLimitResponse (pure function — keine Abhängigkeiten)
 * - rateLimit in-memory Sliding-Window über gemockten NextRequest
 *
 * Kein Upstash/Netzwerk — UPSTASH_REDIS_REST_URL wird nicht gesetzt.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { rateLimitResponse, rateLimit } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";

// ── Minimal NextRequest mock ──────────────────────────────────────────────────

function makeRequest(
  ip = "1.2.3.4",
  path = "/api/test",
  forwardedFor?: string
): NextRequest {
  return {
    headers: {
      get: (name: string): string | null => {
        if (name === "x-forwarded-for") return forwardedFor ?? ip;
        if (name === "x-real-ip") return ip;
        return null;
      },
    },
    nextUrl: { pathname: path },
  } as unknown as NextRequest;
}

// ─── rateLimitResponse ───────────────────────────────────────────────────────

describe("rateLimitResponse", () => {
  it("gibt HTTP 429 zurück", () => {
    const res = rateLimitResponse();
    expect(res.status).toBe(429);
  });

  it("enthält JSON-Body mit deutschem Fehlertext", async () => {
    const res = rateLimitResponse();
    const body = await res.json() as { error: string };
    expect(body.error).toBeTruthy();
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  it("setzt Content-Type: application/json", () => {
    const res = rateLimitResponse();
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });

  it("setzt Retry-After Header (Standard-60 ohne resetAt)", () => {
    const res = rateLimitResponse();
    const retryAfter = res.headers.get("Retry-After");
    expect(retryAfter).toBeTruthy();
    const seconds = Number(retryAfter);
    expect(Number.isFinite(seconds)).toBe(true);
    expect(seconds).toBeGreaterThan(0);
  });

  it("setzt X-RateLimit-Reset wenn resetAt übergeben", () => {
    const futureTs = Math.floor(Date.now() / 1000) + 120;
    const res = rateLimitResponse(futureTs);
    expect(res.headers.get("X-RateLimit-Reset")).toBe(String(futureTs));
  });

  it("setzt keinen X-RateLimit-Reset ohne resetAt", () => {
    const res = rateLimitResponse();
    expect(res.headers.get("X-RateLimit-Reset")).toBeNull();
  });

  it("ist deterministisch (gleiche Eingabe → gleicher Status)", () => {
    const ts = Math.floor(Date.now() / 1000) + 60;
    const r1 = rateLimitResponse(ts);
    const r2 = rateLimitResponse(ts);
    expect(r1.status).toBe(r2.status);
    expect(r1.headers.get("X-RateLimit-Reset")).toBe(r2.headers.get("X-RateLimit-Reset"));
  });
});

// ─── rateLimit — In-Memory Sliding Window ────────────────────────────────────

describe("rateLimit — in-memory sliding window", () => {
  // Unique path per test to avoid cross-test state in the module's store
  let testPath: string;
  let callCount = 0;

  beforeEach(() => {
    callCount++;
    testPath = `/api/test-${Date.now()}-${callCount}`;
  });

  it("lässt Anfragen unterhalb des Limits durch (success: true)", async () => {
    const req = makeRequest("10.0.0.1", testPath);
    const result = await rateLimit(req, { limit: 5, window: 60 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("zählt remaining korrekt herunter", async () => {
    const ip = "10.0.0.2";
    const req = makeRequest(ip, testPath);
    const opts = { limit: 3, window: 60 };

    const r1 = await rateLimit(req, opts);
    expect(r1.remaining).toBe(2);
    const r2 = await rateLimit(req, opts);
    expect(r2.remaining).toBe(1);
    const r3 = await rateLimit(req, opts);
    expect(r3.remaining).toBe(0);
  });

  it("blockiert wenn Limit überschritten (success: false)", async () => {
    const ip = "10.0.0.3";
    const req = makeRequest(ip, testPath);
    const opts = { limit: 2, window: 60 };

    await rateLimit(req, opts); // 1
    await rateLimit(req, opts); // 2
    const blocked = await rateLimit(req, opts); // 3 — überschritten
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("isoliert verschiedene IPs voneinander", async () => {
    const opts = { limit: 1, window: 60 };
    const reqA = makeRequest("192.168.1.1", testPath);
    const reqB = makeRequest("192.168.1.2", testPath);

    const rA = await rateLimit(reqA, opts);
    const rB = await rateLimit(reqB, opts);
    expect(rA.success).toBe(true);
    expect(rB.success).toBe(true);
  });

  it("nutzt x-forwarded-for für den Rate-Limit-Key", async () => {
    const opts = { limit: 1, window: 60 };
    // Forwarded-for contains "client, proxy1, proxy2" — only first part is used
    const req = makeRequest("10.0.0.9", testPath, "203.0.113.1, 10.0.0.9");

    const r1 = await rateLimit(req, opts);
    expect(r1.success).toBe(true);
    const r2 = await rateLimit(req, opts);
    expect(r2.success).toBe(false);
  });

  it("respektiert custom key override", async () => {
    const opts = { limit: 1, window: 60, key: `custom:key:${testPath}` };
    const req1 = makeRequest("1.1.1.1", testPath);
    const req2 = makeRequest("2.2.2.2", testPath); // andere IP, gleicher custom key

    const r1 = await rateLimit(req1, opts);
    expect(r1.success).toBe(true);
    const r2 = await rateLimit(req2, opts); // gleicher Key → bereits verbraucht
    expect(r2.success).toBe(false);
  });

  it("liefert resetAt als Unix-Timestamp in der Zukunft", async () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const req = makeRequest("10.0.0.5", testPath);
    const result = await rateLimit(req, { limit: 10, window: 30 });
    expect(result.resetAt).toBeGreaterThanOrEqual(nowSec);
    expect(result.resetAt).toBeLessThanOrEqual(nowSec + 31); // window + 1 s Puffer
  });

  it("remaining ist niemals negativ", async () => {
    const ip = "10.0.0.6";
    const req = makeRequest(ip, testPath);
    const opts = { limit: 1, window: 60 };

    // Überschreite das Limit mehrfach
    for (let i = 0; i < 5; i++) {
      const res = await rateLimit(req, opts);
      expect(res.remaining).toBeGreaterThanOrEqual(0);
    }
  });
});

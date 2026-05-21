/**
 * /api/embed — Embedding-API für semantische Anspruchs-Suche
 *
 * POST { text: string } → { embedding: number[] }
 * POST { query: string, threshold?: number, count?: number } → { results: LeistungMatch[] }
 *
 * Verwendet Anthropic claude-3-haiku als Embedding-Proxy (via text-to-embedding trick)
 * oder falls OPENAI_API_KEY vorhanden: text-embedding-3-small.
 * Produktion: lokales Ollama-Modell auf Mittwald (e5-mistral-7b).
 */

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

// Einfacher Embedding-Ansatz: OpenAI text-embedding-3-small (1536 dim)
// Fallback: deterministische Hash-basierte Pseudo-Embeddings für Dev
async function getEmbedding(text: string): Promise<number[]> {
  // Mittwald Ollama (Produktion)
  if (process.env.OLLAMA_EMBED_URL) {
    const res = await fetch(process.env.OLLAMA_EMBED_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "nomic-embed-text", prompt: text }),
    });
    const data = await res.json();
    return data.embedding as number[];
  }

  // OpenAI text-embedding-3-small (Dev/Staging)
  if (process.env.OPENAI_API_KEY) {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
        dimensions: 1536,
      }),
    });
    const data = await res.json();
    return data.data[0].embedding as number[];
  }

  // Fallback: deterministisches Pseudo-Embedding (nur für lokale Entwicklung ohne API-Keys)
  // Erzeugt konsistente 1536-dim Vektoren via String-Hash
  const hash = Array.from(text).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const pseudoEmbedding = Array.from({ length: 1536 }, (_, i) =>
    Math.sin((hash + i) * 0.1) * 0.1
  );
  const norm = Math.sqrt(pseudoEmbedding.reduce((s, v) => s + v * v, 0));
  return pseudoEmbedding.map((v) => v / norm);
}

export async function POST(req: NextRequest) {
  // Rate Limiting
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { success } = await rateLimit(`embed:${ip}`, 30, 60);
  if (!success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Modus 1: Nur Embedding generieren
  if (body.text && !body.query) {
    try {
      const embedding = await getEmbedding(String(body.text).slice(0, 2000));
      return NextResponse.json({ embedding });
    } catch {
      return NextResponse.json({ error: "Embedding failed" }, { status: 500 });
    }
  }

  // Modus 2: Semantische Suche über leistungen_embeddings
  if (body.query) {
    try {
      const embedding = await getEmbedding(String(body.query).slice(0, 500));
      const threshold = typeof body.threshold === "number" ? body.threshold : 0.75;
      const count = typeof body.count === "number" ? Math.min(body.count, 20) : 10;

      const { data, error } = await supabase.rpc("match_leistungen", {
        query_embedding: embedding,
        match_threshold: threshold,
        match_count: count,
      });

      if (error) throw error;

      return NextResponse.json({ results: data ?? [] });
    } catch (err) {
      logger.error("[embed] search error:", err);
      return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Provide either 'text' or 'query'" }, { status: 400 });
}

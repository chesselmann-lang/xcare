import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notarisiereDocument, hashDocument } from "@/lib/blockchain/notarisierung";
import { basename } from "path";
import { logger } from "@/lib/logger";

// POST: Notarisiert ein Dokument (Datei oder Text)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let content: string | ArrayBuffer;
  let fileName = "dokument";
  let dokumentTyp = "allgemein";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const typ = formData.get("dokumentTyp") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Keine Datei übermittelt" }, { status: 400 });
    }

    content = await file.arrayBuffer();
    fileName = basename(file.name).replace(/[^a-zA-Z0-9._-]/g, "_");
    if (typ) dokumentTyp = typ;
  } else if (contentType.includes("application/json")) {
    const body = await request.json();
    content = body.text ?? JSON.stringify(body);
    if (body.dokumentTyp) dokumentTyp = body.dokumentTyp;
    if (body.fileName) fileName = basename(String(body.fileName)).replace(/[^a-zA-Z0-9._-]/g, "_");
  } else {
    content = await request.text();
  }

  const result = await notarisiereDocument(content, {
    dokumentTyp,
    userId: user.id,
    datum: new Date().toISOString(),
  });

  // Persist notarization record
  const { error } = await supabase.from("dokument_notarisierungen").insert([
    {
      user_id: user.id,
      datei_name: fileName,
      dokument_typ: dokumentTyp,
      hash: result.hash,
      blockchain: result.blockchain,
      proof: result.proof,
      notarisiert_am: result.timestamp.toISOString(),
    },
  ]);

  // If table doesn't exist yet, still return the result
  if (error && !error.message.includes("does not exist")) {
    logger.error("Notarisierung DB error:", { error: error });
  }

  return NextResponse.json({
    hash: result.hash,
    timestamp: result.timestamp.toISOString(),
    blockchain: result.blockchain,
    proof: result.proof,
    verificationUrl: result.verificationUrl,
    fileName,
  });
}

// GET: Verify a document hash
export async function GET(request: NextRequest) {
  const hash = request.nextUrl.searchParams.get("hash");
  const file = request.nextUrl.searchParams.get("file");

  if (!hash) {
    return NextResponse.json({ error: "hash Parameter fehlt" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data } = await supabase
    .from("dokument_notarisierungen")
    .select("*")
    .eq("hash", hash)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({
      valid: false,
      message: "Kein Notarisierungseintrag für diesen Hash gefunden.",
    });
  }

  return NextResponse.json({
    valid: true,
    message: "Dokument-Hash gefunden und verifiziert ✓",
    datei_name: data.datei_name,
    notarisiert_am: data.notarisiert_am,
    blockchain: data.blockchain,
  });
}

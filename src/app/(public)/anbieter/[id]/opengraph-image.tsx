/**
 * Dynamic Open Graph image for /anbieter/[id]
 *
 * Rendered by Next.js ImageResponse at build/request time.
 * Output: 1200 × 630 px PNG (Facebook/Twitter/LinkedIn standard).
 *
 * Falls back gracefully if the anbieter is not found or DB is unavailable.
 */
import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function AnbieterOGImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let name = "Anbieter";
  let ort: string | null = null;
  let verifiziert = false;
  let kategorie: string | null = null;
  let sterneDurchschnitt: number | null = null;
  let bewertungenAnzahl = 0;

  try {
    const supabase = await createAdminClient();
    const { data: anbieter } = await supabase
      .from("anbieter")
      .select("name, ort, verifiziert")
      .eq("id", id)
      .single();

    if (anbieter) {
      name = anbieter.name;
      ort = anbieter.ort;
      verifiziert = anbieter.verifiziert;

      // Fetch first leistung category
      const { data: leistungen } = await supabase
        .from("leistungen")
        .select("kategorie")
        .eq("anbieter_id", id)
        .eq("aktiv", true)
        .limit(1)
        .single();
      kategorie = leistungen?.kategorie ?? null;

      // Fetch aggregate rating
      const { data: bewertungen } = await supabase
        .from("bewertungen")
        .select("sterne")
        .eq("anbieter_id", id);

      if (bewertungen && bewertungen.length > 0) {
        bewertungenAnzahl = bewertungen.length;
        sterneDurchschnitt =
          bewertungen.reduce((s, b) => s + b.sterne, 0) / bewertungen.length;
      }
    }
  } catch {
    // Render default card on DB errors
  }

  const kategorieLabelMap: Record<string, string> = {
    pflege_ambulant: "Ambulante Pflege",
    pflege_stationaer: "Stationäre Pflege",
    tagespflege: "Tagespflege",
    kurzzeitpflege: "Kurzzeitpflege",
    kinderbetreuung: "Kinderbetreuung",
    jugendhilfe: "Jugendhilfe",
    eingliederungshilfe: "Eingliederungshilfe",
    hospizdienst: "Hospizdienst",
    trauerhilfe: "Trauerhilfe",
    therapie: "Therapie",
    haushaltshilfe: "Haushaltshilfe",
    beratung: "Beratung",
    foerderung: "Förderung",
    sonstiges: "Sonstige Leistungen",
  };

  const kategorieLabel = kategorie ? (kategorieLabelMap[kategorie] ?? kategorie) : null;
  const stars = sterneDurchschnitt
    ? "★".repeat(Math.round(sterneDurchschnitt)) +
      "☆".repeat(5 - Math.round(sterneDurchschnitt))
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #1a5276 0%, #2980b9 100%)",
          padding: "60px 72px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#ffffff",
        }}
      >
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.15)",
              borderRadius: "8px",
              padding: "6px 16px",
              fontSize: "18px",
              fontWeight: 600,
              letterSpacing: "0.05em",
            }}
          >
            xcare
          </div>
          {verifiziert && (
            <div
              style={{
                background: "#27ae60",
                borderRadius: "8px",
                padding: "6px 14px",
                fontSize: "15px",
                fontWeight: 600,
              }}
            >
              ✓ Verifiziert
            </div>
          )}
        </div>

        {/* Provider name */}
        <div
          style={{
            fontSize: name.length > 40 ? "46px" : "58px",
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: "20px",
            maxWidth: "900px",
          }}
        >
          {name}
        </div>

        {/* Meta row */}
        <div style={{ display: "flex", gap: "32px", alignItems: "center", marginBottom: "auto" }}>
          {ort && (
            <div style={{ fontSize: "24px", opacity: 0.85 }}>
              📍 {ort}
            </div>
          )}
          {kategorieLabel && (
            <div
              style={{
                fontSize: "22px",
                background: "rgba(255,255,255,0.18)",
                borderRadius: "8px",
                padding: "6px 16px",
              }}
            >
              {kategorieLabel}
            </div>
          )}
        </div>

        {/* Rating + Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginTop: "40px",
          }}
        >
          {stars ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ fontSize: "28px", letterSpacing: "2px" }}>{stars}</div>
              <div style={{ fontSize: "18px", opacity: 0.7 }}>
                {sterneDurchschnitt!.toFixed(1)} von 5 · {bewertungenAnzahl}{" "}
                {bewertungenAnzahl === 1 ? "Bewertung" : "Bewertungen"}
              </div>
            </div>
          ) : (
            <div />
          )}
          <div style={{ fontSize: "18px", opacity: 0.55 }}>xcare.de · Das digitale Pflege-Ökosystem</div>
        </div>
      </div>
    ),
    { ...size }
  );
}

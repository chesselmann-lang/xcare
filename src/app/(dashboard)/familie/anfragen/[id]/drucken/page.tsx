import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { DruckenTrigger } from "./DruckenTrigger";

const lebenslageLabel: Record<string, string> = {
  geburt_fruehe_kindheit: "Geburt & frühe Kindheit",
  schulkind_jugend: "Schulkind & Jugend",
  eingliederung_behinderung: "Eingliederung & Behinderung",
  erwerbsleben_vereinbarkeit: "Erwerbsleben & Vereinbarkeit",
  krankheit_genesung: "Krankheit & Genesung",
  alter_pflege: "Alter & Pflege",
  hospiz_palliativ: "Hospiz & Palliativ",
  trauer_nachlass: "Trauer & Nachlass",
};

const statusLabel: Record<string, string> = {
  offen: "Offen",
  in_bearbeitung: "In Bearbeitung",
  angeboten: "Angebot erhalten",
  bestaetigt: "Bestätigt",
  abgelehnt: "Abgelehnt",
  abgeschlossen: "Abgeschlossen",
};

export default async function DruckenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "familie") redirect("/anbieter/dashboard");

  const { data: anfrage } = await supabase
    .from("anfragen")
    .select("*, anbieter(name, telefon, email, website, plz, ort, strasse), leistungen(name)")
    .eq("id", id)
    .eq("familie_id", profile.id)
    .single();

  if (!anfrage) notFound();

  const { data: historie } = await supabase
    .from("anfragen_historie")
    .select("alter_status, neuer_status, notiz, created_at")
    .eq("anfrage_id", id)
    .order("created_at", { ascending: true });

  const anbieter = anfrage.anbieter as {
    name: string; telefon: string | null; email: string | null;
    website: string | null; plz: string | null; ort: string | null; strasse: string | null;
  } | null;

  const leistung = anfrage.leistungen as { name: string } | null;
  const printDate = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <html lang="de">
      <head>
        <meta charSet="utf-8" />
        <title>{`xcare – Anfrage ${lebenslageLabel[anfrage.lebenslage] ?? anfrage.lebenslage}`}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 12pt;
            color: #1a1a1a;
            background: white;
            padding: 20mm 20mm 20mm 20mm;
            line-height: 1.5;
          }
          @page {
            size: A4;
            margin: 20mm;
          }
          @media print {
            .no-print { display: none !important; }
            body { padding: 0; }
          }

          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #1A5276; }
          .logo { font-size: 24pt; font-weight: 800; color: #1A5276; letter-spacing: -1px; }
          .logo span { color: #2ECC71; }
          .print-date { font-size: 9pt; color: #666; text-align: right; }

          h1 { font-size: 18pt; font-weight: 700; color: #1A5276; margin-bottom: 4px; }
          h2 { font-size: 12pt; font-weight: 600; color: #1a1a1a; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }

          .meta { font-size: 10pt; color: #555; margin-bottom: 24px; }

          .section { margin-bottom: 20px; }
          .label { font-size: 8pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin-bottom: 2px; }
          .value { font-size: 11pt; color: #1a1a1a; }
          .value.beschreibung { font-size: 10pt; color: #333; line-height: 1.6; white-space: pre-wrap; }

          .status-badge {
            display: inline-block;
            padding: 2px 10px;
            border-radius: 99px;
            font-size: 9pt;
            font-weight: 600;
            background: #e8f5e9;
            color: #2e7d32;
            border: 1px solid #c8e6c9;
          }

          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }

          .ki-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px 12px; margin-bottom: 20px; }
          .ki-box .ki-label { font-size: 8pt; font-weight: 700; color: #1d4ed8; margin-bottom: 4px; }
          .ki-box .ki-text { font-size: 10pt; color: #1e3a8a; line-height: 1.5; }

          .timeline { margin-top: 4px; }
          .timeline-item { display: flex; gap: 10px; margin-bottom: 10px; }
          .timeline-dot { width: 8px; height: 8px; border-radius: 50%; background: #1A5276; margin-top: 5px; flex-shrink: 0; }
          .timeline-content .tl-date { font-size: 8pt; color: #888; }
          .timeline-content .tl-text { font-size: 10pt; }

          .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 8pt; color: #999; text-align: center; }

          .print-btn {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: #1A5276;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 10px 20px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 1000;
          }
          .print-btn:hover { background: #154360; }
        `}</style>
      </head>
      <body>
        <DruckenTrigger />

        {/* Print button (screen only) */}
        <button className="print-btn no-print" onClick={() => window.print()}>
          📄 Als PDF speichern
        </button>

        {/* Header */}
        <div className="header">
          <div>
            <div className="logo">x<span>care</span></div>
            <div style={{ fontSize: "9pt", color: "#666", marginTop: "2px" }}>Pflege-Ökosystem für Deutschland</div>
          </div>
          <div className="print-date">
            <div style={{ fontWeight: 600 }}>Anfrage-Dokumentation</div>
            <div>Erstellt: {printDate}</div>
          </div>
        </div>

        {/* Title */}
        <h1>{lebenslageLabel[anfrage.lebenslage] ?? anfrage.lebenslage.replace(/_/g, " ")}</h1>
        <div className="meta">
          Anfrage vom {formatDate(anfrage.created_at)}
          {leistung && <> · Leistung: {leistung.name}</>}
          {" "}· Status: <span className="status-badge">{statusLabel[anfrage.status] ?? anfrage.status}</span>
        </div>

        {/* Anbieter & Familie nebeneinander */}
        <div className="grid-2">
          {anbieter && (
            <div className="section">
              <h2>Anbieter</h2>
              <div className="label">Name</div>
              <div className="value" style={{ marginBottom: 8 }}>{anbieter.name}</div>
              {(anbieter.plz || anbieter.ort) && (
                <>
                  <div className="label">Adresse</div>
                  <div className="value" style={{ marginBottom: 8 }}>
                    {anbieter.strasse && <>{anbieter.strasse}<br /></>}
                    {anbieter.plz} {anbieter.ort}
                  </div>
                </>
              )}
              {anbieter.telefon && (
                <>
                  <div className="label">Telefon</div>
                  <div className="value" style={{ marginBottom: 8 }}>{anbieter.telefon}</div>
                </>
              )}
              {anbieter.email && (
                <>
                  <div className="label">E-Mail</div>
                  <div className="value" style={{ marginBottom: 8 }}>{anbieter.email}</div>
                </>
              )}
            </div>
          )}

          <div className="section">
            <h2>Kontaktdaten</h2>
            <div className="label">Name</div>
            <div className="value" style={{ marginBottom: 8 }}>
              {profile.vorname ?? ""} {profile.nachname ?? ""}
            </div>
            {(profile.plz || profile.ort) && (
              <>
                <div className="label">Wohnort</div>
                <div className="value" style={{ marginBottom: 8 }}>{profile.plz} {profile.ort}</div>
              </>
            )}
            {profile.telefon && (
              <>
                <div className="label">Telefon</div>
                <div className="value" style={{ marginBottom: 8 }}>{profile.telefon}</div>
              </>
            )}
          </div>
        </div>

        {/* Anfrage-Beschreibung */}
        <div className="section">
          <h2>Beschreibung der Anfrage</h2>
          <div className="label">Lebenslage</div>
          <div className="value" style={{ marginBottom: 8 }}>
            {lebenslageLabel[anfrage.lebenslage] ?? anfrage.lebenslage}
          </div>
          <div className="label">Schilderung</div>
          <div className="value beschreibung">{anfrage.beschreibung}</div>
        </div>

        {/* KI-Empfehlung */}
        {anfrage.ki_empfehlung && (
          <div className="ki-box">
            <div className="ki-label">💡 KI-Empfehlung von xcare</div>
            <div className="ki-text">{anfrage.ki_empfehlung}</div>
          </div>
        )}

        {/* Verlauf */}
        {historie && historie.length > 0 && (
          <div className="section">
            <h2>Statusverlauf</h2>
            <div className="timeline">
              <div className="timeline-item">
                <div className="timeline-dot" />
                <div className="timeline-content">
                  <div className="tl-date">{formatDate(anfrage.created_at)}</div>
                  <div className="tl-text">Anfrage erstellt</div>
                </div>
              </div>
              {historie.map((h, i) => (
                <div key={i} className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <div className="tl-date">{formatDate(h.created_at)}</div>
                    <div className="tl-text">
                      Status: {statusLabel[h.neuer_status] ?? h.neuer_status}
                      {h.notiz && <> – {h.notiz}</>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Zeitstempel */}
        <div className="section">
          <h2>Zeitstempel</h2>
          <div className="grid-2">
            <div>
              <div className="label">Erstellt</div>
              <div className="value">{formatDate(anfrage.created_at)}</div>
            </div>
            <div>
              <div className="label">Zuletzt aktualisiert</div>
              <div className="value">{formatDate(anfrage.updated_at)}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="footer">
          Dieses Dokument wurde automatisch von xcare · xcare.de generiert.
          Es dient der persönlichen Dokumentation und hat keinen rechtlichen Charakter.
        </div>
      </body>
    </html>
  );
}

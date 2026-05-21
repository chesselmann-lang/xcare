import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validate";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  return {
    title: "Bewertungs-Widget – xcare",
    robots: { index: false, follow: false },
  };
}

function Stars({ value }: { value: number }) {
  return (
    <span aria-label={`${value} von 5 Sternen`} style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={s <= value ? "#f59e0b" : "#e5e7eb"}
          aria-hidden
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

export default async function BewertungsWidgetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();

  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("id, name")
    .eq("id", id)
    .single();

  if (!anbieter) notFound();

  const { data: rows } = await supabase
    .from("bewertungen")
    .select("sterne, kommentar, created_at")
    .eq("anbieter_id", id)
    .eq("moderiert", true)
    .order("created_at", { ascending: false })
    .limit(5);

  const bewertungen = rows ?? [];
  const anzahl = bewertungen.length;
  const durchschnitt =
    anzahl > 0
      ? Math.round((bewertungen.reduce((s, r) => s + r.sterne, 0) / anzahl) * 10) / 10
      : 0;

  const profileUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://xcare.de"}/anbieter/${id}`;

  return (
    <html lang="de">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: #ffffff;
            color: #111827;
            font-size: 14px;
            padding: 12px 16px;
          }
          .header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
          .score { font-size: 28px; font-weight: 700; color: #111827; line-height: 1; }
          .meta { font-size: 12px; color: #6b7280; margin-top: 2px; }
          .reviews { margin-top: 10px; display: flex; flex-direction: column; gap: 8px; }
          .review { border-top: 1px solid #f3f4f6; padding-top: 8px; }
          .review-text { color: #374151; margin-top: 3px; line-height: 1.4; }
          .badge {
            display: block; margin-top: 12px; text-align: center;
            font-size: 11px; color: #9ca3af; text-decoration: none;
          }
          .badge:hover { color: #6b7280; }
          .empty { color: #9ca3af; font-size: 13px; padding: 8px 0; }
        `}</style>
      </head>
      <body>
        <div className="header">
          <div>
            {anzahl > 0 ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="score">{durchschnitt.toFixed(1)}</span>
                  <Stars value={Math.round(durchschnitt)} />
                </div>
                <p className="meta">{anzahl} Bewertung{anzahl !== 1 ? "en" : ""} · {anbieter.name}</p>
              </>
            ) : (
              <p className="empty">Noch keine Bewertungen.</p>
            )}
          </div>
        </div>

        {bewertungen.length > 0 && (
          <div className="reviews">
            {bewertungen.filter((b) => b.kommentar).slice(0, 3).map((b, i) => (
              <div key={i} className="review">
                <Stars value={b.sterne} />
                <p className="review-text">{b.kommentar}</p>
              </div>
            ))}
          </div>
        )}

        <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="badge">
          Auf xcare ansehen →
        </a>
      </body>
    </html>
  );
}

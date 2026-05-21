import { Metadata } from "next";
import { MapPin, Clock, Phone } from "lucide-react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://xcare.de";

export const metadata: Metadata = {
  title: "Apotheken in der Nähe | xcare",
  description: "Finden Sie Apotheken in Ihrer Nähe — einfach PLZ eingeben.",
  alternates: { canonical: `${APP_URL}/apotheken` },
  openGraph: { url: `${APP_URL}/apotheken`, type: "website" },
};

interface OverpassNode {
  id: number;
  lat: number;
  lon: number;
  tags?: {
    name?: string;
    "addr:street"?: string;
    "addr:housenumber"?: string;
    "addr:city"?: string;
    "addr:postcode"?: string;
    phone?: string;
    "opening_hours"?: string;
  };
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

async function sucheApotheken(plz: string): Promise<{
  apotheken: OverpassNode[];
  ort: string;
  error?: string;
}> {
  // 1. PLZ zu Koordinaten via Nominatim
  let lat: number;
  let lon: number;
  let ort = plz;

  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(plz)}&country=de&format=json&limit=1`;
    const nominatimRes = await fetch(nominatimUrl, {
      headers: { "User-Agent": "xcare/1.0 (support@xcare.de)" },
      next: { revalidate: 3600 },
    });
    if (!nominatimRes.ok) throw new Error("Geocoding fehlgeschlagen");
    const nominatimData = (await nominatimRes.json()) as NominatimResult[];
    if (!nominatimData.length) {
      return { apotheken: [], ort: plz, error: "PLZ nicht gefunden. Bitte prüfen Sie Ihre Eingabe." };
    }
    lat = parseFloat(nominatimData[0].lat);
    lon = parseFloat(nominatimData[0].lon);
    ort = nominatimData[0].display_name.split(",")[0];
  } catch {
    return { apotheken: [], ort: plz, error: "Geocoding-Fehler. Bitte versuchen Sie es später erneut." };
  }

  // 2. Apotheken via Overpass-API
  try {
    const overpassQuery = `[out:json][timeout:10];node["amenity"="pharmacy"](around:5000,${lat},${lon});out;`;
    const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
    const overpassRes = await fetch(overpassUrl, {
      next: { revalidate: 1800 },
    });
    if (!overpassRes.ok) throw new Error("Overpass-Fehler");
    const overpassData = (await overpassRes.json()) as { elements: OverpassNode[] };
    return { apotheken: overpassData.elements ?? [], ort };
  } catch {
    return { apotheken: [], ort, error: "Apotheken-Suche momentan nicht verfügbar." };
  }
}

export default async function ApthekenPage({
  searchParams,
}: {
  searchParams: Promise<{ plz?: string }>;
}) {
  const { plz } = await searchParams;
  const suchePLZ = plz?.trim().replace(/\D/g, "").slice(0, 5);

  let ergebnis: Awaited<ReturnType<typeof sucheApotheken>> | null = null;
  if (suchePLZ && suchePLZ.length === 5) {
    ergebnis = await sucheApotheken(suchePLZ);
  }

  return (
    <div className="min-h-screen bg-[--background]">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[--foreground] flex items-center gap-2">
            <MapPin className="h-7 w-7 text-[--primary]" />
            Apotheken in der Nähe
          </h1>
          <p className="text-[--muted-foreground] mt-2">
            Geben Sie Ihre Postleitzahl ein, um Apotheken in einem Umkreis von 5 km zu finden.
          </p>
        </div>

        {/* Suchformular */}
        <form method="GET" className="flex gap-2 mb-8">
          <input
            type="text"
            name="plz"
            defaultValue={suchePLZ ?? ""}
            placeholder="Ihre PLZ, z.B. 10115"
            maxLength={5}
            pattern="[0-9]{5}"
            className="flex-1 rounded-xl border border-[--border] bg-[--background] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary] font-mono"
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-[--primary] text-white font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Suchen
          </button>
        </form>

        {/* Fehler */}
        {ergebnis?.error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 mb-6">
            {ergebnis.error}
          </div>
        )}

        {/* Ergebnisse */}
        {ergebnis && !ergebnis.error && (
          <>
            <p className="text-sm text-[--muted-foreground] mb-4">
              {ergebnis.apotheken.length === 0
                ? `Keine Apotheken in der Nähe von ${ergebnis.ort} gefunden.`
                : `${ergebnis.apotheken.length} Apotheke${ergebnis.apotheken.length !== 1 ? "n" : ""} in der Nähe von ${ergebnis.ort} gefunden:`}
            </p>

            <div className="space-y-3">
              {ergebnis.apotheken.map((a) => {
                const tags = a.tags ?? {};
                const adresse = [
                  tags["addr:street"] && tags["addr:housenumber"]
                    ? `${tags["addr:street"]} ${tags["addr:housenumber"]}`
                    : tags["addr:street"],
                  tags["addr:postcode"] && tags["addr:city"]
                    ? `${tags["addr:postcode"]} ${tags["addr:city"]}`
                    : tags["addr:city"],
                ]
                  .filter(Boolean)
                  .join(", ");

                return (
                  <div
                    key={a.id}
                    className="p-4 rounded-xl border border-[--border] bg-[--card] hover:border-[--primary]/40 transition-colors"
                  >
                    <p className="font-medium text-[--foreground]">
                      {tags.name ?? "Apotheke"}
                    </p>
                    {adresse && (
                      <p className="text-sm text-[--muted-foreground] mt-1 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {adresse}
                      </p>
                    )}
                    {tags.phone && (
                      <p className="text-sm text-[--muted-foreground] mt-0.5 flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <a href={`tel:${tags.phone}`} className="hover:text-[--primary]">
                          {tags.phone}
                        </a>
                      </p>
                    )}
                    {tags["opening_hours"] && (
                      <p className="text-sm text-[--muted-foreground] mt-0.5 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        {tags["opening_hours"]}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <p className="mt-8 text-xs text-[--muted-foreground]">
          Daten: OpenStreetMap-Mitwirkende (ODbL). Kein Anspruch auf Vollständigkeit.
        </p>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";

// German PLZ to rough coordinates mapping (major cities)
const PLZ_COORDS: Record<string, [number, number]> = {
  "10": [13.405, 52.52],   // Berlin
  "20": [10.00, 53.55],    // Hamburg
  "80": [11.576, 48.137],  // München
  "50": [6.961, 50.937],   // Köln
  "60": [8.682, 50.110],   // Frankfurt
  "70": [9.177, 48.782],   // Stuttgart
  "30": [9.739, 52.374],   // Hannover
  "40": [6.782, 51.228],   // Düsseldorf
  "01": [13.741, 51.050],  // Dresden
  "04": [12.375, 51.340],  // Leipzig
  "28": [8.805, 53.075],   // Bremen
  "90": [11.077, 49.450],  // Nürnberg
};

function getCoords(plz: string): [number, number] {
  const prefix = plz?.slice(0, 2) || "10";
  const base = PLZ_COORDS[prefix] || [10.5, 51.3];
  // Add small random offset so markers don't stack
  return [base[0] + (Math.random() - 0.5) * 0.2, base[1] + (Math.random() - 0.5) * 0.15];
}

interface Anbieter {
  id: string;
  vorname: string;
  nachname: string;
  beschreibung: string | null;
  plz: string | null;
  ort: string | null;
  rolle: string;
  avatar_url: string | null;
}

export function PflegeatlasClient({ anbieter }: { anbieter: Anbieter[] }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const [selectedAnbieter, setSelectedAnbieter] = useState<Anbieter | null>(null);
  const [filter, setFilter] = useState("");
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainer.current || mapRef.current) return;

      const maplibregl = (await import("maplibre-gl")).default;
      // Import CSS dynamically — ignore if it fails in some bundler configs
      await import("maplibre-gl/dist/maplibre-gl.css").catch(() => {});

      if (!isMounted) return;

      const map = new maplibregl.Map({
        container: mapContainer.current!,
        style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
        center: [10.5, 51.3],
        zoom: 6,
      });

      mapRef.current = map;

      map.on("load", () => {
        if (!isMounted) return;
        setMapLoaded(true);

        // Add markers for each Anbieter
        anbieter.forEach((a) => {
          if (!a.plz) return;
          const coords = getCoords(a.plz);

          const el = document.createElement("div");
          el.style.cssText =
            "width:32px;height:32px;border-radius:50%;background:#2563eb;border:2px solid white;" +
            "box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;" +
            "justify-content:center;cursor:pointer;transition:background 0.15s;";
          el.title = `${a.vorname} ${a.nachname}`;

          const initial = document.createElement("span");
          initial.style.cssText = "color:white;font-size:11px;font-weight:700;";
          initial.textContent = (a.vorname?.[0] || "?").toUpperCase();
          el.appendChild(initial);

          el.addEventListener("mouseenter", () => {
            el.style.background = "#1d4ed8";
          });
          el.addEventListener("mouseleave", () => {
            el.style.background = "#2563eb";
          });
          el.addEventListener("click", () => {
            if (isMounted) setSelectedAnbieter(a);
          });

          new maplibregl.Marker({ element: el })
            .setLngLat(coords)
            .addTo(map as any);
        });
      });
    }

    initMap();
    return () => {
      isMounted = false;
    };
  }, [anbieter]);

  const filteredAnbieter = anbieter.filter(
    (a) =>
      !filter ||
      `${a.vorname} ${a.nachname} ${a.plz} ${a.ort}`
        .toLowerCase()
        .includes(filter.toLowerCase())
  );

  return (
    <div className="relative h-full">
      {/* Map canvas */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Search overlay */}
      <div className="absolute top-4 left-4 z-10 w-80 bg-white rounded-xl shadow-lg p-3">
        <input
          type="text"
          placeholder="PLZ, Ort oder Name suchen..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {filter && (
          <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
            {filteredAnbieter.slice(0, 10).map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedAnbieter(a)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm transition-colors"
              >
                <div className="font-medium text-gray-900">
                  {a.vorname} {a.nachname}
                </div>
                <div className="text-gray-400 text-xs">
                  {a.plz} {a.ort}
                </div>
              </button>
            ))}
            {filteredAnbieter.length === 0 && (
              <p className="text-sm text-gray-400 px-3 py-2">
                Keine Ergebnisse
              </p>
            )}
          </div>
        )}
      </div>

      {/* Selected anbieter detail panel */}
      {selectedAnbieter && (
        <div className="absolute top-4 right-4 z-10 w-72 bg-white rounded-xl shadow-lg p-4">
          <button
            onClick={() => setSelectedAnbieter(null)}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
            aria-label="Schließen"
          >
            ✕
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg flex-shrink-0">
              {(selectedAnbieter.vorname?.[0] || "?").toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-gray-900 truncate">
                {selectedAnbieter.vorname} {selectedAnbieter.nachname}
              </div>
              <div className="text-sm text-gray-500">
                {selectedAnbieter.plz} {selectedAnbieter.ort}
              </div>
            </div>
          </div>
          {selectedAnbieter.beschreibung && (
            <p className="text-sm text-gray-600 mb-3 leading-relaxed">
              {selectedAnbieter.beschreibung.slice(0, 120)}
              {selectedAnbieter.beschreibung.length > 120 ? "…" : ""}
            </p>
          )}
          <a
            href={`/familie/pflegeboerse?anbieter=${selectedAnbieter.id}`}
            className="block w-full text-center bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Jetzt buchen →
          </a>
        </div>
      )}

      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-600 text-sm">Karte wird geladen…</p>
          </div>
        </div>
      )}
    </div>
  );
}

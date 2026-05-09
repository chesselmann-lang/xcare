"use client";

import { useEffect, useRef } from "react";

interface MapAnbieter {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  ort: string | null;
  plz: string | null;
  verifiziert: boolean;
}

interface Props {
  anbieter: MapAnbieter[];
  center?: [number, number];
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    L: any;
  }
}

export function KartenAnsicht({ anbieter, center = [51.1657, 10.4515] }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    function initMap() {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (!mapRef.current) return;

      const L = window.L;
      const map = L.map(mapRef.current, { zoomControl: true }).setView(center, 6);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      const withCoords = anbieter.filter((a) => a.lat != null && a.lng != null);
      withCoords.forEach((a) => {
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:28px;height:28px;
            background:${a.verifiziert ? "#1A5276" : "#6c757d"};
            border:2px solid white;border-radius:50%;
            box-shadow:0 2px 4px rgba(0,0,0,.3);
            display:flex;align-items:center;justify-content:center;
            color:white;font-size:11px;font-weight:700;
          ">${a.name.charAt(0)}</div>`,
          iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -16],
        });
        L.marker([a.lat!, a.lng!], { icon }).addTo(map).bindPopup(`
          <div style="min-width:160px;font-family:system-ui,sans-serif;">
            <p style="font-weight:600;margin:0 0 4px;font-size:13px;">${a.name}</p>
            <p style="font-size:11px;color:#666;margin:0 0 8px;">${a.plz ?? ""} ${a.ort ?? ""}</p>
            ${a.verifiziert ? '<span style="font-size:10px;background:#d4edda;color:#155724;padding:2px 6px;border-radius:999px;">✓ Verifiziert</span>' : ""}
            <br/><a href="/anbieter/${a.id}" style="font-size:11px;color:#1A5276;text-decoration:underline;display:inline-block;margin-top:6px;">Profil ansehen →</a>
          </div>
        `);
      });

      if (withCoords.length > 0) {
        const group = L.featureGroup(withCoords.map((a) => L.marker([a.lat!, a.lng!])));
        map.fitBounds(group.getBounds().pad(0.2));
      }
    }

    if (window.L) {
      initMap();
    } else {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => initMap();
      document.head.appendChild(script);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anbieter.map((a) => a.id).join(",")]);

  const withCoords = anbieter.filter((a) => a.lat != null && a.lng != null);

  return (
    <div className="relative">
      <div
        ref={mapRef}
        className="w-full rounded-xl overflow-hidden border border-[--border]"
        style={{ height: "480px" }}
        aria-label="Kartenansicht der Anbieter"
        role="application"
      />
      {withCoords.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-[--muted] rounded-xl border border-[--border]">
          <div className="text-center text-[--muted-foreground]">
            <p className="text-sm font-medium mb-1">Keine Koordinaten verfügbar</p>
            <p className="text-xs">Koordinaten werden aus dem Anbieter-Profil gelesen</p>
          </div>
        </div>
      )}
      <div className="absolute bottom-3 left-3 z-[1000] bg-[--card]/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-[--muted-foreground] shadow">
        {withCoords.length} von {anbieter.length} Anbietern mit Standort
      </div>
    </div>
  );
}

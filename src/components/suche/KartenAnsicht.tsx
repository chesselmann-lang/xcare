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

interface LeafletIcon {
  className: string;
  html: string;
  iconSize: [number, number];
  iconAnchor: [number, number];
  popupAnchor: [number, number];
}

interface LeafletMarker {
  addTo(map: LeafletMap): LeafletMarker;
  bindPopup(html: string): LeafletMarker;
}

interface LeafletLayer {
  addTo(map: LeafletMap): LeafletLayer;
}

interface LeafletFeatureGroup {
  getBounds(): LeafletBounds;
}

interface LeafletBounds {
  pad(amount: number): LeafletBounds;
  isValid(): boolean;
}

interface LeafletMap {
  remove(): void;
  setView(center: [number, number], zoom: number): LeafletMap;
  fitBounds(bounds: LeafletBounds): LeafletMap;
  addLayer(layer: LeafletLayer): void;
}

interface LeafletClusterGroup extends LeafletLayer {
  addLayer(marker: LeafletMarker): void;
  getLayers(): LeafletMarker[];
}

interface LeafletStatic {
  map(el: HTMLElement, options?: Record<string, unknown>): LeafletMap;
  tileLayer(url: string, options: Record<string, unknown>): LeafletLayer;
  marker(latlng: [number, number], options?: { icon?: LeafletIcon }): LeafletMarker;
  divIcon(options: LeafletIcon): LeafletIcon;
  featureGroup(layers: LeafletMarker[]): LeafletFeatureGroup;
  markerClusterGroup(options?: Record<string, unknown>): LeafletClusterGroup;
}

declare global {
  interface Window {
    L: LeafletStatic;
  }
}

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const CLUSTER_CSS = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css";
const CLUSTER_DEFAULT_CSS = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css";
const CLUSTER_JS = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
}

function loadLink(href: string) {
  if (!document.querySelector(`link[href="${href}"]`)) {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    document.head.appendChild(l);
  }
}

async function loadLeafletWithClustering(): Promise<void> {
  loadLink(LEAFLET_CSS);
  loadLink(CLUSTER_CSS);
  loadLink(CLUSTER_DEFAULT_CSS);
  await loadScript(LEAFLET_JS);
  await loadScript(CLUSTER_JS);
}

export function KartenAnsicht({ anbieter, center = [51.1657, 10.4515] }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const el = mapRef.current;

    async function initMap() {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (!el) return;

      await loadLeafletWithClustering();

      const L = window.L;
      const map = L.map(el, { zoomControl: true }).setView(center, 6);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      const withCoords = anbieter.filter((a) => a.lat != null && a.lng != null);

      // Use clustering when more than 1 marker; fallback to plain markers for single
      const clusterGroup = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 60,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: (cluster: { getChildCount: () => number }) => {
          const count = cluster.getChildCount();
          const size = count < 10 ? 36 : count < 100 ? 44 : 52;
          return window.L.divIcon({
            html: `<div style="
              width:${size}px;height:${size}px;
              background:#1A5276;
              border:3px solid rgba(255,255,255,0.9);
              border-radius:50%;
              box-shadow:0 2px 8px rgba(0,0,0,.3);
              display:flex;align-items:center;justify-content:center;
              color:white;font-size:13px;font-weight:700;
            ">${count}</div>`,
            className: "",
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
            popupAnchor: [0, -(size / 2 + 4)],
          });
        },
      });

      withCoords.forEach((a) => {
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:30px;height:30px;
            background:${a.verifiziert ? "#1A5276" : "#6c757d"};
            border:2.5px solid white;border-radius:50%;
            box-shadow:0 2px 5px rgba(0,0,0,.35);
            display:flex;align-items:center;justify-content:center;
            color:white;font-size:11px;font-weight:700;
          ">${a.name.charAt(0).toUpperCase()}</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          popupAnchor: [0, -18],
        });

        const marker = L.marker([a.lat!, a.lng!], { icon });
        marker.bindPopup(`
          <div style="min-width:170px;font-family:system-ui,sans-serif;line-height:1.4;">
            <p style="font-weight:700;margin:0 0 3px;font-size:13px;color:#1a1a1a;">${a.name}</p>
            <p style="font-size:11px;color:#666;margin:0 0 8px;">${a.plz ?? ""} ${a.ort ?? ""}</p>
            ${a.verifiziert
              ? '<span style="font-size:10px;background:#d4edda;color:#155724;padding:2px 7px;border-radius:999px;display:inline-block;margin-bottom:8px;">✓ Verifiziert</span>'
              : ''}
            <br/>
            <a href="/anbieter/${a.id}" style="
              display:inline-block;margin-top:4px;
              font-size:11px;color:#fff;
              background:#1A5276;padding:4px 10px;border-radius:6px;
              text-decoration:none;font-weight:600;
            ">Profil ansehen →</a>
          </div>
        `);
        clusterGroup.addLayer(marker);
      });

      map.addLayer(clusterGroup);

      // Fit bounds if we have markers
      if (withCoords.length > 0) {
        const boundsGroup = L.featureGroup(
          withCoords.map((a) => L.marker([a.lat!, a.lng!]))
        );
        const bounds = boundsGroup.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds.pad(0.15));
        }
      }
    }

    initMap();

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
        aria-label="Kartenansicht der Anbieter mit Cluster-Gruppierung"
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
      <div className="absolute bottom-3 left-3 z-[1000] bg-[--card]/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-[--muted-foreground] shadow flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#1A5276]" />
        {withCoords.length} von {anbieter.length} Anbietern mit Standort
        {withCoords.length > 5 && (
          <span className="ml-1 opacity-70">· Zoom zum Aufklappen</span>
        )}
      </div>
    </div>
  );
}

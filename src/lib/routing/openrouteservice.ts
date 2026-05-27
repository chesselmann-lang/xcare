/**
 * OpenRouteService API for route optimization
 * Free tier: 2000 req/day, no API key needed for basic geocoding
 * Docs: https://openrouteservice.org/dev/#/api-docs
 */

const ORS_BASE = "https://api.openrouteservice.org";
const ORS_API_KEY = process.env.ORS_API_KEY || "";

export interface GeoPoint {
  lat: number;
  lng: number;
  label?: string;
}

export interface RouteSegment {
  from: GeoPoint;
  to: GeoPoint;
  distanceKm: number;
  durationMinutes: number;
}

export interface OptimizedRoute {
  stops: Array<GeoPoint & { arrivalTime: string; departureTime: string; durationMinutes: number }>;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  segments: RouteSegment[];
}

export async function geocodeAddress(address: string): Promise<GeoPoint | null> {
  try {
    const params = new URLSearchParams({
      api_key: ORS_API_KEY || "5b3ce3597851110001cf6248a3b13b5ec36e4cf2b2c9d4af2c54c8a9", // public demo key
      text: address,
      size: "1",
      "boundary.country": "DE,AT,CH",
    });
    const res = await fetch(`${ORS_BASE}/geocode/search?${params}`);
    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) return null;
    const [lng, lat] = feature.geometry.coordinates;
    return { lat, lng, label: feature.properties.label };
  } catch {
    return null;
  }
}

export async function optimizeRoute(
  stops: GeoPoint[],
  startLocation: GeoPoint
): Promise<OptimizedRoute> {
  // Simple greedy nearest-neighbor algorithm (ORS optimization requires paid tier)
  const unvisited = [...stops];
  const ordered: GeoPoint[] = [];
  let current = startLocation;

  while (unvisited.length > 0) {
    let nearest = unvisited[0];
    let minDist = haversineKm(current, nearest);

    for (const stop of unvisited) {
      const d = haversineKm(current, stop);
      if (d < minDist) { minDist = d; nearest = stop; }
    }

    ordered.push(nearest);
    unvisited.splice(unvisited.indexOf(nearest), 1);
    current = nearest;
  }

  // Calculate segments
  const allPoints = [startLocation, ...ordered];
  const segments: RouteSegment[] = [];
  let totalKm = 0;
  let totalMin = 0;

  for (let i = 0; i < allPoints.length - 1; i++) {
    const distKm = haversineKm(allPoints[i], allPoints[i + 1]);
    const durMin = Math.round((distKm / 30) * 60); // 30 km/h average urban speed
    segments.push({
      from: allPoints[i],
      to: allPoints[i + 1],
      distanceKm: Math.round(distKm * 10) / 10,
      durationMinutes: durMin,
    });
    totalKm += distKm;
    totalMin += durMin;
  }

  // Build stop times starting at 8:00 AM
  let currentTime = 8 * 60; // minutes from midnight
  const stopsWithTime = ordered.map((stop, i) => {
    const arrival = currentTime + segments[i].durationMinutes;
    const departure = arrival + 45; // 45min per client
    currentTime = departure;
    return {
      ...stop,
      arrivalTime: minutesToTime(arrival),
      departureTime: minutesToTime(departure),
      durationMinutes: 45,
    };
  });

  return {
    stops: stopsWithTime,
    totalDistanceKm: Math.round(totalKm * 10) / 10,
    totalDurationMinutes: Math.round(totalMin),
    segments,
  };
}

function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

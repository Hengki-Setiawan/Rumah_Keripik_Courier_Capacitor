import { optimizeStopOrder, twoOptImprove, orOptImprove } from './tsp';
import { optimizeWithOrs, fetchDirectionsGeometry, fetchDistanceMatrix } from './orsClient';
import { fetchOsrmRoute } from './osrmClient';
import { haversineMeters } from './distance';
import { getCachedRoute, setCachedRoute } from './routeCache';
import { WAREHOUSE, type RouteWaypoint, type OptimizedRoute, type RouteLegGeometry } from './types';

const ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY as string | undefined;

function toLatLng(w: RouteWaypoint): { lat: number; lng: number } {
  return { lat: w.lat, lng: w.lng };
}

async function fetchLegsSequentially(orderedStops: RouteWaypoint[]): Promise<RouteLegGeometry[]> {
  const points = [WAREHOUSE, ...orderedStops.map(toLatLng)];
  const legs: RouteLegGeometry[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    try {
      if (ORS_API_KEY) {
        legs.push(await fetchDirectionsGeometry(points[i], points[i + 1], ORS_API_KEY));
      } else {
        legs.push(await fetchOsrmRoute(points[i], points[i + 1]));
      }
    } catch {
      legs.push(straightLineLeg(points[i], points[i + 1]));
    }
  }
  return legs;
}

function straightLineLeg(a: { lat: number; lng: number }, b: { lat: number; lng: number }): RouteLegGeometry {
  return {
    coordinates: [[a.lng, a.lat], [b.lng, b.lat]],
    distanceMeters: haversineMeters(a, b),
    durationSeconds: 0,
  };
}

function straightLineLegs(orderedStops: RouteWaypoint[]): RouteLegGeometry[] {
  const points = [WAREHOUSE, ...orderedStops.map(toLatLng)];
  const legs: RouteLegGeometry[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    legs.push(straightLineLeg(points[i], points[i + 1]));
  }
  return legs;
}

function buildCacheKey(stops: RouteWaypoint[]): string {
  return stops.map((s) => s.deliveryId).sort().join('|');
}

/**
 * Upgrade akurasi (blueprint §4.5): saat online dengan ORS key, matriks jarak jalan asli
 * dari ORS Matrix menggantikan Haversine, lalu 2-opt + Or-opt dijalankan ulang di atasnya.
 * Mengembalikan null jika gagal/offline, sehingga pemanggil memakai hasil heuristik lokal.
 */
async function improveOrderWithRoadMatrix(
  orderedStops: RouteWaypoint[],
  apiKey: string,
): Promise<RouteWaypoint[] | null> {
  if (orderedStops.length < 2) return null;
  const points = [WAREHOUSE, ...orderedStops.map(toLatLng)];
  try {
    const { distances } = await fetchDistanceMatrix(points, apiKey);
    if (!distances || distances.length !== points.length) return null;
    const initialOrder = Array.from({ length: points.length }, (_, i) => i);
    let order = twoOptImprove(points, initialOrder, distances);
    order = orOptImprove(order, distances);
    const seen = new Set(order);
    if (seen.size !== points.length || order[0] !== 0) return null;
    return order.slice(1).map((idx) => orderedStops[idx - 1]);
  } catch {
    return null;
  }
}

export async function buildOptimizedRoute(
  stops: RouteWaypoint[],
  opts: { forceOffline?: boolean } = {},
): Promise<OptimizedRoute> {
  if (stops.length === 0) {
    return { orderedStops: [], legs: [], totalDistanceMeters: 0, totalDurationSeconds: 0, source: 'local-heuristic' };
  }

  const cacheKey = buildCacheKey(stops);
  const cached = await getCachedRoute(cacheKey);
  if (cached && !navigator.onLine) return cached;

  // 1) Jalur terbaik: ORS optimization (online + API key)
  if (!opts.forceOffline && navigator.onLine && ORS_API_KEY) {
    try {
      const optimized = await optimizeWithOrs(WAREHOUSE, stops, ORS_API_KEY);
      const orderedStops = optimized.orderedDeliveryIds
        .map((id) => stops.find((s) => s.deliveryId === id))
        .filter((s): s is RouteWaypoint => !!s);

      const legs = await fetchLegsSequentially(orderedStops);
      const result: OptimizedRoute = {
        orderedStops,
        legs,
        totalDistanceMeters: optimized.totalDistanceMeters,
        totalDurationSeconds: optimized.totalDurationSeconds,
        source: 'ors-optimization',
      };
      await setCachedRoute(cacheKey, result);
      return result;
    } catch (err) {
      console.warn('[routingService] ORS optimization gagal, fallback ke heuristik lokal:', err);
    }
  }

  // 2) Fallback: heuristik lokal (offline-safe)
  const localResult = optimizeStopOrder(WAREHOUSE, stops.map(toLatLng));
  let orderedStops = localResult.orderIndices.slice(1).map((idx) => stops[idx - 1]);

  // 2b) Upgrade: perbaiki urutan dengan matriks jarak jalan asli (ORS Matrix) saat online
  let usedRoadMatrix = false;
  if (navigator.onLine && ORS_API_KEY) {
    const improved = await improveOrderWithRoadMatrix(orderedStops, ORS_API_KEY);
    if (improved) {
      orderedStops = improved;
      usedRoadMatrix = true;
    }
  }

  // 3) Lengkapi geometry jalan asli per-leg jika online
  let legs: RouteLegGeometry[];
  let source: OptimizedRoute['source'] = 'straight-line-fallback';
  try {
    if (navigator.onLine) {
      legs = await fetchLegsSequentially(orderedStops);
      source = usedRoadMatrix ? 'ors-directions' : 'local-heuristic';
    } else {
      legs = straightLineLegs(orderedStops);
    }
  } catch {
    legs = straightLineLegs(orderedStops);
  }

  const result: OptimizedRoute = {
    orderedStops,
    legs,
    totalDistanceMeters: legs.reduce((sum, l) => sum + l.distanceMeters, 0),
    totalDurationSeconds: legs.reduce((sum, l) => sum + l.durationSeconds, 0),
    source,
  };
  await setCachedRoute(cacheKey, result);
  return result;
}
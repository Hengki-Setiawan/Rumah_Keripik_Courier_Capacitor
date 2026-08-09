import { optimizeStopOrder, twoOptImprove, orOptImprove } from './tsp';
import { optimizeWithOrs, fetchDirectionsGeometry, fetchDistanceMatrix } from './orsClient';
import { fetchOsrmRoute } from './osrmClient';
import { haversineMeters } from './distance';
import { getCachedRoute, setCachedRoute } from './routeCache';
import { WAREHOUSE, type LatLng, type RouteWaypoint, type OptimizedRoute, type RouteLegGeometry } from './types';

const ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY as string | undefined;

const isDev = import.meta.env.DEV;
function debugLog(...args: unknown[]): void {
  if (isDev) console.log('[routingService]', ...args);
}

/**
 * Cek koneksi nyata — navigator.onLine tidak reliable di Capacitor Android
 * tanpa ACCESS_NETWORK_STATE permission. Probe ORS dulu (kita punya API key dan
 * itu engine routing utama); fallback probe OSRM public yang kadang rate-limit.
 * Sebelumnya probe OSRM saja -> sering gagal dari Indonesia -> app menganggap
 * offline -> semua leg jadi garis lurus padahal online (akar bug #4).
 */
async function isNetworkReachable(): Promise<boolean> {
  const probe = async (url: string) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    try {
      const res = await fetch(url, { method: 'GET', signal: ctrl.signal });
      return res.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  };

  // 1) Probe ORS (primary engine) — endpoint directions minimal, ringan.
  if (ORS_API_KEY) {
    const orsOk = await probe(
      `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=119.4135,-5.134&end=119.42,-5.14&geometry=false&instructions=false`,
    );
    if (orsOk) return true;
  }

  // 2) Fallback probe OSRM public.
  return probe('https://router.project-osrm.org/route/v1/driving/119.4135,-5.134;119.42,-5.14?overview=false');
}

function toLatLng(w: RouteWaypoint): { lat: number; lng: number } {
  return { lat: w.lat, lng: w.lng };
}

async function fetchLegsConcurrently(orderedStops: RouteWaypoint[]): Promise<RouteLegGeometry[]> {
  const points = [WAREHOUSE, ...orderedStops.map(toLatLng)];
  const legPairs: Array<[typeof points[number], typeof points[number]]> = [];
  for (let i = 0; i < points.length - 1; i++) {
    legPairs.push([points[i], points[i + 1]]);
  }
  // Concurrency 5: menghindari burst 14+ request ORS sekaligus yang bisa kena rate-limit,
  // tapi tetap jauh lebih cepat dari berurutan (N request berurutan).
  // Fallback berlapis (ORS -> OSRM -> mirror) memastikan posisi-posisi tetap berupa
  // polyline jalan nyata dan hanya turun ke garis lurus bila semuanya gagal.
  return mapWithConcurrency(legPairs, 5, async ([from, to]) => {
    try {
      return await fetchLegGeometryWithFallback(from, to);
    } catch {
      return straightLineLeg(from, to);
    }
  });
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const idx = cursor++;
      if (idx >= items.length) return;
      results[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return results;
}

const MS_FALLBACK_DELAY = 500;
const MS_RETRY_DELAY = 1200;

/**
 * Ambil geometry rute dengan fallback berlapis agar polyline tetap JALAN ASLI
 * (banyak vertex), bukan garis lurus 2 titik saat satu provider rate-limit/gagal:
 *   1) openrouteservice (jika ada API key)
 *   2) OSRM public (overview=full, sudah dari client)
 *   3) OSRM mirror rounting.openstreetmap.de
 * Saat OSRM mengembalikan 429 (rate-limit), coba sekali lagi setelah jeda.
 * Ujung-ujungnya garis lurus hanya dipakai bila SEMUA provider gagal / offline.
 */
export async function fetchLegGeometryWithFallback(from: LatLng, to: LatLng): Promise<RouteLegGeometry> {
  const osrmFallback = async (delayMs?: number) => {
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    try {
      return await fetchOsrmRoute(from, to);
    } catch (err) {
      // 429 dari OSRM public: retry sekali setelah jeda sebelum menyerah.
      if (delayMs == null) return osrmFallback(MS_RETRY_DELAY);
      throw err;
    }
  };

  if (ORS_API_KEY) {
    try {
      return await fetchDirectionsGeometry(from, to, ORS_API_KEY);
    } catch {
      // ORS gagal (quota/network) -> segera coba OSRM, jangan langsung garis lurus.
    }
  }
  try {
    return await osrmFallback();
  } catch {
    // Tunggu sesaat lalu coba mirror (jeda agar tidak saling bentrok rate-limit).
    await new Promise((r) => setTimeout(r, MS_FALLBACK_DELAY));
    try {
      return await fetchOsrmRoute(from, to);
    } catch {
      return straightLineLeg(from, to);
    }
  }
}

function straightLineLeg(a: { lat: number; lng: number }, b: { lat: number; lng: number }): RouteLegGeometry {
  return {
    coordinates: [[a.lng, a.lat], [b.lng, b.lat]],
    distanceMeters: haversineMeters(a, b),
    durationSeconds: 0,
  };
}

/** True jika seluruh leg berupa polyline jalan nyata (>=3 titik).
 * Leg garis lurus fallback (2 titik) TIDAK di-cache agar tidak "terkunci"
 * 24 jam -- rute asli selalu dicoba lagi saat online kembali. */
function hasRealRoadGeometry(route: OptimizedRoute): boolean {
  return (
    route.legs.length > 0 &&
    route.legs.every((leg) => leg.coordinates && leg.coordinates.length >= 3)
  );
}

function straightLineLegs(orderedStops: RouteWaypoint[]): RouteLegGeometry[] {
  const points = [WAREHOUSE, ...orderedStops.map(toLatLng)];
  const legs: RouteLegGeometry[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    legs.push(straightLineLeg(points[i], points[i + 1]));
  }
  return legs;
}

export function buildRouteFingerprint(stops: RouteWaypoint[]): string {
  return stops
    .map((s) => `${s.deliveryId}:${s.lat.toFixed(6)},${s.lng.toFixed(6)}`)
    .sort()
    .join('|');
}

function buildCacheKey(stops: RouteWaypoint[]): string {
  return buildRouteFingerprint(stops);
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

  // Probe jaringan secara nyata (bukan hanya navigator.onLine)
  const online = !opts.forceOffline && await isNetworkReachable();
  debugLog('isNetworkReachable:', online);

  if (cached && !online) return cached;

  // 1) Jalur terbaik: ORS optimization (online + API key)
  if (!opts.forceOffline && online && ORS_API_KEY) {
    try {
      const optimized = await optimizeWithOrs(WAREHOUSE, stops, ORS_API_KEY);
      const orderedStops = optimized.orderedDeliveryIds
        .map((id) => stops.find((s) => s.deliveryId === id))
        .filter((s): s is RouteWaypoint => !!s);

      const legs = await fetchLegsConcurrently(orderedStops);
      const result: OptimizedRoute = {
        orderedStops,
        legs,
        totalDistanceMeters: optimized.totalDistanceMeters,
        totalDurationSeconds: optimized.totalDurationSeconds,
        source: 'ors-optimization',
      };
      if (hasRealRoadGeometry(result)) await setCachedRoute(cacheKey, result);
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
  if (online && ORS_API_KEY) {
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
    if (online) {
      debugLog('Fetching OSRM legs for', orderedStops.length, 'stops');
      legs = await fetchLegsConcurrently(orderedStops);
      source = usedRoadMatrix ? 'ors-directions' : 'local-heuristic';
      debugLog('OSRM legs fetched, total coords:', legs.reduce((n, l) => n + l.coordinates.length, 0));
    } else {
      debugLog('Offline - using straight-line legs');
      legs = straightLineLegs(orderedStops);
    }
  } catch (e) {
    console.error('[routingService] fetchLegsConcurrently error:', e);
    legs = straightLineLegs(orderedStops);
  }

  const result: OptimizedRoute = {
    orderedStops,
    legs,
    totalDistanceMeters: legs.reduce((sum, l) => sum + l.distanceMeters, 0),
    totalDurationSeconds: legs.reduce((sum, l) => sum + l.durationSeconds, 0),
    source,
  };
  if (hasRealRoadGeometry(result)) await setCachedRoute(cacheKey, result);
  return result;
}
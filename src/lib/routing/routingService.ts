import { optimizeStopOrder, twoOptImprove, orOptImprove } from './tsp';
import { optimizeWithOrs, fetchDirectionsGeometry, fetchDistanceMatrix, snapStopsToRoad } from './orsClient';
import { fetchOsrmRoute } from './osrmClient';
import { haversineMeters } from './distance';
import { getCachedRoute, setCachedRoute } from './routeCache';
import { type LatLng, type RouteWaypoint, type OptimizedRoute, type RouteLegGeometry } from './types';

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

async function fetchLegsConcurrently(orderedStops: RouteWaypoint[], depot: LatLng): Promise<RouteLegGeometry[]> {
  const points = [depot, ...orderedStops.map(toLatLng)];
  const legPairs: Array<[typeof points[number], typeof points[number]]> = [];
  for (let i = 0; i < points.length - 1; i++) {
    legPairs.push([points[i], points[i + 1]]);
  }
  // Concurrency 5: menghindari burst 14+ request ORS sekaligus yang bisa kena rate-limit,
  // tapi tetap jauh lebih cepat dari berurutan (N request berurutan).
  return mapWithConcurrency(legPairs, 5, async ([from, to]) => {
    try {
      return ORS_API_KEY ? await fetchDirectionsGeometry(from, to, ORS_API_KEY) : await fetchOsrmRoute(from, to);
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

function straightLineLeg(a: { lat: number; lng: number }, b: { lat: number; lng: number }): RouteLegGeometry {
  return {
    coordinates: [[a.lng, a.lat], [b.lng, b.lat]],
    distanceMeters: haversineMeters(a, b),
    durationSeconds: 0,
  };
}

function straightLineLegs(orderedStops: RouteWaypoint[], depot: LatLng): RouteLegGeometry[] {
  const points = [depot, ...orderedStops.map(toLatLng)];
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

/**
 * Query key stabil untuk React Query. Hanya deliveryId — KOORDINAT DIKECUALIKAN.
 * buildRouteFingerprint (cache internal) ikut koordinat supaya cache invalid
 * saat stop digeser (mis. ORS snap ke jalan), tapi query key harus STABIL agar
 * setQueryData() dari reroute-to-stop selalu menimpa data yang diamati hook.
 * (Regresi 65d6116: snap mengubah koordinat orderedStops -> fingerprint berbeda ->
 *  reroute menulis ke key yang tidak diamati UI -> "tidak bisa hitung ulang rute".)
 */
export function buildRouteQueryKey(stops: RouteWaypoint[]): string {
  return stops
    .map((s) => String(s.deliveryId))
    .sort()
    .join('|');
}

/**
 * Query key lengkap rute teroptimasi. Berisi (1) deliveryId terurut, (2) depot
 * (posisi kurir saat re-optimize, dibulatkan agar stabil), dan
 * (3) forceKey (bump saat user tekan "Optimalkan" manual). Key berubah =
 * React Query fetch ulang, jadi re-optimize dari GPS cukup ganti depot di sini.
 */
export function buildOptimizedRouteQueryKey(
  stops: RouteWaypoint[],
  depot?: LatLng,
  forceKey = 0,
): readonly ['route', 'optimized', string, string, number] {
  const depotStr = depot ? `${depot.lat.toFixed(5)},${depot.lng.toFixed(5)}` : 'courier';
  return ['route', 'optimized', buildRouteQueryKey(stops), depotStr, forceKey];
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
  depot: LatLng,
): Promise<RouteWaypoint[] | null> {
  if (orderedStops.length < 2) return null;
  const points = [depot, ...orderedStops.map(toLatLng)];
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
  opts: { forceOffline?: boolean; depot?: LatLng } = {},
): Promise<OptimizedRoute> {
  if (stops.length === 0) {
    return { orderedStops: [], legs: [], totalDistanceMeters: 0, totalDurationSeconds: 0, source: 'local-heuristic' };
  }

  // Depot = posisi kurir. Tanpa posisi GPS, urutkan berdasar sequence bawaan
  // server (anti-gagal) — bukan dari gudang.
  const depot = opts.depot;
  const cacheKey = buildCacheKey(stops);

  if (!depot) {
    const orderedStops = [...stops].sort((a, b) => a.sequence - b.sequence);
    const result: OptimizedRoute = {
      orderedStops,
      legs: [],
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
      source: 'straight-line-fallback',
    };
    await setCachedRoute(cacheKey, result);
    return result;
  }

  const cached = await getCachedRoute(cacheKey);

  // Probe jaringan secara nyata (bukan hanya navigator.onLine)
  const online = !opts.forceOffline && await isNetworkReachable();
  debugLog('isNetworkReachable:', online);

  if (cached && !online) return cached;
  // Snap koordinat stop yang meleset ke jaringan jalan (ORS Snap) saat online.
  // Silent-fail: jika gagal/offline, pakai koordinat asli.
  let snappedStops: RouteWaypoint[] = stops;
  if (!opts.forceOffline && online && ORS_API_KEY) {
    try {
      const snapped = await snapStopsToRoad(stops, ORS_API_KEY);
      const moved = snapped.filter((s, i) => s.lat !== stops[i].lat || s.lng !== stops[i].lng).length;
      if (moved > 0) {
        snappedStops = snapped;
        debugLog('ORS snap diterapkan untuk', moved, 'stop');
      }
    } catch (err) {
      console.warn('[routingService] ORS snap gagal, lanjut koordinat asli:', err);
    }
  }

  // 1) Jalur terbaik: ORS optimization (online + API key)
  if (!opts.forceOffline && online && ORS_API_KEY) {
    try {
      const optimized = await optimizeWithOrs(depot, snappedStops, ORS_API_KEY);
      const orderedStops = optimized.orderedDeliveryIds
        .map((id) => snappedStops.find((s) => s.deliveryId === id))
        .filter((s): s is RouteWaypoint => !!s);

      const legs = await fetchLegsConcurrently(orderedStops, depot);
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
  const localResult = optimizeStopOrder(depot, snappedStops.map(toLatLng));
  let orderedStops = localResult.orderIndices.slice(1).map((idx) => snappedStops[idx - 1]);

  // 2b) Upgrade: perbaiki urutan dengan matriks jarak jalan asli (ORS Matrix) saat online
  let usedRoadMatrix = false;
  if (online && ORS_API_KEY) {
    const improved = await improveOrderWithRoadMatrix(orderedStops, ORS_API_KEY, depot);
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
      legs = await fetchLegsConcurrently(orderedStops, depot);
      source = usedRoadMatrix ? 'ors-directions' : 'local-heuristic';
      debugLog('OSRM legs fetched, total coords:', legs.reduce((n, l) => n + l.coordinates.length, 0));
    } else {
      debugLog('Offline - using straight-line legs');
      legs = straightLineLegs(orderedStops, depot);
    }
  } catch (e) {
    console.error('[routingService] fetchLegsConcurrently error:', e);
    legs = straightLineLegs(orderedStops, depot);
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

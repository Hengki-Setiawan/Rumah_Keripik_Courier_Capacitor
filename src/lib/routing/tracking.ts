import type { LatLng, RouteLegGeometry } from './types';
import { haversineMeters } from './distance';

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Interpolasi linier antar dua koordinat (untuk tween halus marker kurir). */
export function interpolateLatLng(from: LatLng, to: LatLng, t: number): LatLng {
  const clamped = Math.min(1, Math.max(0, t));
  return {
    lat: lerp(from.lat, to.lat, clamped),
    lng: lerp(from.lng, to.lng, clamped),
  };
}

/** Jarak titik ke segmen garis (proyeksi orthogonal), dalam meter. */
export function distanceToSegmentM(p: LatLng, a: LatLng, b: LatLng): number {
  const ax = p.lng - a.lng;
  const ay = p.lat - a.lat;
  const bx = b.lng - a.lng;
  const by = b.lat - a.lat;

  const lenSq = bx * bx + by * by;
  if (lenSq === 0) return haversineMeters(p, a);

  let t = (ax * bx + ay * by) / lenSq;
  t = Math.min(1, Math.max(0, t));

  const proj: LatLng = { lat: a.lat + t * by, lng: a.lng + t * bx };
  return haversineMeters(p, proj);
}

/** Jarak minimum titik ke seluruh polyline (rute jalan), dalam meter. */
export function distanceToPolylineM(p: LatLng, line: [number, number][]): number {
  if (line.length === 0) return Infinity;
  if (line.length === 1) {
    const [lng, lat] = line[0];
    return haversineMeters(p, { lat, lng });
  }
  let min = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    const [aLng, aLat] = line[i];
    const [bLng, bLat] = line[i + 1];
    const d = distanceToSegmentM(p, { lat: aLat, lng: aLng }, { lat: bLat, lng: bLng });
    if (d < min) min = d;
  }
  return min;
}

/** Deteksi posisi kurir yang keluar dari rute (semua leg digabung).
 * `history` adalah jejak posisi (urutan kronologis, titik terakhir = posisi terkini).
 */
export function isOffRoute(
  legs: RouteLegGeometry[],
  maxDeviationM: number,
  minDurationMs: number,
  history: Array<{ lat: number; lng: number; timestamp: number }>,
): { offRoute: boolean; deviationM: number; sinceMs: number } {
  if (history.length === 0) return { offRoute: false, deviationM: Infinity, sinceMs: 0 };

  const deviationFor = (p: LatLng): number => {
    let min = Infinity;
    for (const leg of legs) {
      if (leg.coordinates.length < 2) continue;
      const d = distanceToPolylineM(p, leg.coordinates);
      if (d < min) min = d;
    }
    return min;
  };

  const current = history[history.length - 1];
  const deviationM = deviationFor(current);

  // Hitung berapa lama posisi terus-menerus berada di luar ambang.
  let sinceMs = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const d = deviationFor(history[i]);
    if (d <= maxDeviationM) break;
    sinceMs = current.timestamp - history[i].timestamp;
  }

  return { offRoute: deviationM > maxDeviationM && sinceMs >= minDurationMs, deviationM, sinceMs };
}

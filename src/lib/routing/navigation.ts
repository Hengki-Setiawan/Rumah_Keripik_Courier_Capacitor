import type { LatLng, ManeuverModifier, RouteLegGeometry, RouteStep } from './types';
import { haversineMeters } from './distance';

export interface SnappedPoint {
  point: LatLng;
  distanceAlongM: number;
  segmentIndex: number;
  fraction: number;
}

function toLatLng(coord: [number, number]): LatLng {
  return { lat: coord[1], lng: coord[0] };
}

/** Jarak kumulatif tiap vertex polyline dari titik awal (dalam meter). */
function cumulativeDistances(line: [number, number][]): number[] {
  const out = [0];
  for (let i = 1; i < line.length; i++) {
    out.push(out[i - 1] + haversineMeters(toLatLng(line[i - 1]), toLatLng(line[i])));
  }
  return out;
}

function projectionT(p: LatLng, a: LatLng, b: LatLng): number {
  const ax = p.lng - a.lng;
  const ay = p.lat - a.lat;
  const bx = b.lng - a.lng;
  const by = b.lat - a.lat;
  const lenSq = bx * bx + by * by;
  if (lenSq === 0) return 0;
  return Math.min(1, Math.max(0, (ax * bx + ay * by) / lenSq));
}

/**
 * Proyeksikan posisi ke polyline rute: titik terdekat di atas garis + jarak
 * kumulatif dari awal rute. Basis untuk "marker menempel di jalan" (map-matching
 * ringan tanpa jaringan) dan perhitungan jarak tersisa.
 */
export function snapToRoute(pos: LatLng, line: [number, number][]): SnappedPoint | null {
  if (line.length === 0) return null;
  if (line.length === 1) {
    return { point: toLatLng(line[0]), distanceAlongM: 0, segmentIndex: 0, fraction: 0 };
  }
  const cumulative = cumulativeDistances(line);
  let bestDist = Infinity;
  let bestSeg = 0;
  let bestT = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const a = toLatLng(line[i]);
    const b = toLatLng(line[i + 1]);
    const t = projectionT(pos, a, b);
    const proj: LatLng = { lat: a.lat + t * (b.lat - a.lat), lng: a.lng + t * (b.lng - a.lng) };
    const d = haversineMeters(pos, proj);
    if (d < bestDist) {
      bestDist = d;
      bestSeg = i;
      bestT = t;
    }
  }
  const a = toLatLng(line[bestSeg]);
  const b = toLatLng(line[bestSeg + 1]);
  const segLen = haversineMeters(a, b);
  return {
    point: { lat: a.lat + bestT * (b.lat - a.lat), lng: a.lng + bestT * (b.lng - a.lng) },
    distanceAlongM: cumulative[bestSeg] + bestT * segLen,
    segmentIndex: bestSeg,
    fraction: bestT,
  };
}

/** Index vertex polyline yang paling dekat dengan titik tertentu. */
export function indexOfNearestVertex(line: [number, number][], point: LatLng): number {
  if (line.length === 0) return 0;
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < line.length; i++) {
    const d = haversineMeters(point, toLatLng(line[i]));
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** Jarak tersisa (meter) dari posisi ke akhir leg, dihitung sepanjang polyline. */
export function remainingDistanceToEndM(leg: RouteLegGeometry, pos: LatLng): number | null {
  const snap = snapToRoute(pos, leg.coordinates);
  if (!snap) return null;
  const total = cumulativeDistances(leg.coordinates)[leg.coordinates.length - 1];
  return Math.max(0, total - snap.distanceAlongM);
}

export interface UpcomingStep {
  step: RouteStep;
  distanceM: number;
}

/**
 * Manuver berikutnya yang akan dilewati (dari posisi kurir) + jarak tersisa
 * menuju titik manuver tersebut, dihitung sepanjang polyline leg.
 */
export function findUpcomingStep(leg: RouteLegGeometry, pos: LatLng): UpcomingStep | null {
  if (!leg.steps || leg.steps.length === 0) return null;
  const snap = snapToRoute(pos, leg.coordinates);
  if (!snap) return null;
  const cumulative = cumulativeDistances(leg.coordinates);
  let best: UpcomingStep | null = null;
  for (const step of leg.steps) {
    const idx = indexOfNearestVertex(leg.coordinates, step.location);
    const remaining = cumulative[idx] - snap.distanceAlongM;
    if (remaining < -30) continue; // manuver sudah terlewati
    if (!best || remaining < best.distanceM) {
      best = { step, distanceM: Math.max(0, remaining) };
    }
  }
  return best;
}

export interface ManeuverDisplay {
  label: string;
  rotationDeg: number;
  vibrate: boolean;
}

/** Konversi jenis manuver menjadi teks + sudut rotasi panah + perlu getar. */
export function maneuverToDisplay(modifier: ManeuverModifier): ManeuverDisplay {
  switch (modifier) {
    case 'depart':
      return { label: 'Mulai perjalanan', rotationDeg: 0, vibrate: false };
    case 'slight left':
      return { label: 'Belok kiri tipis', rotationDeg: -45, vibrate: true };
    case 'left':
      return { label: 'Belok kiri', rotationDeg: -90, vibrate: true };
    case 'sharp left':
      return { label: 'Belok kiri tajam', rotationDeg: -135, vibrate: true };
    case 'slight right':
      return { label: 'Belok kanan tipis', rotationDeg: 45, vibrate: true };
    case 'right':
      return { label: 'Belok kanan', rotationDeg: 90, vibrate: true };
    case 'sharp right':
      return { label: 'Belok kanan tajam', rotationDeg: 135, vibrate: true };
    case 'uturn':
      return { label: 'Putar balik', rotationDeg: 180, vibrate: true };
    case 'roundabout':
      return { label: 'Masuk bundaran', rotationDeg: 0, vibrate: true };
    case 'arrive':
      return { label: 'Tiba di tujuan', rotationDeg: 0, vibrate: true };
    case 'straight':
    default:
      return { label: 'Tetap lurus', rotationDeg: 0, vibrate: false };
  }
}

/** Format jarak dalam meter ke teks ringkas (mis. "300 m", "1,2 km"). */
export function formatMeters(m: number): string {
  if (m < 1000) return `${Math.max(1, Math.round(m))} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

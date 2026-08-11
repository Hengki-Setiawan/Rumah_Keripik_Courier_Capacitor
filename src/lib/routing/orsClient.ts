import { decodePolyline } from '../map/polyline';
import type { LatLng, ManeuverModifier, RouteLegGeometry, RouteStep, RouteWaypoint } from './types';

interface OrsStepJson {
  distance?: number;
  duration?: number;
  type?: number;
  instruction?: string;
  name?: string;
  location?: number[];
  maneuver?: {
    location?: number[];
  };
}

const ORS_STEP_MODIFIERS: Record<number, ManeuverModifier> = {
  0: 'left',
  1: 'right',
  2: 'sharp left',
  3: 'sharp right',
  4: 'slight left',
  5: 'slight right',
  6: 'straight',
  7: 'roundabout',
  8: 'roundabout',
  9: 'uturn',
  10: 'arrive',
  11: 'depart',
  12: 'left',
  13: 'right',
};

export function parseOrsSteps(steps: OrsStepJson[]): RouteStep[] {
  return steps.map((step, index) => {
    const location = step.maneuver?.location ?? step.location;
    return {
      index,
      instruction: step.instruction ?? '',
      modifier: ORS_STEP_MODIFIERS[step.type ?? 6] ?? 'straight',
      roadName: step.name && step.name !== '-' ? step.name : '',
      distanceMeters: step.distance ?? 0,
      durationSeconds: step.duration ?? 0,
      location: location && location.length >= 2 ? { lat: location[1], lng: location[0] } : { lat: 0, lng: 0 },
    };
  });
}

export async function fetchDirectionsGeometry(
  from: LatLng,
  to: LatLng,
  apiKey: string,
  profile: 'driving-car' = 'driving-car',
): Promise<RouteLegGeometry> {
  const res = await fetch(`https://api.openrouteservice.org/v2/directions/${profile}`, {
    method: 'POST',
    headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      coordinates: [[from.lng, from.lat], [to.lng, to.lat]],
      instructions: true,
      maneuvers: true,
      language: 'id',
    }),
  });
  if (!res.ok) throw new Error(`ORS directions error: ${res.status}`);
  const data = await res.json();
  const route = data.routes[0];
  const segmentSteps = route.segments?.[0]?.steps;

  return {
    coordinates: decodePolyline(route.geometry),
    distanceMeters: route.summary.distance,
    durationSeconds: route.summary.duration,
    steps: Array.isArray(segmentSteps) ? parseOrsSteps(segmentSteps as OrsStepJson[]) : undefined,
  };
}

export async function fetchDistanceMatrix(
  points: LatLng[],
  apiKey: string,
  profile: 'driving-car' | 'cycling-regular' = 'driving-car',
): Promise<{ distances: number[][]; durations: number[][] }> {
  const res = await fetch(`https://api.openrouteservice.org/v2/matrix/${profile}`, {
    method: 'POST',
    headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      locations: points.map((p) => [p.lng, p.lat]),
      metrics: ['distance', 'duration'],
    }),
  });
  if (!res.ok) throw new Error(`ORS matrix error: ${res.status}`);
  const data = await res.json();
  return { distances: data.distances, durations: data.durations };
}

export async function optimizeWithOrs(
  depot: LatLng,
  stops: RouteWaypoint[],
  apiKey: string,
): Promise<{ orderedDeliveryIds: string[]; totalDistanceMeters: number; totalDurationSeconds: number }> {
  const res = await fetch('https://api.openrouteservice.org/optimization', {
    method: 'POST',
    headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vehicles: [{
        id: 1,
        profile: 'driving-car',
        start: [depot.lng, depot.lat],
      }],
      jobs: stops.map((s, idx) => ({
        id: idx + 1,
        location: [s.lng, s.lat],
      })),
    }),
  });
  if (!res.ok) throw new Error(`ORS optimization error: ${res.status}`);
  const data = await res.json();

  const route = data.routes[0];
  const orderedDeliveryIds = route.steps
    .filter((s: { type: string }) => s.type === 'job')
    .map((s: { job: number }) => stops[s.job - 1].deliveryId);

  return {
    orderedDeliveryIds,
    totalDistanceMeters: route.distance,
    totalDurationSeconds: route.duration,
  };
}

interface SnapResultItem {
  location?: [number, number];
  name?: string;
  snapped_distance?: number;
}

/**
 * ORS Snap (POST /v2/snap/driving-car): menggeser koordinat stop yang
 * meleset dari jalan ke titik terdekat di jaringan jalan (driving-network).
 * Hanya menggeser bila jarak ke jalan <= maxSnapDistanceM, sisanya dibiarkan.
 * Batch API: 1 request untuk semua stop (ekonomis di kuota). Endpoint ini
 * sudah diverifikasi live: respons `locations[]` berisi null atau
 * `{location, name, snapped_distance}`.
 */
export async function snapStopsToRoad(
  stops: RouteWaypoint[],
  apiKey: string,
  maxSnapDistanceM = 150,
  radius = 300,
): Promise<RouteWaypoint[]> {
  if (stops.length === 0) return stops;

  const res = await fetch('https://api.openrouteservice.org/v2/snap/driving-car', {
    method: 'POST',
    headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      locations: stops.map((s) => [s.lng, s.lat]),
      radius,
    }),
  });
  if (!res.ok) throw new Error(`ORS snap error: ${res.status}`);
  const data = await res.json();
  const locations = data.locations as (SnapResultItem | null)[] | undefined;
  if (!Array.isArray(locations) || locations.length !== stops.length) return stops;

  return stops.map((s, i) => {
    const hit = locations[i];
    const dist = hit?.snapped_distance;
    if (!hit?.location || dist == null || dist > maxSnapDistanceM) return s;
    const [lng, lat] = hit.location;
    if (typeof lng !== 'number' || typeof lat !== 'number') return s;
    return { ...s, lat, lng, address: s.address, customerName: s.customerName, sequence: s.sequence };
  });
}
import { decodePolyline } from '../map/polyline';
import type { LatLng, RouteLegGeometry, RouteWaypoint } from './types';

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
    }),
  });
  if (!res.ok) throw new Error(`ORS directions error: ${res.status}`);
  const data = await res.json();
  const route = data.routes[0];

  return {
    coordinates: decodePolyline(route.geometry),
    distanceMeters: route.summary.distance,
    durationSeconds: route.summary.duration,
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
import type { LatLng, RouteLegGeometry } from './types';

const OSRM_DEMO_BASE = 'https://router.project-osrm.org';

export async function fetchOsrmRoute(from: LatLng, to: LatLng): Promise<RouteLegGeometry> {
  const url = `${OSRM_DEMO_BASE}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM error: ${res.status}`);
  const data = await res.json();
  const route = data.routes[0];

  return {
    coordinates: route.geometry.coordinates,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  };
}
import type { LatLng, ManeuverModifier, RouteLegGeometry, RouteStep } from './types';

interface OsrmStepJson {
  distance?: number;
  duration?: number;
  name?: string;
  instruction?: string;
  maneuver?: {
    type?: string;
    modifier?: string;
    location?: number[];
  };
}

function mapOsrmModifier(type: string | undefined, modifier: string | undefined): ManeuverModifier {
  if (type === 'depart') return 'depart';
  if (type === 'arrive') return 'arrive';
  if (type === 'roundabout' || type === 'rotary' || type === 'roundabout turn' || type === 'exit roundabout' || type === 'exit rotary') {
    return 'roundabout';
  }
  switch (modifier) {
    case 'left':
    case 'right':
    case 'sharp left':
    case 'sharp right':
    case 'slight left':
    case 'slight right':
    case 'uturn':
    case 'straight':
      return modifier;
    default:
      return 'straight';
  }
}

export function parseOsrmSteps(steps: OsrmStepJson[]): RouteStep[] {
  return steps.map((step, index) => {
    const man = step.maneuver;
    const location = man?.location;
    return {
      index,
      instruction: step.instruction ?? '',
      modifier: mapOsrmModifier(man?.type, man?.modifier),
      roadName: step.name && step.name !== '-' ? step.name : '',
      distanceMeters: step.distance ?? 0,
      durationSeconds: step.duration ?? 0,
      location: location && location.length >= 2 ? { lat: location[1], lng: location[0] } : { lat: 0, lng: 0 },
    };
  });
}

const OSRM_PRIMARY_BASE = 'https://router.project-osrm.org';
const OSRM_FALLBACK_BASE = 'https://routing.openstreetmap.de/routed-car';

export async function fetchOsrmRoute(from: LatLng, to: LatLng): Promise<RouteLegGeometry> {
  const path = `/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true&continue_straight=false`;
  
  let res: Response | null = null;
  try {
    res = await fetch(`${OSRM_PRIMARY_BASE}${path}`);
    if (!res.ok) res = null;
  } catch {
    res = null;
  }

  // Fallback ke server OSM DE jika server utama gagal
  if (!res) {
    res = await fetch(`${OSRM_FALLBACK_BASE}${path}`);
    if (!res.ok) throw new Error(`OSRM Fallback error: ${res.status}`);
  }

  const data = await res.json();
  const route = data.routes[0];
  const legSteps = route.legs?.[0]?.steps;

  return {
    coordinates: route.geometry.coordinates,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    steps: Array.isArray(legSteps) ? parseOsrmSteps(legSteps as OsrmStepJson[]) : undefined,
  };
}
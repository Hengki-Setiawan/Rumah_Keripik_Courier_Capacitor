export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteWaypoint {
  deliveryId: string;
  sequence: number;
  lat: number;
  lng: number;
  customerName?: string;
  address?: string;
}

export interface RouteLegGeometry {
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
}

export type RouteSource =
  | 'ors-optimization'
  | 'ors-directions'
  | 'osrm'
  | 'local-heuristic'
  | 'straight-line-fallback';

export interface OptimizedRoute {
  orderedStops: RouteWaypoint[];
  legs: RouteLegGeometry[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  source: RouteSource;
}

export const WAREHOUSE: LatLng = { lat: -5.1340, lng: 119.4135 };
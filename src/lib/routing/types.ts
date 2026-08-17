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

export type ManeuverModifier =
  | 'depart'
  | 'straight'
  | 'slight left'
  | 'left'
  | 'sharp left'
  | 'slight right'
  | 'right'
  | 'sharp right'
  | 'uturn'
  | 'roundabout'
  | 'arrive';

export interface RouteStep {
  index: number;
  instruction: string;
  modifier: ManeuverModifier;
  roadName: string;
  distanceMeters: number;
  durationSeconds: number;
  location: LatLng;
}

export interface RouteLegGeometry {
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
  steps?: RouteStep[];
}

export type RouteSource =
  | 'ors-optimization'
  | 'ors-directions'
  | 'osrm'
  | 'local-heuristic'
  | 'straight-line-fallback'
  | 'server-optimize';

export interface OptimizedRoute {
  orderedStops: RouteWaypoint[];
  legs: RouteLegGeometry[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  source: RouteSource;
}

/** Start point rute HANYA posisi kurir (tidak ada gudang). Fallback netral
 *  untuk kamera peta saat GPS/route belum tersedia ΓÇö bukan titik mulai rute. */
export const MAKASSAR_CENTER: LatLng = { lat: -5.1340, lng: 119.4135 };

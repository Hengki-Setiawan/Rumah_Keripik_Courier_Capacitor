import { useQuery, type QueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import type { CourierRoutesResponse } from '@/lib/types';

export const routesKeys = {
  all: ['routes'] as const,
  today: ['routes', 'today'] as const,
};

interface RoutesData {
  available: CourierRoutesResponse['data']['available'];
  mine: CourierRoutesResponse['data']['mine'];
  history: CourierRoutesResponse['data']['history'];
  other: CourierRoutesResponse['data']['other'];
  assignedCount: number;
  hasActiveRoute: boolean;
}

export function useCourierRoutes() {
  return useQuery<RoutesData>({
    queryKey: routesKeys.today,
    queryFn: async () => {
      const res = await apiRequest<CourierRoutesResponse>('/api/courier/routes', { method: 'GET' });
      return res.data;
    },
    staleTime: 30_000,
    refetchInterval: 45_000,
  });
}

export async function claimRoute(routeId: number): Promise<number> {
  const res = await apiRequest<{ ok: boolean; data?: { stopCount?: number } }>(`/api/courier/routes/${routeId}`, {
    method: 'POST',
    body: JSON.stringify({ action: 'claim' }),
  });
  return res.data?.stopCount ?? 0;
}

export async function releaseRoute(routeId: number): Promise<number> {
  const res = await apiRequest<{ ok: boolean; data?: { stopCount?: number } }>(`/api/courier/routes/${routeId}`, {
    method: 'POST',
    body: JSON.stringify({ action: 'release' }),
  });
  return res.data?.stopCount ?? 0;
}

export async function startRoute(routeId: number): Promise<number> {
  const res = await apiRequest<{ ok: boolean; data?: { stopCount?: number } }>(`/api/courier/routes/${routeId}`, {
    method: 'POST',
    body: JSON.stringify({ action: 'start' }),
  });
  return res.data?.stopCount ?? 0;
}

export interface ServerRouteOptimizeWaypoint {
  sequence: number;
  deliveryId: number;
  idTransaksi: string;
  lat: number;
  lng: number;
}

export interface ServerRouteOptimizeResult {
  waypoints: ServerRouteOptimizeWaypoint[];
  totalStops: number;
  totalEstimatedKm: number;
  source: string;
  routeDurationMin?: number | null;
}

/** Optimasi urutan stop jalur di SERVER (sumber kebenaran urutan). Pemanggil
 *  wajib fallback ke optimasi lokal (routingService) bila offline/gagal. */
export async function optimizeRouteOnServer(
  routeId: number,
  current: { lat?: number; lng?: number },
): Promise<ServerRouteOptimizeResult> {
  const res = await apiRequest<{ ok: boolean; data?: ServerRouteOptimizeResult; error?: string }>(
    `/api/courier/routes/${routeId}/optimize`,
    { method: 'POST', body: JSON.stringify({ currentLat: current.lat, currentLng: current.lng }) },
  );
  if (!res.ok || !res.data) throw new Error(res.error || 'Optimasi server gagal');
  return res.data;
}

export function invalidateRoutes(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: routesKeys.today });
}
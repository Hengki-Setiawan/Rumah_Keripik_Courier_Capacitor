import { useQuery } from '@tanstack/react-query';
import { buildOptimizedRoute, buildOptimizedRouteQueryKey } from '@/lib/routing/routingService';
import type { LatLng, RouteWaypoint, OptimizedRoute } from '@/lib/routing/types';
import { useTodayDeliveries } from '@/hooks/use-deliveries';

export interface UseOptimizedRouteOptions {
  /** Depot rute. null/undefined = gudang (initial). Diisi posisi GPS kurir saat re-optimize. */
  depot?: LatLng | null;
  /** deliveryId yang sudah selesai/gagal — dikeluarkan dari rute sebelum re-optimize. */
  excludeIds?: string[];
  /** Bump tiap tombol "Optimalkan" manual supaya query di-fetch ulang walau depot sama. */
  forceKey?: number;
}

export function useOptimizedRoute(opts: UseOptimizedRouteOptions = {}) {
  const { data: deliveries, isFetched: deliveriesLoaded } = useTodayDeliveries();

  const exclude = new Set(opts.excludeIds ?? []);
  const stops: RouteWaypoint[] = (deliveries ?? [])
    .filter((d) => d.latitude && d.longitude && !exclude.has(String(d.id)))
    .map((d) => ({
      deliveryId: String(d.id),
      sequence: d.route_order ?? 0,
      lat: Number(d.latitude),
      lng: Number(d.longitude),
      customerName: d.customer_name,
      address: d.address,
    }));

  const queryKey = buildOptimizedRouteQueryKey(stops, opts.depot ?? undefined, opts.forceKey ?? 0);

  const result = useQuery<OptimizedRoute>({
    queryKey,
    queryFn: () => buildOptimizedRoute(stops, { depot: opts.depot ?? undefined }),
    enabled: deliveriesLoaded && stops.length > 0,
    staleTime: 5 * 60_000,
  });

  return { ...result, queryKey };
}

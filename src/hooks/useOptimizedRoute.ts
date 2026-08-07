import { useQuery } from '@tanstack/react-query';
import { buildOptimizedRoute } from '@/lib/routing/routingService';
import type { RouteWaypoint, OptimizedRoute } from '@/lib/routing/types';
import { useTodayDeliveries } from '@/hooks/use-deliveries';

export function useOptimizedRoute() {
  const { data: deliveries, isFetched: deliveriesLoaded } = useTodayDeliveries();

  const stops: RouteWaypoint[] = (deliveries ?? [])
    .filter((d) => d.latitude && d.longitude)
    .map((d) => ({
      deliveryId: String(d.id),
      sequence: d.route_order ?? 0,
      lat: Number(d.latitude),
      lng: Number(d.longitude),
      customerName: d.customer_name,
      address: d.address,
    }));

  return useQuery<OptimizedRoute>({
    queryKey: ['route', 'optimized', stops.map((s) => s.deliveryId).sort().join('|')],
    queryFn: () => buildOptimizedRoute(stops),
    enabled: deliveriesLoaded && stops.length > 0,
    staleTime: 5 * 60_000,
  });
}
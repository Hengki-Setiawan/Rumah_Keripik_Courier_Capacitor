import { useQuery } from '@tanstack/react-query';
import { buildOptimizedRoute, buildFixedOrderRoute, buildOptimizedRouteQueryKey } from '@/lib/routing/routingService';
import { optimizeRouteOnServer } from '@/hooks/use-courier-routes';
import type { LatLng, RouteWaypoint, OptimizedRoute } from '@/lib/routing/types';
import { useTodayDeliveries } from '@/hooks/use-deliveries';

export interface UseOptimizedRouteOptions {
  /** Depot rute = posisi GPS kurir saat ini (tidak pernah gudang). */
  depot?: LatLng | null;
  /** deliveryId yang sudah selesai/gagal — dikeluarkan dari rute sebelum re-optimize. */
  excludeIds?: string[];
  /** Bump tiap tombol "Optimalkan" manual supaya query di-fetch ulang walau depot sama. */
  forceKey?: number;
  /** routeId jalur aktif. Jika ada + online, urutan datang dari SERVER (sumber kebenaran,
   *  blueprint VI.2); offline/gagal otomatis fallback ke optimasi lokal. */
  serverRouteId?: number | null;
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
    queryFn: async () => {
      // Urutan dari server adalah sumber kebenaran saat jalur aktif (VI.2).
      // Map via idTransaksi (server mengembalikan id routePoint, bukan assignment id).
      if (opts.serverRouteId && opts.depot) {
        try {
          const server = await optimizeRouteOnServer(opts.serverRouteId, {
            lat: opts.depot.lat,
            lng: opts.depot.lng,
          });
          const byTransaksi = new Map((deliveries ?? []).map((d) => [d.id_transaksi, String(d.id)]));
          const ordered: RouteWaypoint[] = [];
          for (const w of server.waypoints) {
            const deliveryId = byTransaksi.get(w.idTransaksi);
            const stop = deliveryId ? stops.find((s) => s.deliveryId === deliveryId) : undefined;
            if (stop) ordered.push(stop);
          }
          // Hanya pakai hasil server bila SEMUA stop terbawa (hindari rute kehilangan stop).
          if (ordered.length === stops.length && stops.length > 0) {
            return buildFixedOrderRoute(ordered, opts.depot);
          }
        } catch (err) {
          console.warn('[useOptimizedRoute] server optimize gagal, fallback lokal:', err);
        }
      }
      return buildOptimizedRoute(stops, { depot: opts.depot ?? undefined });
    },
    enabled: deliveriesLoaded && stops.length > 0,
    staleTime: 5 * 60_000,
  });

  return { ...result, queryKey };
}
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { useSyncStore } from '@/stores/sync-store';
import type { CourierDelivery, DeliveryDetail } from '@/lib/types';

export const deliveriesKeys = {
  all: ['deliveries'] as const,
  today: ['deliveries', 'today'] as const,
  detail: (id: number) => ['deliveries', String(id)] as const,
};

interface TodayResponse {
  ok: boolean;
  deliveries: CourierDelivery[];
}

interface DetailResponse {
  ok: boolean;
  delivery: DeliveryDetail;
}

async function fetchToday(): Promise<CourierDelivery[]> {
  const res = await apiRequest<TodayResponse>('/api/courier/deliveries/today', { method: 'GET' });
  return res.deliveries ?? [];
}

export function useTodayDeliveries() {
  const queryClient = useQueryClient();
  const cacheDeliveries = useSyncStore((s) => s.cacheDeliveries);

  return useQuery({
    queryKey: deliveriesKeys.today,
    queryFn: async () => {
      const data = await fetchToday();
      cacheDeliveries(data);
      return data;
    },
    staleTime: 60_000,
    placeholderData: () => queryClient.getQueryData<CourierDelivery[]>(deliveriesKeys.today),
  });
}

async function fetchDetail(id: number): Promise<DeliveryDetail> {
  const res = await apiRequest<DetailResponse>(`/api/courier/deliveries/${id}`, { method: 'GET' });
  return res.delivery;
}

export function useDeliveryDetail(id: number) {
  return useQuery({
    queryKey: deliveriesKeys.detail(id),
    queryFn: () => fetchDetail(id),
    staleTime: 30_000,
  });
}

export function invalidateDeliveries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: deliveriesKeys.today });
}
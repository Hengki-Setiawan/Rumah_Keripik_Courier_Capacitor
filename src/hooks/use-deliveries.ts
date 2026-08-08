import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { getDb } from '@/lib/db';
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
  const isOnline = useSyncStore((s) => s.isOnline);

  return useQuery({
    queryKey: deliveriesKeys.today,
    queryFn: async () => {
      if (isOnline) {
        try {
          const data = await fetchToday();
          cacheDeliveries(data);
          return data;
        } catch {
          // jaring jatuh di tengah request -> fall back ke cache lokal
        }
      }
      const db = await getDb();
      const cached = await db.getCachedDeliveries();
      return cached.length > 0 ? cached : [];
    },
    staleTime: 60_000,
    placeholderData: () => queryClient.getQueryData<CourierDelivery[]>(deliveriesKeys.today),
  });
}

async function fetchDetail(id: number): Promise<DeliveryDetail> {
  const res = await apiRequest<DetailResponse>(`/api/courier/deliveries/${id}`, { method: 'GET' });
  return res.delivery;
}

function deliveryFromCache(d: CourierDelivery): DeliveryDetail {
  return {
    id: d.id,
    idTransaksi: d.id_transaksi,
    status: d.status,
    orderStatus: '',
    kodePesanan: d.kode_pesanan,
    namaPenerima: d.customer_name,
    noHpPenerima: d.customer_phone,
    alamatPenerima: d.address,
    catatan: d.notes,
    totalBayar: 0,
    createdAt: d.created_at,
    routePoints: [],
    items: d.items?.map((it) => ({
      namaProduk: it.name,
      qty: it.quantity,
      harga: it.price,
      subtotal: it.price * it.quantity,
      beratGram: null,
    })),
  };
}

export function useDeliveryDetail(id: number) {
  const isOnline = useSyncStore((s) => s.isOnline);

  return useQuery({
    queryKey: deliveriesKeys.detail(id),
    queryFn: async () => {
      if (isOnline) {
        try {
          return await fetchDetail(id);
        } catch {
          // jaring jatuh -> fall back ke cache lokal
        }
      }
      const db = await getDb();
      const cached = await db.getCachedDeliveries();
      const hit = cached.find((d) => d.id === id);
      if (!hit) throw new Error(`delivery ${id} not found in cache`);
      return deliveryFromCache(hit);
    },
    staleTime: 30_000,
  });
}

export function invalidateDeliveries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: deliveriesKeys.today });
}
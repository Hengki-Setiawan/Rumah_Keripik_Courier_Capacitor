import { create } from 'zustand';
import type { CourierDelivery, DeliveryDetail, RouteWaypoint } from '@/lib/types';

interface DeliveryState {
  deliveries: CourierDelivery[];
  activeDelivery: DeliveryDetail | null;
  routeWaypoints: RouteWaypoint[];
  isLoading: boolean;
  error: string | null;
  setDeliveries: (d: CourierDelivery[]) => void;
  setActiveDelivery: (d: DeliveryDetail | null) => void;
  setRouteWaypoints: (w: RouteWaypoint[]) => void;
  updateDeliveryStatus: (id: number, status: CourierDelivery['status']) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
}

export const useDeliveryStore = create<DeliveryState>((set) => ({
  deliveries: [],
  activeDelivery: null,
  routeWaypoints: [],
  isLoading: false,
  error: null,

  setDeliveries: (deliveries) => set({ deliveries }),
  setActiveDelivery: (activeDelivery) => set({ activeDelivery }),
  setRouteWaypoints: (routeWaypoints) => set({ routeWaypoints }),

  updateDeliveryStatus: (id, status) =>
    set((s) => ({
      deliveries: s.deliveries.map((d) => (d.id === id ? { ...d, status } : d)),
      activeDelivery: s.activeDelivery && s.activeDelivery.id === id ? { ...s.activeDelivery, status } : s.activeDelivery,
    })),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));

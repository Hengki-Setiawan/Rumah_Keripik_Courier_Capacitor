import { create } from 'zustand';

export interface IncomingOffer {
  deliveryId?: number | string;
  assignmentId?: number | string;
  receivedAt: string;
}

interface OfferState {
  offer: IncomingOffer | null;
  busy: boolean;
  error: string | null;
  presentOffer: (o: IncomingOffer) => void;
  respond: (action: 'accept' | 'reject') => Promise<void>;
  dismiss: () => void;
}

export const useOfferStore = create<OfferState>((set, get) => ({
  offer: null,
  busy: false,
  error: null,

  presentOffer: (o) => {
    set({ offer: o, error: null });
  },

  async respond(action) {
    const offer = get().offer;
    if (!offer?.assignmentId || get().busy) return;
    set({ busy: true, error: null });
    try {
      const { apiRequest } = await import('@/lib/api-client');
      await apiRequest('/api/courier/offers/respond', {
        method: 'POST',
        body: { assignmentId: offer.assignmentId, action },
      });
      set({ offer: null, busy: false });
    } catch (e) {
      set({ busy: false, error: e instanceof Error ? e.message : 'Gagal merespons tawaran' });
    }
  },

  dismiss: () => set({ offer: null, busy: false, error: null }),
}));
import { create } from 'zustand';
import { flushSyncQueue, syncLocationBuffer, enqueueAction } from '@/lib/sync/offline-queue';
import { getDb } from '@/lib/db';
import type { CourierDelivery } from '@/lib/types';

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: string | null;
  pendingCount: number;
  setOnline: (v: boolean) => void;
  syncNow: () => Promise<{ synced: number; failed: number } | undefined>;
  syncLocations: () => Promise<void>;
  cacheDeliveries: (deliveries: CourierDelivery[]) => Promise<void>;
  refreshPendingCount: () => Promise<void>;
  enqueue: typeof enqueueAction;
  clearLocal: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  isOnline: true,
  isSyncing: false,
  lastSyncAt: null,
  pendingCount: 0,

  setOnline: (v) => {
    set({ isOnline: v });
    if (v) get().syncNow();
  },

  async syncNow() {
    if (get().isSyncing) return;
    if (!get().isOnline) return;
    set({ isSyncing: true });
    try {
      const result = await flushSyncQueue();
      await syncLocationBuffer();
      set({ lastSyncAt: new Date().toISOString() });
      await get().refreshPendingCount();
      return result;
    } finally {
      set({ isSyncing: false });
    }
  },

  async syncLocations() {
    try {
      await syncLocationBuffer();
    } catch {
      // ignore
    }
  },

  async cacheDeliveries(deliveries) {
    const db = await getDb();
    await db.upsertDeliveries(deliveries);
    await get().refreshPendingCount();
  },

  async refreshPendingCount() {
    const db = await getDb();
    const queue = await db.listPendingQueue();
    const locations = await db.listUnsyncedLocations(1);
    set({ pendingCount: queue.length + locations.length });
  },

  enqueue: enqueueAction,

  async clearLocal() {
    const db = await getDb();
    await db.reset();
    set({ pendingCount: 0, lastSyncAt: null });
  },
}));
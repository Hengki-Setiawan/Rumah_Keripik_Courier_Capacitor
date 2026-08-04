import { isNative } from '../env';
import type { CourierDelivery } from '../types';

export interface DbClient {
  init(): Promise<void>;
  getCachedDeliveries(): Promise<CourierDelivery[]>;
  upsertDeliveries(deliveries: CourierDelivery[]): Promise<void>;
  enqueue(item: QueueItem): Promise<void>;
  listPendingQueue(): Promise<QueueItem[]>;
  markQueueItem(queueId: number, synced: boolean): Promise<void>;
  bufferLocation(point: BufferedPoint): Promise<void>;
  listUnsyncedLocations(limit?: number): Promise<BufferedPoint[]>;
  markLocationsSynced(ids: number[]): Promise<void>;
  setMeta(key: string, value: string): Promise<void>;
  getMeta(key: string): Promise<string | null>;
  reset(): Promise<void>;
}

export interface QueueItem {
  id?: number;
  entityType: string;
  entityId: string;
  action: string;
  payloadJson: string;
  priority: 'high' | 'normal';
  attempts: number;
  createdAt: string;
}

export interface BufferedPoint {
  id?: number;
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  timestamp: number;
}

const WEB_DB_KEY = 'rk.localdb';

interface WebDbShape {
  deliveries: CourierDelivery[];
  queue: QueueItem[];
  locations: BufferedPoint[];
  meta: Record<string, string>;
}

function emptyWebDb(): WebDbShape {
  return { deliveries: [], queue: [], locations: [], meta: {} };
}

async function readWebDb(): Promise<WebDbShape> {
  try {
    const raw = window.localStorage.getItem(WEB_DB_KEY);
    if (!raw) return emptyWebDb();
    return JSON.parse(raw) as WebDbShape;
  } catch {
    return emptyWebDb();
  }
}

async function writeWebDb(db: WebDbShape): Promise<void> {
  window.localStorage.setItem(WEB_DB_KEY, JSON.stringify(db));
}

class WebDbClient implements DbClient {
  async init(): Promise<void> {}

  async getCachedDeliveries(): Promise<CourierDelivery[]> {
    const db = await readWebDb();
    return [...db.deliveries].sort((a, b) => (a.route_order ?? 0) - (b.route_order ?? 0));
  }

  async upsertDeliveries(deliveries: CourierDelivery[]): Promise<void> {
    const db = await readWebDb();
    const map = new Map(db.deliveries.map((d) => [d.id, d]));
    for (const d of deliveries) map.set(d.id, { ...d });
    db.deliveries = [...map.values()];
    await writeWebDb(db);
  }

  async enqueue(item: QueueItem): Promise<void> {
    const db = await readWebDb();
    db.queue.push({ ...item, id: db.queue.length + 1 });
    await writeWebDb(db);
  }

  async listPendingQueue(): Promise<QueueItem[]> {
    const db = await readWebDb();
    return db.queue
      .filter((q) => q.attempts < 5)
      .sort((a, b) => (a.priority === 'high' ? -1 : 1) - (b.priority === 'high' ? -1 : 1));
  }

  async markQueueItem(queueId: number, synced: boolean): Promise<void> {
    const db = await readWebDb();
    const item = db.queue.find((q) => q.id === queueId);
    if (item) {
      if (synced) {
        db.queue = db.queue.filter((q) => q.id !== queueId);
      } else {
        item.attempts += 1;
      }
    }
    await writeWebDb(db);
  }

  async bufferLocation(point: BufferedPoint): Promise<void> {
    const db = await readWebDb();
    db.locations.push({ ...point, id: db.locations.length + 1 });
    await writeWebDb(db);
  }

  async listUnsyncedLocations(limit = 100): Promise<BufferedPoint[]> {
    const db = await readWebDb();
    return db.locations.slice(0, limit);
  }

  async markLocationsSynced(ids: number[]): Promise<void> {
    const db = await readWebDb();
    const idSet = new Set(ids);
    db.locations = db.locations.filter((l) => !(l.id !== undefined && idSet.has(l.id)));
    await writeWebDb(db);
  }

  async setMeta(key: string, value: string): Promise<void> {
    const db = await readWebDb();
    db.meta[key] = value;
    await writeWebDb(db);
  }

  async getMeta(key: string): Promise<string | null> {
    const db = await readWebDb();
    return db.meta[key] ?? null;
  }

  async reset(): Promise<void> {
    window.localStorage.removeItem(WEB_DB_KEY);
  }
}

let client: DbClient | null = null;

export async function getDb(): Promise<DbClient> {
  if (client) return client;
  if (isNative) {
    const { createNativeDb } = await import('./native-db');
    client = await createNativeDb();
  } else {
    client = new WebDbClient();
  }
  await client.init();
  return client;
}
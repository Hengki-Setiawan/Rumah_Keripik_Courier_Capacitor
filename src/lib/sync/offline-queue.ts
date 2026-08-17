import { getDb, type BufferedPoint, type QueueItem } from '../db';
import { apiRequest } from '../api-client';
import { isNative } from '../env';

export interface OfflineActionInput {
  entityType: string;
  entityId: string;
  action: string;
  payload: Record<string, unknown>;
  priority?: 'high' | 'normal';
}

const BACKOFF_MS = [2000, 5000, 15000, 60000, 300000];

function backoffDelayMs(attempts: number): number {
  return BACKOFF_MS[Math.min(attempts, BACKOFF_MS.length - 1)];
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function enqueueAction(input: OfflineActionInput): Promise<QueueItem | undefined> {
  if (!isNative) {
    try {
      await sendNow(input);
      return undefined;
    } catch {
      // jatuh ke antrian
    }
  }
  const db = await getDb();
  const item: QueueItem = {
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    payloadJson: JSON.stringify(input.payload),
    priority: input.priority ?? 'normal',
    attempts: 0,
    createdAt: new Date().toISOString(),
  };
  await db.enqueue(item);
  return item;
}

async function sendNow(input: OfflineActionInput): Promise<void> {
  const { entityType, entityId, action, payload } = input;
  const url =
    entityType === 'delivery'
      ? `/api/courier/deliveries/${entityId}/${action}`
      : entityType === 'incident'
        ? `/api/courier/incidents`
        : entityType === 'sos'
          ? `/api/courier/sos`
          : '';
  if (!url) throw new Error(`unknown entityType ${entityType}`);
  await apiRequest(url, { method: 'POST', body: JSON.stringify(payload) });
}

export async function flushSyncQueue(): Promise<{ synced: number; failed: number }> {
  const db = await getDb();
  const items = await db.listPendingQueue();
  let synced = 0;
  let failed = 0;
  for (const item of items) {
    try {
      const payload = JSON.parse(item.payloadJson) as Record<string, unknown>;
      await sendNow({
        entityType: item.entityType,
        entityId: item.entityId,
        action: item.action,
        payload,
        priority: item.priority,
      });
      await db.markQueueItem(item.id!, true);
      synced += 1;
    } catch {
      await db.markQueueItem(item.id!, false);
      failed += 1;
      await sleep(backoffDelayMs(item.attempts));
    }
  }
  return { synced, failed };
}

export async function syncLocationBuffer(): Promise<void> {
  const db = await getDb();
  const points = await db.listUnsyncedLocations(100);
  if (points.length === 0) return;
  try {
    await apiRequest('/api/courier/location/batch', {
      method: 'POST',
      body: JSON.stringify({
        locations: points.map((p: BufferedPoint) => ({
          lat: p.lat,
          lng: p.lng,
          accuracy: p.accuracy,
          speed: p.speed,
          timestamp: p.timestamp,
        })),
      }),
    });
    const ids = points.filter((p): p is BufferedPoint & { id: number } => p.id !== undefined).map((p) => p.id);
    await db.markLocationsSynced(ids);
  } catch {
    // retry pada flush berikutnya
  }
}

export { backoffDelayMs };
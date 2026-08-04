import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite';
import type { BufferedPoint, DbClient, QueueItem } from './index';
import type { CourierDelivery } from '../types';

const DB_NAME = 'rumah_keripik_courier';

type SqlRow = Record<string, unknown>;

function deliveryFromRow(row: SqlRow): CourierDelivery {
  return {
    id: row.id as number,
    id_transaksi: row.id_transaksi as string,
    kode_pesanan: row.kode_pesanan as string,
    status: row.status as CourierDelivery['status'],
    created_at: row.created_at as string,
    customer_name: (row.customer_name ?? '') as string,
    customer_phone: (row.customer_phone ?? '') as string,
    address: (row.address ?? '') as string,
    latitude: (row.latitude ?? null) as string | null,
    longitude: (row.longitude ?? null) as string | null,
    distance_km: (row.distance_km ?? null) as string | null,
    notes: (row.notes ?? null) as string | null,
    route_order: (row.route_order ?? null) as number | null,
    items: row.items_json ? JSON.parse(row.items_json as string) : undefined,
  };
}

class NativeDbClient implements DbClient {
  private conn: SQLiteDBConnection | null = null;

  private c(): SQLiteDBConnection {
    if (!this.conn) throw new Error('DB not initialized');
    return this.conn;
  }

  async init(): Promise<void> {
    const sqlite = new SQLiteConnection(CapacitorSQLite);
    await sqlite.checkConnectionsConsistency();
    let conn = await sqlite.retrieveConnection(DB_NAME, false);
    if (!conn) {
      conn = await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
    }
    await conn.open();
    this.conn = conn;
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS deliveries_cache (
        id INTEGER PRIMARY KEY,
        id_transaksi TEXT NOT NULL,
        kode_pesanan TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        customer_name TEXT,
        customer_phone TEXT,
        address TEXT,
        latitude TEXT,
        longitude TEXT,
        distance_km TEXT,
        notes TEXT,
        route_order INTEGER,
        items_json TEXT
      );
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        priority TEXT DEFAULT 'normal',
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 5,
        status TEXT DEFAULT 'pending',
        next_retry_at TEXT,
        created_at TEXT NOT NULL,
        synced_at TEXT
      );
      CREATE TABLE IF NOT EXISTS location_buffer (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        accuracy REAL,
        speed REAL,
        timestamp INTEGER NOT NULL,
        synced INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
  }

  async getCachedDeliveries(): Promise<CourierDelivery[]> {
    const res = await this.c().query('SELECT * FROM deliveries_cache ORDER BY route_order ASC');
    return (res.values ?? []).map(deliveryFromRow);
  }

  async upsertDeliveries(deliveries: CourierDelivery[]): Promise<void> {
    for (const d of deliveries) {
      await this.c().run(
        `INSERT OR REPLACE INTO deliveries_cache
          (id, id_transaksi, kode_pesanan, status, created_at, customer_name, customer_phone,
           address, latitude, longitude, distance_km, notes, route_order, items_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          d.id,
          d.id_transaksi,
          d.kode_pesanan,
          d.status,
          d.created_at,
          d.customer_name,
          d.customer_phone,
          d.address,
          d.latitude,
          d.longitude,
          d.distance_km,
          d.notes,
          d.route_order,
          d.items ? JSON.stringify(d.items) : null,
        ],
      );
    }
  }

  async enqueue(item: QueueItem): Promise<void> {
    await this.c().run(
      `INSERT INTO sync_queue (entity_type, entity_id, action, payload_json, priority, attempts, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [item.entityType, item.entityId, item.action, item.payloadJson, item.priority, item.attempts, item.createdAt],
    );
  }

  async listPendingQueue(): Promise<QueueItem[]> {
    const res = await this.c().query('SELECT * FROM sync_queue WHERE attempts < 5 ORDER BY id ASC');
    return (res.values ?? []).map((row: SqlRow) => ({
      id: row.id as number,
      entityType: row.entity_type as string,
      entityId: row.entity_id as string,
      action: row.action as string,
      payloadJson: row.payload_json as string,
      priority: row.priority as QueueItem['priority'],
      attempts: row.attempts as number,
      createdAt: row.created_at as string,
    }));
  }

  async markQueueItem(queueId: number, synced: boolean): Promise<void> {
    if (synced) {
      await this.c().run('DELETE FROM sync_queue WHERE id = ?', [queueId]);
    } else {
      await this.c().run('UPDATE sync_queue SET attempts = attempts + 1 WHERE id = ?', [queueId]);
    }
  }

  async bufferLocation(point: BufferedPoint): Promise<void> {
    await this.c().run(
      'INSERT INTO location_buffer (lat, lng, accuracy, speed, timestamp) VALUES (?, ?, ?, ?, ?)',
      [point.lat, point.lng, point.accuracy ?? null, point.speed ?? null, point.timestamp],
    );
  }

  async listUnsyncedLocations(limit = 100): Promise<BufferedPoint[]> {
    const res = await this.c().query('SELECT * FROM location_buffer WHERE synced = 0 ORDER BY id ASC LIMIT ?', [limit]);
    return (res.values ?? []).map((row: SqlRow) => ({
      id: row.id as number,
      lat: row.lat as number,
      lng: row.lng as number,
      accuracy: (row.accuracy ?? undefined) as number | undefined,
      speed: (row.speed ?? undefined) as number | undefined,
      timestamp: row.timestamp as number,
    }));
  }

  async markLocationsSynced(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(',');
    await this.c().run(`UPDATE location_buffer SET synced = 1 WHERE id IN (${placeholders})`, ids);
  }

  async setMeta(key: string, value: string): Promise<void> {
    await this.c().run('INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)', [key, value]);
  }

  async getMeta(key: string): Promise<string | null> {
    const res = await this.c().query('SELECT value FROM app_meta WHERE key = ?', [key]);
    const row = res.values?.[0];
    return row ? (row.value as string) : null;
  }

  async reset(): Promise<void> {
    await this.c().execute(
      'DELETE FROM deliveries_cache; DELETE FROM sync_queue; DELETE FROM location_buffer; DELETE FROM app_meta;',
    );
  }
}

export async function createNativeDb(): Promise<DbClient> {
  const client = new NativeDbClient();
  await client.init();
  return client;
}
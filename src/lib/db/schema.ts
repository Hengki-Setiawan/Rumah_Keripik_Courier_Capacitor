import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const deliveriesCache = sqliteTable('deliveries_cache', {
  id: integer('id').primaryKey(),
  idTransaksi: text('id_transaksi').notNull(),
  kodePesanan: text('kode_pesanan').notNull(),
  status: text('status').notNull(),
  createdAt: text('created_at').notNull(),
  customerName: text('customer_name'),
  customerPhone: text('customer_phone'),
  address: text('address'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  distanceKm: real('distance_km'),
  notes: text('notes'),
  routeOrder: integer('route_order'),
  itemsJson: text('items_json'),
  updatedAt: text('updated_at'),
});

export const syncQueue = sqliteTable('sync_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(),
  payloadJson: text('payload_json').notNull(),
  priority: text('priority').default('normal'),
  attempts: integer('attempts').default(0),
  maxAttempts: integer('max_attempts').default(5),
  status: text('status').default('pending'),
  nextRetryAt: text('next_retry_at'),
  createdAt: text('created_at').notNull(),
  syncedAt: text('synced_at'),
});

export const locationBuffer = sqliteTable('location_buffer', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  accuracy: real('accuracy'),
  speed: real('speed'),
  timestamp: integer('timestamp').notNull(),
  synced: integer('synced').default(0),
});

export const routeCacheTable = sqliteTable('route_cache', {
  cacheKey: text('cache_key').primaryKey(),
  payloadJson: text('payload_json').notNull(),
  savedAt: integer('saved_at').notNull(),
});

export const appMeta = sqliteTable('app_meta', {
  key: text('key').primaryKey(),
  value: text('value'),
});
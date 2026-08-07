import type { OptimizedRoute } from './types';
import { getDb } from '@/lib/db';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function getCachedRoute(cacheKey: string): Promise<OptimizedRoute | null> {
  try {
    const db = await getDb();
    const entry = await db.getRouteCache(cacheKey);
    if (!entry) return null;
    if (Date.now() - entry.savedAt > CACHE_TTL_MS) {
      return null;
    }
    const route = JSON.parse(entry.payloadJson) as OptimizedRoute;
    return route ?? null;
  } catch {
    return null;
  }
}

export async function setCachedRoute(cacheKey: string, route: OptimizedRoute): Promise<void> {
  try {
    const db = await getDb();
    await db.setRouteCache(cacheKey, JSON.stringify(route), Date.now());
  } catch {
    // storage penuh / private mode - abaikan, rute tetap bisa dihitung ulang
  }
}

/** Bersihkan entri cache yang lebih tua dari TTL (dipanggil saat app start). */
export async function pruneRouteCache(): Promise<void> {
  try {
    const db = await getDb();
    await db.pruneRouteCache(CACHE_TTL_MS);
  } catch {
    // best-effort
  }
}
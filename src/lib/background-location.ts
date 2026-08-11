import { registerPlugin } from '@capacitor/core';
import type {
  BackgroundGeolocationPlugin,
  Location,
  CallbackError,
} from '@capacitor-community/background-geolocation';
import { isNative } from './env';
import { getDb } from './db';
import { syncLocationBuffer } from './sync/offline-queue';
import type { TrackedLocation } from './location';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

/**
 * Background location tracking berbasis @capacitor-community/background-geolocation.
 *
 * Filosofi dipertahankan dari location.ts lama:
 * 1. Tulis SETIAP titik lokasi ke `location_buffer` lokal (SQLite) — murni disk I/O,
 *    tidak pernah bergantung pada network (Android throttle HTTP WebView di background).
 * 2. Sync terpisah mengirim batch ke server via CapacitorHttp (sudah di syncLocationBuffer).
 * 3. `getAccuracyForSpeed()` (adaptive ping) dipertahankan sebagai logika bisnis murni.
 */

const SYNC_INTERVAL_MS = 15_000;

let watcherId: string | null = null;
let syncTimer: ReturnType<typeof setInterval> | null = null;
let webWatchId: number | null = null;

// Feed posisi live ke konsumen React (navigasi). Background watcher tetap aktif
// saat app di-background, sehingga navigasi+suara jalan terus meski keluar app.
type LocationFeedListener = (loc: TrackedLocation) => void;
const locationFeedListeners = new Set<LocationFeedListener>();

export function subscribeLocationFeed(listener: LocationFeedListener): () => void {
  locationFeedListeners.add(listener);
  return () => { locationFeedListeners.delete(listener); };
}

function toTrackedLocation(loc: Location): TrackedLocation {
  return {
    lat: loc.latitude,
    lng: loc.longitude,
    accuracy: loc.accuracy,
    speed: loc.speed == null ? undefined : loc.speed * 3.6, // m/s -> km/h
    timestamp: loc.time ?? Date.now(),
  };
}

function handleLocation(loc: TrackedLocation): void {
  // Teruskan ke konsumen live (state navigasi) - dijalankan apa adanya.
  for (const listener of locationFeedListeners) {
    try { listener(loc); } catch { }
  }
  void (async () => {
    try {
      const db = await getDb();
      await db.bufferLocation({
        lat: loc.lat,
        lng: loc.lng,
        accuracy: loc.accuracy,
        speed: loc.speed,
        timestamp: loc.timestamp,
      });
    } catch {
      // buffer gagal — abaikan, jangan mulai tracking ulang
    }
  })();
}

// Start background watcher (native Capacitor) — dipanggil saat shift aktif.
async function startNativeWatcher(): Promise<void> {
  const id = await BackgroundGeolocation.addWatcher(
    {
      backgroundMessage: 'Melacak lokasi kurir untuk update posisi. Matikan di pengaturan battery bila tak digunakan.',
      backgroundTitle: 'Rumah Keripik — Lacak Lokasi',
      requestPermissions: true,
      stale: false,
      distanceFilter: 5,
    },
    (position?: Location, error?: CallbackError) => {
      if (error) return;
      if (position) handleLocation(toTrackedLocation(position));
    },
  );
  watcherId = id;
  startSyncTimer();
}

function startWebWatcher(): void {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return;
  webWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      handleLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        speed: pos.coords.speed ?? undefined,
        timestamp: pos.timestamp,
      });
    },
    () => undefined,
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
  );
  startSyncTimer();
}

function startSyncTimer(): void {
  if (syncTimer) return;
  syncTimer = setInterval(() => {
    void syncLocationBuffer();
  }, SYNC_INTERVAL_MS);
}

function stopSyncTimer(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}

export async function startLocationTracking(): Promise<void> {
  if (isNative) {
    await startNativeWatcher();
  } else {
    startWebWatcher();
  }
}

export async function stopLocationTracking(): Promise<void> {
  if (isNative && watcherId) {
    try {
      await BackgroundGeolocation.removeWatcher({ id: watcherId });
    } catch {
      // ignore
    }
    watcherId = null;
  }
  if (webWatchId != null && typeof navigator !== 'undefined' && navigator.geolocation) {
    navigator.geolocation.clearWatch(webWatchId);
    webWatchId = null;
  }
  // flush apa yang tersisa sekali sebelum berhenti
  try {
    await syncLocationBuffer();
  } catch {
    // ignore
  }
  stopSyncTimer();
}

export function isTrackingActive(): boolean {
  return watcherId !== null || webWatchId !== null;
}
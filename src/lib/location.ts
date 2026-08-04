import { isNative } from './env';

export interface TrackedLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  timestamp: number;
}

export interface AccuracySpec {
  intervalMs: number;
  distanceFilterM: number;
  accuracyM: number;
  label: 'parked' | 'walking' | 'driving' | 'fast';
}

export function getAccuracyForSpeed(speedKmh: number | null | undefined): AccuracySpec {
  if (speedKmh == null || speedKmh < 3) {
    return { intervalMs: 10_000, distanceFilterM: 0, accuracyM: 10, label: 'parked' };
  }
  if (speedKmh < 20) {
    return { intervalMs: 15_000, distanceFilterM: 10, accuracyM: 25, label: 'walking' };
  }
  if (speedKmh < 60) {
    return { intervalMs: 30_000, distanceFilterM: 30, accuracyM: 50, label: 'driving' };
  }
  return { intervalMs: 60_000, distanceFilterM: 100, accuracyM: 100, label: 'fast' };
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isWithinGeofence(lat: number, lng: number, centerLat: number, centerLng: number, radiusM: number): boolean {
  return haversineKm(lat, lng, centerLat, centerLng) * 1000 <= radiusM;
}

export async function getCurrentPosition(): Promise<TrackedLocation | null> {
  if (isNative) {
    const { Geolocation } = await import('@capacitor/geolocation');
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10_000,
    });
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      speed: pos.coords.speed ?? undefined,
      timestamp: pos.timestamp,
    };
  }

  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed ?? undefined,
          timestamp: pos.timestamp,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  });
}
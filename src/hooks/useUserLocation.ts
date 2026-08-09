import { useEffect, useState } from 'react';
import { isNative } from '@/lib/env';
import { haversineKm, type TrackedLocation } from '@/lib/location';

/** Abaikan fix dengan akurasi lebih buruk dari ini (indoor/satelit hilang). */
const MAX_ACCURACY_M = 80;

/** Pantau posisi kurir secara live (watchPosition). Dipakai untuk marker kurir di peta. */
export function useUserLocation(enabled = true): TrackedLocation | null {
  const [loc, setLoc] = useState<TrackedLocation | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let capId: string | null = null;
    let webWatchId: number | null = null;
    let last: TrackedLocation | null = null;
    let lastTime = 0;

    function acceptGPS(lat: number, lng: number, accuracy: number | undefined, speed: number | undefined, timestamp: number) {
      if (!active) return;
      // 1. Tolak fix tanpa akurasi atau akurasi buruk (di luar bangku/indoor).
      if (accuracy == null || accuracy > MAX_ACCURACY_M) return;

      const now = timestamp;
      const dtSec = (now - lastTime) / 1000;
      lastTime = now;

      // 2. Jitter filter: lompatan > 250 m dalam < 10 detik = noise GPS (kecuali kecepatan tinggi wajar).
      if (last) {
        const dKm = haversineKm(lat, lng, last.lat, last.lng);
        const dM = dKm * 1000;
        const spdKmh = speed ?? 0;
        const plausibleJumpM = 250 + spdKmh * (dtSec / 3.6) * 2;
        if (dtSec < 30 && dM > plausibleJumpM) return;
      }

      last = { lat, lng, accuracy, speed: speed ?? undefined, timestamp: now };
      setLoc(last);
    }

    async function start() {
      if (isNative) {
        try {
          const { Geolocation } = await import('@capacitor/geolocation');
          capId = await Geolocation.watchPosition(
            { enableHighAccuracy: true, timeout: 15_000 },
            (pos, err) => {
              if (err || !pos || !active) return;
              acceptGPS(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, pos.coords.speed ?? undefined, pos.timestamp);
            },
          );
        } catch {
          // izin geolocation ditolak - tanpa marker live
        }
      } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
        webWatchId = navigator.geolocation.watchPosition(
          (pos) => {
            if (!active) return;
            acceptGPS(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, pos.coords.speed ?? undefined, pos.timestamp);
          },
          () => {},
          { enableHighAccuracy: true, timeout: 15_000, maximumAge: 5_000 },
        );
      }
    }
    void start();

    return () => {
      active = false;
      if (capId) {
        import('@capacitor/geolocation').then(({ Geolocation }) => {
          void Geolocation.clearWatch({ id: capId as string });
        });
      }
      if (webWatchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(webWatchId);
      }
    };
  }, [enabled]);

  return loc;
}
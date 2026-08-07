import { useEffect, useState } from 'react';
import { isNative } from '@/lib/env';
import type { TrackedLocation } from '@/lib/location';

/** Pantau posisi kurir secara live (watchPosition). Dipakai untuk marker kurir di peta. */
export function useUserLocation(enabled = true): TrackedLocation | null {
  const [loc, setLoc] = useState<TrackedLocation | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let capId: string | null = null;
    let webWatchId: number | null = null;

    async function start() {
      if (isNative) {
        try {
          const { Geolocation } = await import('@capacitor/geolocation');
          capId = await Geolocation.watchPosition(
            { enableHighAccuracy: true, timeout: 15_000 },
            (pos, err) => {
              if (err || !pos || !active) return;
              setLoc({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                speed: pos.coords.speed ?? undefined,
                timestamp: pos.timestamp,
              });
            },
          );
        } catch {
          // izin geolocation ditolak - tanpa marker live
        }
      } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
        webWatchId = navigator.geolocation.watchPosition(
          (pos) => {
            if (!active) return;
            setLoc({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              speed: pos.coords.speed ?? undefined,
              timestamp: pos.timestamp,
            });
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
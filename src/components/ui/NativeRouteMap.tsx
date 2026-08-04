import { useEffect, useRef } from 'react';
import { isNative, GOOGLE_MAPS_API_KEY } from '@/lib/env';
import type { RouteWaypoint } from '@/lib/types';
import { getCurrentPosition } from '@/lib/location';

interface Props {
  waypoints: RouteWaypoint[];
}

const WAREHOUSE = { lat: -5.134, lng: 119.4135 };

/**
 * Peta rute native via @capacitor/google-maps.
 * Android: native MapView di-overlay di atas elemen <capacitor-google-map>.
 * Web / tanpa API key: fallback ke placeholder statis agar tidak crash.
 */
export default function NativeRouteMap({ waypoints }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!isNative || !GOOGLE_MAPS_API_KEY || initialized.current) return;
    let map: import('@capacitor/google-maps').GoogleMap | null = null;

    (async () => {
      const { GoogleMap } = await import('@capacitor/google-maps');
      const element = document.getElementById('courier-route-map');
      if (!element) return;

      map = await GoogleMap.create({
        id: 'courier-route-map',
        element,
        apiKey: GOOGLE_MAPS_API_KEY,
        config: {
          center: WAREHOUSE,
          zoom: 12,
        },
      });

      await map.enableCurrentLocation(true);

      const points = waypoints
        .filter((w) => w.lat !== 0 && w.lng !== 0)
        .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

      if (points.length > 0) {
        const markers = points.map((w, i) => ({
          coordinate: { lat: w.lat, lng: w.lng },
          title: `${i + 1}. ${w.customerName ?? 'Pelanggan'}`,
        }));
        await map.addMarkers(markers);

        const polyline = [
          WAREHOUSE,
          ...points.map((w) => ({ lat: w.lat, lng: w.lng })),
        ];
        await map.addPolylines([
          {
            path: polyline,
            strokeColor: '#D97706',
            strokeWeight: 4,
          } as import('@capacitor/google-maps').Polyline,
        ]);

        const pos = await getCurrentPosition().catch(() => null);
        if (pos) {
          await map.setCamera({
            coordinate: { lat: pos.lat, lng: pos.lng },
            zoom: 13,
          });
        }
      }
      initialized.current = true;
    })();

    return () => {
      if (map) void map.destroy();
      initialized.current = false;
    };
  }, [waypoints]);

  if (!isNative || !GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-umber-700 bg-umber-900/60 p-4 text-center">
        <p className="text-xs text-umber-400">
          {isNative
            ? 'Peta tidak aktif — atur VITE_GOOGLE_MAPS_API_KEY saat build.'
            : 'Peta native hanya tampil di aplikasi Android (Capacitor).'}
        </p>
      </div>
    );
  }

  return (
    <div ref={mapRef} className="relative h-64 w-full overflow-hidden rounded-2xl border border-umber-800">
      <capacitor-google-map
        id="courier-route-map"
        className="block h-full w-full"
        style={{ display: 'inline-block', width: '100%', height: '100%' }}
      />
    </div>
  );
}
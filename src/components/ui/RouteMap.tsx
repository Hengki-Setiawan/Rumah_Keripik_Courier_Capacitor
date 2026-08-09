import { useEffect, useRef, useMemo } from 'react';
import Map, { Source, Layer, Marker, type MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { TriangleAlert, Navigation } from 'lucide-react';
import { MAP_STYLE_LIGHT } from '@/lib/map/tileStyle';
import { WAREHOUSE } from '@/lib/routing/types';
import { globalTokens } from '@/tokens/global';
import { openExternalNavigation } from '@/lib/openMaps';
import type { OptimizedRoute, RouteWaypoint } from '@/lib/routing/types';
import { cn } from '@/lib/cn';

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch {
    return true;
  }
}

interface RouteMapProps {
  route: OptimizedRoute | null;
  activeStopIndex?: number;
  onStopMarkerPress?: (deliveryId: string) => void;
  userLocation?: { lat: number; lng: number } | null;
  snappedLocation?: { lat: number; lng: number } | null;
  userBearing?: number | null;
  offRoute?: boolean;
  offRouteDeviationM?: number | null;
  followMode?: boolean;
  onFollowModeChange?: (on: boolean) => void;
  navigationMode?: boolean;
  showAllRoutes?: boolean;
}

/** Posisi marker setelah spread (jika koordinat berdekatan) — memakai tipe waypoint. */
type SpreadStop = {
  deliveryId: string;
  sequence: number;
  lat: number;
  lng: number;
  customerName?: string;
  address?: string;
};

/**
 * Beri jarak (spiderfy) antar marker yang koordinatnya berdekatan (< ~40 m)
 * agar tidak saling menumpuk di peta. Urutan dikembalikan sesuai sequence.
 */
function spreadStops(stops: RouteWaypoint[]): SpreadStop[] {
  const groups: Array<{ origin: SpreadStop; members: SpreadStop[] }> = [];

  for (const s of stops) {
    const wp: SpreadStop = { deliveryId: s.deliveryId, sequence: s.sequence, lat: Number(s.lat), lng: Number(s.lng), customerName: s.customerName, address: s.address };
    const hit = groups.find((g) => Math.hypot(g.origin.lat - wp.lat, g.origin.lng - wp.lng) < 0.0004);
    if (hit) {
      hit.members.push(wp);
    } else {
      groups.push({ origin: wp, members: [wp] });
    }
  }

  const out: SpreadStop[] = [];
  for (const g of groups) {
    const n = g.members.length;
    if (n === 1) {
      out.push(g.origin);
      continue;
    }
    const radius = 0.00015 + (n - 1) * 0.0001;
    g.members.forEach((m, k) => {
      const ang = (Math.PI * 2 * k) / n - Math.PI / 2;
      out.push({ ...m, lat: g.origin.lat + Math.cos(ang) * radius, lng: g.origin.lng + Math.sin(ang) * radius });
    });
  }
  return out.sort((a, b) => a.sequence - b.sequence);
}

function StopMarkerIcon({ number, active }: { number: number; active?: boolean }) {
  return (
    <div className="relative flex flex-col items-center">
      {active && <span className="absolute -inset-1 animate-ping rounded-full bg-brand/40" />}
      <div
        className={cn(
          'relative flex size-8 items-center justify-center rounded-full text-sm font-bold text-on-accent shadow-card',
          active ? 'bg-brand ring-2 ring-white' : 'bg-brand-pressed',
        )}
      >
        {number}
      </div>
      <span className="mt-0.5 h-2 w-0.5 rounded-b bg-ink-muted/70" />
    </div>
  );
}

function CourierMarkerIcon({ bearing, offRoute }: { bearing?: number | null; offRoute?: boolean }) {
  return (
    <div
      className={cn(
        'relative flex size-8 items-center justify-center rounded-full shadow-card ring-2 transition-colors duration-300',
        offRoute ? 'bg-warn ring-warn/60' : 'bg-ok ring-white',
      )}
      style={bearing != null ? { transform: `rotate(${bearing}deg)` } : undefined}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="2"
        className="text-on-accent"
      >
        <path d="M12 2l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4L12 2z" />
      </svg>
    </div>
  );
}

/** Fallback saat WebGL tidak tersedia (device low-end, D-016) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â peta tidak bisa dirender. */
function WebGlFallback({ route }: { route: OptimizedRoute | null }) {
  const stops = route?.orderedStops ?? [];
  return (
    <div className="absolute inset-0 z-0 overflow-y-auto bg-surface">
      <div className="flex flex-col gap-3 px-4 pb-8 pt-[calc(env(safe-area-inset-top)+64px)]">
        <div className="flex items-center gap-3 rounded-2xl bg-warn-soft px-4 py-3 text-warn shadow-card">
          <TriangleAlert className="size-5 shrink-0" />
          <p className="text-sm">
            Peta tidak didukung di perangkat ini (WebGL tidak tersedia). Daftar titik tetap bisa dipakai untuk navigasi.
          </p>
        </div>
        {stops.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink-secondary">Belum ada titik pengiriman hari ini.</p>
        ) : (
          stops.map((stop, idx) => (
            <div key={stop.deliveryId} className="flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-card">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-on-accent">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{stop.customerName ?? 'Pelanggan'}</p>
                <p className="truncate text-xs text-ink-secondary">{stop.address ?? 'Alamat tersedia di detail'}</p>
              </div>
              <button
                aria-label={`Navigasi ke titik ${idx + 1}`}
                onClick={() => openExternalNavigation(stop.lat, stop.lng)}
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand active:scale-95 transition-transform"
              >
                <Navigation className="size-5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function RouteMap({
  route,
  activeStopIndex = 0,
  onStopMarkerPress,
  userLocation,
  snappedLocation,
  userBearing,
  offRoute,
  offRouteDeviationM,
  followMode = true,
  onFollowModeChange,
  navigationMode = false,
  showAllRoutes = false,
}: RouteMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const webglSupported = useMemo(() => supportsWebGL(), []);
  const followModeRef = useRef(followMode);
  followModeRef.current = followMode;

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !route || route.orderedStops.length === 0) return;
    const coords: [number, number][] = route.orderedStops.map((s) => [s.lng, s.lat] as [number, number]);
    const lons = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    map.fitBounds(
      [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]] as [[number, number], [number, number]],
      { padding: { top: 90, bottom: 300, left: 40, right: 40 }, duration: 600 },
    );
  }, [route]);

  // Mode follow camera: easeTo posisi kurir setiap kali userLocation berubah.
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !userLocation || !followMode) return;
    map.easeTo({ 
      center: [userLocation.lng, userLocation.lat], 
      zoom: navigationMode ? 18 : Math.max(map.getZoom(), 14),
      pitch: navigationMode ? 60 : 0,
      duration: 300 
    });
  }, [userLocation, followMode, navigationMode]);

  const geojsonLine = useMemo(() => {
    // Saat navigasi: hanya rute dari posisi kurir menuju stop AKTIF.
    // (leg aktif di-overwrite oleh rerouteToStop agar mulai dari posisi kurir).
    if (navigationMode) {
      const stop = route?.orderedStops[activeStopIndex];
      if (!route || !stop) return null;

      const leg = route.legs[activeStopIndex];
      if (leg && leg.coordinates.length >= 2) {
        return {
          type: 'FeatureCollection' as const,
          features: [
            {
              type: 'Feature' as const,
              geometry: { type: 'LineString' as const, coordinates: leg.coordinates },
              properties: {},
            },
          ],
        };
      }

      // Fallback garis lurus dari posisi kurir menuju stop aktif.
      if (!userLocation) return null;
      return {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            geometry: { type: 'LineString' as const, coordinates: [[userLocation.lng, userLocation.lat], [stop.lng, stop.lat]] },
            properties: {},
          },
        ],
      };
    }

    // Bukan navigasi: seluruh rute hanya tampil jika tombol "Lihat Semua Rute" aktif.
    if (!showAllRoutes || !route) return null;
    const features = route.legs
      .filter((leg) => leg.coordinates && leg.coordinates.length >= 2)
      .map((leg) => ({
        type: 'Feature' as const,
        geometry: { type: 'LineString' as const, coordinates: leg.coordinates },
        properties: {},
      }));
    if (features.length === 0) return null;
    return { type: 'FeatureCollection' as const, features };
  }, [route, userLocation, navigationMode, activeStopIndex, showAllRoutes]);

  if (!webglSupported) return <WebGlFallback route={route} />;

  return (
    <div className="absolute inset-0 z-0">
      <Map
        ref={mapRef}
        mapStyle={MAP_STYLE_LIGHT}
        initialViewState={{ longitude: WAREHOUSE.lng, latitude: WAREHOUSE.lat, zoom: 12 }}
        style={{ width: '100%', height: '100%' }}
        attributionControl={{ compact: true }}
        onDragStart={() => {
          // Geser manual = user ingin eksplorasi peta -> matikan follow camera.
          if (followModeRef.current) onFollowModeChange?.(false);
        }}
      >
        {geojsonLine && (
          <Source id="route-line" type="geojson" data={geojsonLine}>
            <Layer
              id="route-line-outline"
              type="line"
              paint={{
                'line-color': globalTokens.white,
                'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 12, 8, 18, 13],
                'line-opacity': 0.9,
              }}
              layout={{ 'line-cap': 'round', 'line-join': 'round', visibility: 'visible' }}
            />
            <Layer
              id="route-line-main"
              type="line"
              paint={{
                'line-color': globalTokens.amber[500],
                'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 12, 5, 18, 9],
              }}
              layout={{ 'line-cap': 'round', 'line-join': 'round', visibility: 'visible' }}
            />
          </Source>
        )}


        {route && spreadStops(route.orderedStops).map((stop, idx) => (
          <Marker
            key={stop.deliveryId}
            longitude={stop.lng}
            latitude={stop.lat}
            anchor="bottom"
            onClick={() => onStopMarkerPress?.(stop.deliveryId)}
          >
            <StopMarkerIcon number={idx + 1} active={activeStopIndex === idx} />
          </Marker>
        ))}

        {userLocation && (
          <Marker
            longitude={(snappedLocation ?? userLocation).lng}
            latitude={(snappedLocation ?? userLocation).lat}
            anchor="center"
          >
            <CourierMarkerIcon bearing={userBearing} offRoute={offRoute} />
          </Marker>
        )}
      </Map>

      {route?.source === 'straight-line-fallback' && (
        <div className="absolute top-[calc(env(safe-area-inset-top)+56px)] left-4 right-4 flex items-center gap-2 rounded-2xl bg-warn-soft px-4 py-2.5 text-sm text-warn shadow-card">
          <TriangleAlert className="size-4 shrink-0" />
          <span>Rute perkiraan (offline) - akan disinkronkan otomatis saat online kembali.</span>
        </div>
      )}

      {offRoute && (
        <div className="absolute top-[calc(env(safe-area-inset-top)+104px)] left-4 right-4 flex items-center gap-2 rounded-2xl bg-warn px-4 py-2.5 text-sm font-semibold text-on-accent shadow-card">
          <TriangleAlert className="size-4 shrink-0" />
          <span>
            Di luar rute
            {offRouteDeviationM != null ? ` (${Math.round(offRouteDeviationM)} m)` : ''} - kembali ke rute atau optimalkan ulang
          </span>
        </div>
      )}
    </div>
  );
}
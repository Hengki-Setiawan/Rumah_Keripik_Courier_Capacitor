import { useEffect, useRef, useMemo } from 'react';
import Map, { Source, Layer, Marker, type MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { TriangleAlert, Navigation } from 'lucide-react';
import { MAP_STYLE_LIGHT } from '@/lib/map/tileStyle';
import { WAREHOUSE } from '@/lib/routing/types';
import type { OptimizedRoute } from '@/lib/routing/types';
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

function WarehouseMarkerIcon() {
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex size-9 items-center justify-center rounded-xl bg-ink text-white shadow-card ring-2 ring-white">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6" />
        </svg>
      </div>
      <span className="mt-0.5 h-2 w-0.5 rounded-b bg-ink" />
    </div>
  );
}

function CourierMarkerIcon() {
  return (
    <div className="relative flex size-8 items-center justify-center rounded-full bg-ok text-on-accent shadow-card ring-2 ring-white">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      </svg>
    </div>
  );
}

function openNavigation(lat: number, lng: number) {
  const isApple = /iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.platform === 'MacIntel';
  window.location.href = isApple
    ? `maps://maps.google.com/?daddr=${lat},${lng}`
    : `google.navigation:q=${lat},${lng}`;
}

/** Fallback saat WebGL tidak tersedia (device low-end, D-016) — peta tidak bisa dirender. */
function WebGlFallback({ route }: { route: OptimizedRoute | null }) {
  const stops = route?.orderedStops ?? [];
  return (
    <div className="absolute inset-0 z-0 overflow-y-auto bg-surface-subtle">
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
                onClick={() => openNavigation(stop.lat, stop.lng)}
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-brand active:scale-95 transition-transform"
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

export function RouteMap({ route, activeStopIndex, onStopMarkerPress, userLocation }: RouteMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const webglSupported = useMemo(() => supportsWebGL(), []);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !route || route.orderedStops.length === 0) return;
    const coords: [number, number][] = route.orderedStops.map((s) => [s.lng, s.lat] as [number, number]);
    coords.push([WAREHOUSE.lng, WAREHOUSE.lat]);
    const lons = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    map.fitBounds(
      [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]] as [[number, number], [number, number]],
      { padding: { top: 90, bottom: 300, left: 40, right: 40 }, duration: 600 },
    );
  }, [route]);

  const geojsonLine = useMemo(() => {
    if (!route || route.legs.length === 0) return null;
    const features = route.legs
      .filter((leg) => leg.coordinates.length >= 2)
      .map((leg) => ({
        type: 'Feature' as const,
        geometry: { type: 'LineString' as const, coordinates: leg.coordinates },
        properties: {},
      }));
    if (features.length === 0) return null;
    return { type: 'FeatureCollection' as const, features };
  }, [route]);

  if (!webglSupported) return <WebGlFallback route={route} />;

  return (
    <div className="absolute inset-0 z-0">
      <Map
        ref={mapRef}
        mapStyle={MAP_STYLE_LIGHT}
        initialViewState={{ longitude: WAREHOUSE.lng, latitude: WAREHOUSE.lat, zoom: 12 }}
        style={{ width: '100%', height: '100%' }}
        attributionControl={{ compact: true }}
      >
        {geojsonLine && (
          <Source id="route-line" type="geojson" data={geojsonLine}>
            <Layer
              id="route-line-outline"
              type="line"
              paint={{ 'line-color': '#FFFFFF', 'line-width': 8, 'line-opacity': 0.9 }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
            <Layer
              id="route-line-main"
              type="line"
              paint={{ 'line-color': '#c55a2b', 'line-width': 5 }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
          </Source>
        )}

        <Marker longitude={WAREHOUSE.lng} latitude={WAREHOUSE.lat} anchor="bottom">
          <WarehouseMarkerIcon />
        </Marker>

        {route?.orderedStops.map((stop, idx) => (
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
          <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
            <CourierMarkerIcon />
          </Marker>
        )}
      </Map>

      {route?.source === 'straight-line-fallback' && (
        <div className="absolute top-[calc(env(safe-area-inset-top)+56px)] left-4 right-4 flex items-center gap-2 rounded-2xl bg-warn-soft px-4 py-2.5 text-sm text-warn shadow-card">
          <TriangleAlert className="size-4 shrink-0" />
          <span>Rute perkiraan (offline) - akan disinkronkan otomatis saat online kembali.</span>
        </div>
      )}
    </div>
  );
}
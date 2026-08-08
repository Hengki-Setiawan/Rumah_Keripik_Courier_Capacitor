import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Bell, Crosshair, LocateFixed } from 'lucide-react';
import { RouteMap } from '@/components/ui/RouteMap';
import { RouteBottomSheet } from '@/components/ui/RouteBottomSheet';
import { LiveNavigationHud } from '@/components/ui/LiveNavigationHud';
import { TurnByTurnHud } from '@/components/ui/TurnByTurnHud';
import { FAB } from '@/components/ui/FAB';
import { useOptimizedRoute } from '@/hooks/useOptimizedRoute';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useCourierTracking } from '@/hooks/useCourierTracking';
import { useRoadMatchedLocation } from '@/hooks/useRoadMatchedLocation';
import { fetchDirectionsGeometry } from '@/lib/routing/orsClient';
import { fetchOsrmRoute } from '@/lib/routing/osrmClient';
import { haversineMeters } from '@/lib/routing/distance';
import { WAREHOUSE, type OptimizedRoute, type RouteLegGeometry } from '@/lib/routing/types';
import { toast } from '@/stores/toast-store';
import type { SnapPoint } from '@/components/ui/BottomSheet';

function openNavigation(lat: number, lng: number) {
  const isApple = /iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.platform === 'MacIntel';
  const url = isApple
    ? `maps://maps.google.com/?daddr=${lat},${lng}`
    : `google.navigation:q=${lat},${lng}`;
  window.location.href = url;
}

export default function Route() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: route, isLoading, refetch, isFetching } = useOptimizedRoute();
  const rawLocation = useUserLocation();
  const [snap, setSnap] = useState<SnapPoint>('peek');
  const [activeStopIndex, setActiveStopIndex] = useState(0);
  const [mapBump, setMapBump] = useState(0);
  const tracking = useCourierTracking(rawLocation, route ?? null);
  const snappedLocation = useRoadMatchedLocation(rawLocation, route ?? null, activeStopIndex, tracking.offRoute);

  const activeStop = route?.orderedStops[activeStopIndex];
  const activeLat = activeStop?.lat;
  const activeLng = activeStop?.lng;

  function handleStopMarkerPress(deliveryId: string) {
    const idx = route?.orderedStops.findIndex((s) => s.deliveryId === deliveryId) ?? -1;
    if (idx >= 0) {
      setActiveStopIndex(idx);
      if (snap === 'peek') setSnap('half');
    }
  }

  // Feedback ringan: rute keluar dari rute (sudah ada banner peta; toast sebagai pelengkap).
  useEffect(() => {
    if (tracking.offRoute) {
      toast.warning('Anda keluar dari rute - kembali ke rute atau optimalkan ulang');
    }
  }, [tracking.offRoute]);

  // Auto re-route (B): saat keluar rute, hitung ulang rute menuju stop aktif
  // dari posisi kurir (sekali per episode, min 60 detik antar rute ulang).
  const rerouteArmedRef = useRef(true);
  const rerouteInFlightRef = useRef(false);
  const lastRerouteAtRef = useRef(0);

  const rerouteToStop = useCallback(
    async (r: OptimizedRoute, idx: number) => {
      const stop = r.orderedStops[idx];
      if (!stop) return;
      const from = tracking.position ?? { lat: WAREHOUSE.lat, lng: WAREHOUSE.lng };
      let leg: RouteLegGeometry;
      try {
        const apiKey = import.meta.env.VITE_ORS_API_KEY as string | undefined;
        leg = apiKey ? await fetchDirectionsGeometry(from, stop, apiKey) : await fetchOsrmRoute(from, stop);
      } catch {
        leg = {
          coordinates: [[from.lng, from.lat], [stop.lng, stop.lat]],
          distanceMeters: haversineMeters(from, stop),
          durationSeconds: 0,
        };
      }
      const key = ['route', 'optimized', r.orderedStops.map((s) => s.deliveryId).sort().join('|')] as const;
      queryClient.setQueryData<OptimizedRoute>(key, (old) => {
        if (!old) return old;
        const legs = old.legs.map((l, i) => (i === idx ? leg : l));
        return {
          ...old,
          legs,
          totalDistanceMeters: legs.reduce((sum, l) => sum + l.distanceMeters, 0),
          totalDurationSeconds: legs.reduce((sum, l) => sum + l.durationSeconds, 0),
        };
      });
      toast.success('Rute dihitung ulang dari posisi Anda');
    },
    [queryClient, tracking.position],
  );

  useEffect(() => {
    if (!tracking.offRoute) {
      rerouteArmedRef.current = true;
      return;
    }
    if (!rerouteArmedRef.current || rerouteInFlightRef.current) return;
    const r = route;
    const stop = r?.orderedStops[activeStopIndex];
    if (!r || !stop) return;
    if (!navigator.onLine) return;
    if (Date.now() - lastRerouteAtRef.current < 60_000) return;
    rerouteArmedRef.current = false;
    lastRerouteAtRef.current = Date.now();
    rerouteInFlightRef.current = true;
    void rerouteToStop(r, activeStopIndex).finally(() => {
      rerouteInFlightRef.current = false;
    });
  }, [tracking.offRoute, route, activeStopIndex, rerouteToStop]);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-surface">
      <RouteMap
        key={mapBump}
        route={route ?? null}
        activeStopIndex={activeStopIndex}
        onStopMarkerPress={handleStopMarkerPress}
        userLocation={tracking.position}
        snappedLocation={snappedLocation}
        userBearing={tracking.bearing}
        offRoute={tracking.offRoute}
        offRouteDeviationM={tracking.offRouteDeviationM}
        followMode={tracking.followMode}
        onFollowModeChange={tracking.setFollowMode}
      />

      {/* Header transparan mengambang */}
      <div className="pointer-events-none absolute top-0 inset-x-0 flex items-center justify-between px-4 pt-[env(safe-area-inset-top)] pb-3 bg-gradient-to-b from-black/25 to-transparent">
        <button
          aria-label="Kembali"
          onClick={() => navigate('/')}
          className="pointer-events-auto flex size-11 items-center justify-center rounded-full bg-white/90 text-ink shadow-card backdrop-blur active:scale-95 transition-transform"
        >
          <RefreshCw className="size-5 rotate-180" />
        </button>
        <p className="text-sm font-semibold text-white drop-shadow">Rute Hari Ini</p>
        <button
          aria-label="Notifikasi"
          onClick={() => navigate('/notifications')}
          className="pointer-events-auto flex size-11 items-center justify-center rounded-full bg-white/90 text-ink shadow-card backdrop-blur active:scale-95 transition-transform"
        >
          <Bell className="size-5" />
        </button>
      </div>

      {/* Banner manuver turn-by-turn (sembunyikan saat off-route agar tidak bentrok) */}
      {!tracking.offRoute && (
        <TurnByTurnHud leg={route?.legs[activeStopIndex] ?? null} position={tracking.position} />
      )}

      {/* HUD navigasi: jarak tersisa + ETA ke stop aktif + tombol Google Maps */}
      <LiveNavigationHud
        route={route ?? null}
        activeStopIndex={activeStopIndex}
        courierLocation={tracking.position}
      />

      {/* Navigasi ke stop aktif */}
      {activeLat != null && activeLng != null && (
        <FAB
          icon={<Crosshair className="size-6" />}
          ariaLabel="Navigasi ke titik aktif"
          variant="overlay"
          className="absolute right-3 z-20 bottom-[190px]"
          onClick={() => openNavigation(activeLat, activeLng)}
        />
      )}

      {/* Recenter peta ke posisi kurir (aktifkan ulang follow camera) */}
      {!tracking.followMode && tracking.position && (
        <FAB
          icon={<LocateFixed className="size-6" />}
          ariaLabel="Kembali ke posisi saya"
          variant="overlay"
          className="absolute right-3 z-20 bottom-[140px]"
          onClick={() => tracking.setFollowMode(true)}
        />
      )}

      <RouteBottomSheet
        route={route ?? null}
        loading={isLoading}
        optimizing={isFetching}
        snap={snap}
        onSnapChange={setSnap}
        onOptimize={() => { setMapBump((b) => b + 1); refetch(); }}
        activeStopIndex={activeStopIndex}
        onSelectStop={(i) => { setActiveStopIndex(i); if (snap === 'peek') setSnap('half'); }}
      />
    </div>
  );
}

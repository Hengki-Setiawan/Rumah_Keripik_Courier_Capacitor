import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bell, Crosshair, LocateFixed, Route as RouteIcon } from 'lucide-react';
import { RouteMap } from '@/components/ui/RouteMap';
import { RouteBottomSheet } from '@/components/ui/RouteBottomSheet';
import { LiveNavigationHud } from '@/components/ui/LiveNavigationHud';
import { TurnByTurnHud } from '@/components/ui/TurnByTurnHud';
import { FAB } from '@/components/ui/FAB';
import { Button } from '@/components/ui/Button';
import { openExternalNavigation } from '@/lib/openMaps';
import { useOptimizedRoute } from '@/hooks/useOptimizedRoute';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useCourierTracking } from '@/hooks/useCourierTracking';
import { useRoadMatchedLocation } from '@/hooks/useRoadMatchedLocation';
import { useVoiceGuidance } from '@/lib/routing/useVoiceGuidance';
import { fetchDirectionsGeometry } from '@/lib/routing/orsClient';
import { fetchOsrmRoute } from '@/lib/routing/osrmClient';
import { buildRouteQueryKey } from '@/lib/routing/routingService';
import { haversineMeters } from '@/lib/routing/distance';
import { WAREHOUSE, type OptimizedRoute, type RouteLegGeometry } from '@/lib/routing/types';
import { toast } from '@/stores/toast-store';
import { hapticImpact } from '@/lib/haptics';
import type { SnapPoint } from '@/components/ui/BottomSheet';

export default function Route() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: route, isLoading, refetch, isFetching } = useOptimizedRoute();
  const rawLocation = useUserLocation();
  const [snap, setSnap] = useState<SnapPoint>('peek');
  const [activeStopIndex, setActiveStopIndex] = useState(0);
  const [navigationMode, setNavigationMode] = useState(false);
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  const [mapBump, setMapBump] = useState(0);
  const tracking = useCourierTracking(rawLocation, route ?? null);
  const snappedLocation = useRoadMatchedLocation(rawLocation, route ?? null, activeStopIndex, tracking.offRoute);

  const activeStop = route?.orderedStops[activeStopIndex];
  const activeLat = activeStop?.lat;
  const activeLng = activeStop?.lng;

  // Voice guidance saat navigasi aktif (suara instruksi + keep-awake layar).
  useVoiceGuidance({
    leg: route?.legs[activeStopIndex] ?? null,
    position: tracking.position,
    navigationMode,
    offRoute: tracking.offRoute,
    destinationName: activeStop?.customerName,
  });

  function handleStopMarkerPress(deliveryId: string) {
    const idx = route?.orderedStops.findIndex((s) => s.deliveryId === deliveryId) ?? -1;
    if (idx >= 0) {
      setActiveStopIndex(idx);
      if (!navigationMode && snap === 'peek') setSnap('half');
      // Saat sedang navigasi: hitung ulang rute dari POSISI KURIR ke stop baru,
      // bukan memakai segmen tur lama (mis. stop1→stop2) antar-titik.
      if (navigationMode && route) void rerouteToStop(route, idx);
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
  const pendingRerouteRef = useRef<{ route: OptimizedRoute; idx: number } | null>(null);

  const rerouteToStop = useCallback(
    async (r: OptimizedRoute, idx: number) => {
      const stop = r.orderedStops[idx];
      if (!stop) return;
      const from = tracking.position;
      // Tanpa fix GPS, tidak bisa menghitung rute dari posisi kurir. Simpan target
      // agar dijalankan otomatis begitu posisi tersedia (lihat effect flush di bawah).
      if (!from) {
        pendingRerouteRef.current = { route: r, idx };
        return;
      }
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
      const key = ['route', 'optimized', buildRouteQueryKey(r.orderedStops)] as const;
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

  // Flush pending reroute: begitu GPS pertama tersedia, hitung ulang rute ke target
  // yang dipilih sebelumnya (mis. user pilih stop 4 sebelum fix GPS tiba). Sekali saja.
  const pendingRerouteFlushedAtRef = useRef(0);
  useEffect(() => {
    const pending = pendingRerouteRef.current;
    if (!pending) return;
    if (!tracking.position) return;
    // Hindari flush berulang tiap tick GPS: hanya 1x per target.
    if (Date.now() - pendingRerouteFlushedAtRef.current < 1000) return;
    pendingRerouteRef.current = null;
    pendingRerouteFlushedAtRef.current = Date.now();
    void rerouteToStop(pending.route, pending.idx);
  }, [tracking.position, rerouteToStop]);

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
  // Google Maps style: setelah fix GPS pertama, ganti leg 0 (yang dihitung dari
  // gudang) dengan rute dari POSISI KURIR saat ini -> stop pertama. Sekali saja.
  const initialLegReroutedRef = useRef(false);
  useEffect(() => {
    if (initialLegReroutedRef.current) return;
    const r = route;
    const pos = tracking.position;
    if (!r || !pos) return;
    const stop = r.orderedStops[0];
    if (!stop) return;
    // Hanya jika courier sudah jauh dari gudang (bukan sedang tes di gudang).
    if (haversineMeters(pos, { lat: WAREHOUSE.lat, lng: WAREHOUSE.lng }) < 100) return;
    // Hanya jika leg 0 masih mulai dari gudang (belum pernah di-reroute).
    const first = r.legs[0]?.coordinates[0];
    if (!first) return;
    const legStartsAtWarehouse =
      Math.abs(first[1] - WAREHOUSE.lat) < 0.0005 && Math.abs(first[0] - WAREHOUSE.lng) < 0.0005;
    if (!legStartsAtWarehouse) {
      initialLegReroutedRef.current = true;
      return;
    }
    initialLegReroutedRef.current = true;
    void rerouteToStop(r, 0);
  }, [route, tracking.position, rerouteToStop]);

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
        followMode={navigationMode ? true : tracking.followMode}
        onFollowModeChange={tracking.setFollowMode}
        navigationMode={navigationMode}
        showAllRoutes={showAllRoutes}
      />

      {/* Header transparan mengambang */}
      <div className="pointer-events-none absolute top-0 inset-x-0 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top,0px)+1.375rem)] pb-3 bg-gradient-to-b from-black/30 via-black/15 to-transparent z-20">
        <button
          aria-label="Kembali"
          onClick={() => navigate('/')}
          className="pointer-events-auto flex size-11 items-center justify-center rounded-full bg-white/90 text-ink shadow-card backdrop-blur active:scale-95 transition-transform"
        >
          <ArrowLeft className="size-5" />
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

      {/* Banner manuver turn-by-turn — hanya muncul saat mode navigasi aktif */}
      {navigationMode && (!tracking.offRoute || navigationMode) && (
        <TurnByTurnHud leg={route?.legs[activeStopIndex] ?? null} position={tracking.position} />
      )}

      {/* HUD navigasi: jarak tersisa + ETA ke stop aktif + tombol Google Maps — disembunyikan saat navigationMode */}
      {!navigationMode && (
        <LiveNavigationHud
          route={route ?? null}
          activeStopIndex={activeStopIndex}
          courierLocation={tracking.position}
        />
      )}

      {/* Map action strip (R3.2): satu container tombol kontrol peta — jarak seragam,
          satu posisi kanan layar, alih-alih tiga FAB absolute terpisah. */}
      <div className="absolute right-4 bottom-[calc(54dvh+0.5rem)] z-40 flex flex-col gap-3">
        {activeLat != null && activeLng != null && !navigationMode && (
          <FAB
            icon={<Crosshair className="size-6" />}
            ariaLabel="Navigasi ke titik aktif"
            variant="overlay"
            onClick={() => { void hapticImpact('light'); openExternalNavigation(activeLat, activeLng); }}
          />
        )}

        {!navigationMode && (
          <FAB
            icon={<RouteIcon className="size-6" />}
            ariaLabel={showAllRoutes ? 'Sembunyikan seluruh rute' : 'Tampilkan seluruh rute'}
            variant="overlay"
            active={showAllRoutes}
            onClick={() => { void hapticImpact('light'); setShowAllRoutes((v) => !v); }}
          />
        )}

        {tracking.position && !navigationMode && (
          <FAB
            icon={<LocateFixed className="size-6" />}
            ariaLabel="Kembali ke posisi saya"
            variant="overlay"
            onClick={() => { void hapticImpact('light'); tracking.setFollowMode(true); }}
          />
        )}
      </div>

      {!navigationMode ? (
        <RouteBottomSheet
          route={route ?? null}
          loading={isLoading}
          optimizing={isFetching}
          snap={snap}
          onSnapChange={setSnap}
          onOptimize={() => { setMapBump((b) => b + 1); refetch(); }}
          activeStopIndex={activeStopIndex}
          onSelectStop={(i) => { setActiveStopIndex(i); if (snap === 'peek') setSnap('half'); }}
          onStartNavigation={() => {
            void hapticImpact('medium');
            setNavigationMode(true);
            tracking.setFollowMode(true);
            // Hitung rute dari POSISI KURIR ke stop terpilih saat navigasi mulai.
            if (route) void rerouteToStop(route, activeStopIndex);
          }}
        />
      ) : (
        <div className="absolute inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-40">
          <Button 
            variant="primary" 
            className="w-full shadow-card-lg bg-error text-white font-bold h-14 rounded-2xl" 
            onClick={() => setNavigationMode(false)}
          >
            Akhiri Navigasi
          </Button>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Bell, Crosshair, LocateFixed } from 'lucide-react';
import { RouteMap } from '@/components/ui/RouteMap';
import { RouteBottomSheet } from '@/components/ui/RouteBottomSheet';
import { LiveNavigationHud } from '@/components/ui/LiveNavigationHud';
import { FAB } from '@/components/ui/FAB';
import { useOptimizedRoute } from '@/hooks/useOptimizedRoute';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useCourierTracking } from '@/hooks/useCourierTracking';
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
  const { data: route, isLoading, refetch, isFetching } = useOptimizedRoute();
  const rawLocation = useUserLocation();
  const tracking = useCourierTracking(rawLocation, route ?? null);
  const [snap, setSnap] = useState<SnapPoint>('peek');
  const [activeStopIndex, setActiveStopIndex] = useState(0);
  const [mapBump, setMapBump] = useState(0);

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

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-surface">
      <RouteMap
        key={mapBump}
        route={route ?? null}
        activeStopIndex={activeStopIndex}
        onStopMarkerPress={handleStopMarkerPress}
        userLocation={tracking.position}
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
          className="pointer-events-auto flex size-10 items-center justify-center rounded-full bg-white/90 text-ink shadow-card backdrop-blur active:scale-95 transition-transform"
        >
          <RefreshCw className="size-5 rotate-180" />
        </button>
        <p className="text-sm font-semibold text-white drop-shadow">Rute Hari Ini</p>
        <button
          aria-label="Notifikasi"
          onClick={() => navigate('/notifications')}
          className="pointer-events-auto flex size-10 items-center justify-center rounded-full bg-white/90 text-ink shadow-card backdrop-blur active:scale-95 transition-transform"
        >
          <Bell className="size-5" />
        </button>
      </div>

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

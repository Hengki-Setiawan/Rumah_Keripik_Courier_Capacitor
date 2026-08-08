import { Navigation, MapPin } from 'lucide-react';
import type { OptimizedRoute } from '@/lib/routing/types';
import { haversineMeters } from '@/lib/routing/distance';
import { remainingDistanceToEndM } from '@/lib/routing/navigation';
import { openExternalNavigation } from '@/lib/openMaps';
import { cn } from '@/lib/cn';

interface LiveNavigationHudProps {
  route: OptimizedRoute | null;
  activeStopIndex: number;
  courierLocation?: { lat: number; lng: number } | null;
  className?: string;
}

/**
 * Overlay kecil di atas peta saat sedang "menuju stop X": jarak tersisa, ETA,
 * dan tombol besar "Buka di Google Maps" (Fase D blueprint map, §6.3).
 */
export function LiveNavigationHud({ route, activeStopIndex, courierLocation, className }: LiveNavigationHudProps) {
  const stop = route?.orderedStops[activeStopIndex];
  if (!stop) return null;

  let distanceM: number | null = null;
  let etaMin = 0;

  const leg = route?.legs[activeStopIndex];
  if (leg && leg.distanceMeters > 0) {
    const remaining = courierLocation ? remainingDistanceToEndM(leg, courierLocation) : null;
    distanceM = remaining ?? leg.distanceMeters;
    const fraction = remaining != null && leg.distanceMeters > 0 ? remaining / leg.distanceMeters : 1;
    etaMin = leg.durationSeconds > 0 ? Math.max(1, Math.round((leg.durationSeconds * fraction) / 60)) : 0;
  }
  if (distanceM == null || distanceM <= 0) {
    // Fallback perkiraan: haversine dari posisi kurir (atau gudang) ke stop.
    const from = courierLocation ?? { lat: -5.134, lng: 119.4135 };
    distanceM = haversineMeters(from, stop);
    // Asumsi kecepatan kurir motor di kota ~20 km/jam untuk perkiraan kasar.
    etaMin = Math.max(1, Math.round((distanceM / 1000 / 20) * 60));
  }

  return (
    <div
      className={cn(
        'pointer-events-none absolute left-4 right-4 top-[calc(env(safe-area-inset-top)+120px)] z-10 flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-card',
        className,
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
        <MapPin className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-ink-secondary">Menuju stop #{activeStopIndex + 1}</p>
        <p className="truncate text-sm font-semibold text-ink">{stop.customerName ?? 'Pelanggan'}</p>
        <p className="text-xs text-ink-secondary">
          {distanceM < 400 ? (
            <span className="text-ok">Kurang dari 400 m - segera tiba</span>
          ) : (
            <span>
              {distanceM >= 1000 ? `${(distanceM / 1000).toFixed(1)} km` : `${Math.round(distanceM)} m`} &middot; ~
              {etaMin} menit
            </span>
          )}
        </p>
      </div>
      <button
        aria-label="Buka navigasi di Google Maps"
        onClick={() => openExternalNavigation(stop.lat, stop.lng)}
        className="pointer-events-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-brand text-on-accent shadow-card transition-transform active:scale-95"
      >
        <Navigation className="size-5" />
      </button>
    </div>
  );
}

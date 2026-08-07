import { Navigation } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BottomSheet, type SnapPoint } from '@/components/ui/BottomSheet';
import type { OptimizedRoute } from '@/lib/routing/types';

interface RouteBottomSheetProps {
  route: OptimizedRoute | null;
  loading: boolean;
  optimizing: boolean;
  snap: SnapPoint;
  onSnapChange: (s: SnapPoint) => void;
  onOptimize: () => void;
  activeStopIndex: number;
  onSelectStop: (i: number) => void;
}

export function RouteBottomSheet({
  route,
  loading,
  optimizing,
  snap,
  onSnapChange,
  onOptimize,
  activeStopIndex,
  onSelectStop,
}: RouteBottomSheetProps) {
  const stops = route?.orderedStops ?? [];

  return (
    <BottomSheet snap={snap} onSnapChange={onSnapChange}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">Rute Pengiriman</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {stops.length} titik pemberhentian
              {route
                ? ` · ~${(route.totalDistanceMeters / 1000).toFixed(1)} km` +
                  (route.totalDurationSeconds ? ` · ±${Math.round(route.totalDurationSeconds / 60)} menit` : '')
                : ''}
            </p>
          </div>
          <Button variant="secondary" size="sm" loading={optimizing} disabled={loading || stops.length === 0} onClick={onOptimize}>
            <Navigation className="size-4" /> Optimalkan
          </Button>
        </div>

        {loading && !route ? (
          <Card><p className="py-4 text-center text-sm text-ink-muted">Memuat rute...</p></Card>
        ) : stops.length === 0 ? (
          <Card>
            <p className="py-4 text-center text-sm text-ink-muted">Tidak ada titik pengiriman untuk hari ini.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {stops.map((s, i) => (
              <Card
                key={s.deliveryId}
                interactive
                onClick={() => onSelectStop(i)}
                className={i === activeStopIndex ? 'ring-1 ring-brand' : ''}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-on-accent text-sm font-bold">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{s.customerName ?? 'Pelanggan'}</p>
                    {route && (
                      <p className="mt-0.5 text-[11px] text-ink-muted">
                        {legSummary(route, i)}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {route?.source && (
          <p className="px-1 text-[10px] text-ink-muted">
            {route.source === 'ors-optimization' && 'Dioptimalkan via jalan asli (ORS)'}
            {route.source === 'local-heuristic' && 'Dioptimalkan lokal (estimasi jarak udara + jalan sebagian)'}
            {route.source === 'osrm' && 'Rute via OSRM (jalan publik)'}
            {route.source === 'straight-line-fallback' && 'Rute perkiraan (offline, jarak udara)'}
          </p>
        )}
      </div>
    </BottomSheet>
  );
}

function legSummary(route: OptimizedRoute, i: number): string {
  const leg = route.legs[i];
  if (!leg) return '';
  const parts: string[] = [];
  if (leg.distanceMeters > 0) parts.push(`${(leg.distanceMeters / 1000).toFixed(1)} km`);
  if (leg.durationSeconds > 0) parts.push(`${Math.round(leg.durationSeconds / 60)} menit`);
  return parts.join(' · ');
}
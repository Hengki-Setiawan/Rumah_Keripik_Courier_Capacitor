import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation, ArrowRight, RefreshCw } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTodayDeliveries } from '@/hooks/use-deliveries';
import { apiRequest } from '@/lib/api-client';
import NativeRouteMap from '@/components/ui/NativeRouteMap';
import type { RouteWaypoint } from '@/lib/types';

interface OptimizeResponse {
  ok: boolean;
  data: { waypoints: RouteWaypoint[]; totalStops: number; totalEstimatedKm: number };
}

function openNavigation(lat: number, lng: number) {
  window.location.href = `google.navigation:q=${lat},${lng}`;
}

export default function Route() {
  const navigate = useNavigate();
  const { data: deliveries, isLoading } = useTodayDeliveries();
  const [optimized, setOptimized] = useState<RouteWaypoint[] | null>(null);
  const [optimizing, setOptimizing] = useState(false);

  async function optimize() {
    if (!deliveries || deliveries.length === 0) return;
    setOptimizing(true);
    try {
      const res = await apiRequest<OptimizeResponse>('/api/courier/route/optimize', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setOptimized(res.data.waypoints ?? []);
    } finally {
      setOptimizing(false);
    }
  }

  function lookupName(deliveryId: number): string | undefined {
    return deliveries?.find((d) => d.id === deliveryId)?.customer_name;
  }

  const fallback: RouteWaypoint[] = (deliveries ?? []).map((d, i) => ({
    deliveryId: d.id,
    sequence: (d.route_order ?? i + 1),
    lat: d.latitude ? Number(d.latitude) : 0,
    lng: d.longitude ? Number(d.longitude) : 0,
    customerName: d.customer_name,
  }));

  const waypoints = optimized ?? fallback;
  const hasCoords = (w: RouteWaypoint) => w.lat !== 0 && w.lng !== 0;

  return (
    <AppShell title="Rute Hari Ini">
      <div className="flex flex-col gap-4">
        <Card elevation={2} className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-umber-100">Rute Pengiriman</p>
            <p className="mt-0.5 text-xs text-umber-400">{waypoints.length} titik pemberhentian</p>
          </div>
          <Button variant="secondary" size="sm" loading={optimizing} onClick={optimize}>
            <RefreshCw className="size-4" /> Optimalkan
          </Button>
        </Card>

        <NativeRouteMap waypoints={waypoints} />

        {isLoading && !deliveries ? (
          <Card><p className="text-center text-sm text-umber-400 py-6">Memuat...</p></Card>
        ) : waypoints.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Navigation className="size-6" />}
              title="Tidak ada rute"
              description="Tidak ada pengiriman untuk hari ini."
            />
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {[...waypoints]
              .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
              .map((w, i) => {
                const name = w.customerName ?? lookupName(w.deliveryId) ?? 'Pelanggan';
                return (
                  <Card key={w.deliveryId ?? i} className="flex items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-umber-950">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-umber-100">{name}</p>
                      {hasCoords(w) && (
                        <p className="mt-0.5 text-[11px] text-umber-500">
                          {w.lat.toFixed(5)}, {w.lng.toFixed(5)}
                        </p>
                      )}
                    </div>
                    {hasCoords(w) && (
                      <button
                        onClick={() => openNavigation(w.lat, w.lng)}
                        className="flex items-center gap-1 rounded-lg bg-umber-800 px-2.5 py-1.5 text-xs font-semibold text-amber-500 hover:bg-umber-700"
                      >
                        <Navigation className="size-3.5" /> Navigasi
                      </button>
                    )}
                  </Card>
                );
              })}
          </div>
        )}

        <Button variant="secondary" onClick={() => navigate('/')} fullWidth>
          <ArrowRight className="size-4 rotate-180" /> Kembali ke Beranda
        </Button>
      </div>
    </AppShell>
  );
}
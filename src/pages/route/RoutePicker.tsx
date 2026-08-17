import { useNavigate } from 'react-router-dom';
import { Route as RouteIcon, Package, MapPin, RefreshCw, CheckCircle2 } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCourierRoutes, claimRoute, invalidateRoutes } from '@/hooks/use-courier-routes';
import { invalidateDeliveries } from '@/hooks/use-deliveries';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/stores/toast-store';
import { hapticImpact } from '@/lib/haptics';
import { useState } from 'react';

export default function RoutePicker() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useCourierRoutes();
  const [claimingId, setClaimingId] = useState<number | null>(null);

  const available = data?.available ?? [];
  const mine = data?.mine ?? [];
  const hasActiveRoute = data?.hasActiveRoute ?? false;

  async function onClaim(routeId: number) {
    setClaimingId(routeId);
    hapticImpact('medium');
    try {
      const stopCount = await claimRoute(routeId);
      toast.success(`Jalur diambil — ${stopCount} kiriman. Selamat bekerja!`);
      invalidateRoutes(queryClient);
      invalidateDeliveries(queryClient);
      navigate('/route');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengambil jalur');
    } finally {
      setClaimingId(null);
    }
  }

  return (
    <AppShell title="Pilih Jalur" onBack={() => navigate('/')}>
      <div className="flex flex-col gap-4">
        <Card elevation={2} padding="lg" className="relative overflow-hidden">
          <div className="absolute -right-8 -top-8 size-36 rounded-full bg-brand/20 blur-xl" />
          <div className="relative flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand-pressed">
              <RouteIcon className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">Pilih Jalur Hari Ini</h2>
              <p className="mt-0.5 text-xs text-ink-secondary">Pilih salah satu jalur yang tersedia untuk mulai mengantar.</p>
            </div>
          </div>
        </Card>

        {hasActiveRoute && (
          <Card className="flex items-center justify-between gap-3 bg-ok-soft">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-5 text-ok" />
              <div>
                <p className="text-sm font-semibold text-ink">Kamu sudah punya jalur aktif</p>
                <p className="text-xs text-ink-secondary">{mine.length} jalur milikmu hari ini</p>
              </div>
            </div>
            <Button size="sm" onClick={() => navigate('/route')}>Buka Rute</Button>
          </Card>
        )}

        {isLoading && !data ? (
          <div aria-busy="true" aria-label="Memuat jalur">
            <Skeleton className="h-[96px] w-full rounded-[20px]" />
            <Skeleton className="mt-3 h-[96px] w-full rounded-[20px]" />
          </div>
        ) : isError && !data ? (
          <Card>
            <EmptyState
              icon={<RefreshCw className="size-6" />}
              title="Gagal memuat jalur"
              description="Periksa koneksi lalu coba lagi."
              actionLabel="Coba lagi"
              onAction={() => void refetch()}
            />
          </Card>
        ) : available.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Package className="size-6" />}
              title="Belum ada jalur tersedia"
              description="Jalur baru akan muncul setelah admin atau sistem membentuknya. Tarik untuk memuat ulang."
              actionLabel="Muat Ulang"
              onAction={() => void refetch()}
            />
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {available.map((r) => (
              <Card key={r.id} elevation={1}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand-pressed">
                      <MapPin className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">{r.routeName}</p>
                      <p className="mt-0.5 text-xs text-ink-secondary">
                        {r.stopCount} kiriman{r.estimatedDistanceKm ? ` · ~${r.estimatedDistanceKm} km` : ''}
                      </p>
                      {r.areaPreview.length > 0 && (
                        <p className="mt-1 line-clamp-1 text-[10px] text-ink-muted">
                          {r.areaPreview.join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button size="sm" loading={claimingId === r.id} onClick={() => void onClaim(r.id)}>
                    Ambil
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
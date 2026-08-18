import { useNavigate } from 'react-router-dom';
import { Package, MapPin, CheckCircle2, Wallet, Navigation, Siren, ChevronRight, RefreshCw } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { IconBadge } from '@/components/ui/IconBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTodayDeliveries, invalidateDeliveries, deliveriesKeys } from '@/hooks/use-deliveries';
import { useCourierRoutes, routesKeys } from '@/hooks/use-courier-routes';
import { useStats, statsKeys } from '@/hooks/use-stats';
import { useEarnings, earningsKeys } from '@/hooks/use-earnings';
import { useAuthStore } from '@/stores/auth-store';
import { formatCurrency, formatTime } from '@/lib/format';
import { useQueryClient } from '@tanstack/react-query';

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const courier = useAuthStore((s) => s.courier);
  const { data: deliveries, isLoading, isError } = useTodayDeliveries();
  const { data: routeData } = useCourierRoutes();
  const { data: stats } = useStats('week');
  const { data: earnings } = useEarnings('weekly');

  const pending = (deliveries ?? []).filter((d) => d.status === 'Siap_Dikirim');
  const active = (deliveries ?? []).find((d) => d.status === 'Dalam_Pengiriman');
  const sent = (deliveries ?? []).filter((d) => d.status === 'Terkirim');
  const nextUp = active ?? pending[0];

  async function refresh(): Promise<void> {
    invalidateDeliveries(queryClient);
    await Promise.allSettled([
      queryClient.refetchQueries({ queryKey: deliveriesKeys.all, type: 'active' }),
      queryClient.refetchQueries({ queryKey: routesKeys.today, type: 'active' }),
      queryClient.refetchQueries({ queryKey: statsKeys.me('week'), type: 'active' }),
      queryClient.refetchQueries({ queryKey: earningsKeys.period('weekly'), type: 'active' }),
    ]);
  }

  return (
    <AppShell
      title="Beranda"
      activeTab="beranda"
      onTabChange={(t) => navigate(t === 'beranda' ? '/' : `/${t}`)}
      onRefresh={refresh}
    >
      <div className="flex flex-col gap-4">
        {/* Welcome Card with Artisanal Glow */}
        <Card elevation={2} padding="lg" className="relative overflow-hidden rounded-3xl border border-white/10 bg-surface/90 shadow-frameless backdrop-blur-xl">
          <div className="absolute -right-8 -top-8 size-40 rounded-full bg-brand/20 blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wider text-brand-pressed uppercase">Selamat bertugas,</p>
              <h2 className="mt-0.5 text-2xl font-black text-ink tracking-tight">{courier?.name ?? 'Kurir'}</h2>
              {courier?.phone && <p className="mt-1 text-xs font-medium text-ink-secondary">{courier.phone}</p>}
            </div>
            <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-pressed font-extrabold text-lg shadow-sm border border-brand/20">
              {courier?.name?.charAt(0) ?? 'K'}
            </div>
          </div>
        </Card>

        {/* Hero Route Action Card */}
        <button
          onClick={() => navigate('/route')}
          className="group relative flex items-center justify-between overflow-hidden rounded-3xl bg-gradient-to-r from-brand via-brand to-brand-pressed p-5 text-left shadow-[0_10px_28px_rgba(197,90,43,0.35)] transition-all active:scale-[0.98] border border-white/15"
          aria-label="Buka rute peta hari ini"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.25),transparent_70%)]" />
          <div className="relative flex items-center gap-3.5">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-white/20 text-on-accent shadow-inner">
              <Navigation className="size-5" />
            </div>
            <div>
              <p className="text-base font-extrabold text-on-accent tracking-tight">
                Buka Peta Rute Pengiriman
              </p>
              <p className="mt-0.5 text-xs font-medium text-on-accent/90">
                {routeData?.hasActiveRoute
                  ? 'Lanjut navigasi rute aktif & panduan suara'
                  : 'Buka peta real-time & optimasi rute'}
              </p>
            </div>
          </div>
          <div className="relative flex size-9 items-center justify-center rounded-xl bg-white/15 text-on-accent transition-transform group-active:translate-x-1">
            <ChevronRight className="size-5" />
          </div>
        </button>

        {/* Bento Grid Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Total Pengiriman"
            value={String((deliveries ?? []).length)}
            icon={<Package className="size-5" />}
            tone="amber"
            hint={active ? '1 dalam perjalanan' : undefined}
          />
          <StatCard
            label="Selesai Terkirim"
            value={String(sent.length)}
            icon={<CheckCircle2 className="size-5" />}
            tone="emerald"
            hint={`${pending.length} antrean sisa`}
          />
          <div className="col-span-2">
            <StatCard
              label="Pendapatan Minggu Ini"
              value={formatCurrency(earnings?.summary.totalConfirmed ?? 0)}
              icon={<Wallet className="size-5" />}
              tone="money"
              hint={stats ? `${stats.totalCompleted} pengiriman berhasil` : undefined}
            />
          </div>
        </div>

        {/* Quick Action Navigation Buttons */}
        <div className="grid grid-cols-3 gap-2.5">
          <button
            onClick={() => navigate('/route')}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/8 bg-surface/80 p-3.5 text-ink shadow-card backdrop-blur-lg hover:bg-raised active:scale-95 transition-all"
          >
            <IconBadge icon={Navigation} tone="brand" />
            <span className="text-xs font-bold">Rute Peta</span>
          </button>
          <button
            onClick={() => navigate('/earnings')}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/8 bg-surface/80 p-3.5 text-ink shadow-card backdrop-blur-lg hover:bg-raised active:scale-95 transition-all"
          >
            <IconBadge icon={Wallet} tone="money" />
            <span className="text-xs font-bold">Pendapatan</span>
          </button>
          <button
            onClick={() => navigate('/sos')}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-alert/30 bg-alert/10 p-3.5 text-alert shadow-card backdrop-blur-lg hover:bg-alert/15 active:scale-95 transition-all"
          >
            <IconBadge icon={Siren} emphasis="solid-alert" />
            <span className="text-xs font-bold text-alert">SOS Darurat</span>
          </button>
        </div>

        {/* Next Delivery Card */}
        <div className="mt-1">
          <div className="mb-2.5 flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-ink">Pengiriman Berikutnya</h3>
            <button onClick={() => navigate('/history')} className="flex h-9 items-center px-2 text-xs font-bold text-brand hover:underline">
              Lihat semua
            </button>
          </div>
          {isLoading && !deliveries ? (
            <div aria-busy="true" aria-label="Memuat pengiriman">
              <Skeleton className="h-[84px] w-full rounded-2xl" />
            </div>
          ) : isError && !deliveries ? (
            <Card className="rounded-2xl">
              <EmptyState
                icon={<RefreshCw className="size-6" />}
                title="Gagal memuat pengiriman"
                description="Koneksi bermasalah. Periksa jaringan lalu tarik ke bawah untuk memuat ulang."
                actionLabel="Coba lagi"
                onAction={refresh}
              />
            </Card>
          ) : !nextUp ? (
            <Card className="rounded-2xl border-dashed py-8">
              <EmptyState
                icon={<Package className="size-6" />}
                title="Tidak ada pengiriman aktif"
                description="Belum ada pesanan untuk diantar. Tarik layar untuk menyegarkan data."
              />
            </Card>
          ) : (
            <Card interactive onClick={() => navigate(`/delivery/${nextUp.id}`)} className="rounded-3xl border border-white/10 bg-surface/90 p-4 shadow-card hover:shadow-card-lg transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-pressed shadow-sm">
                    <MapPin className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink truncate">{nextUp.customer_name || 'Pelanggan'}</p>
                    <p className="mt-0.5 text-xs text-ink-secondary line-clamp-1">{nextUp.address || 'Alamat tidak tersedia'}</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-brand-pressed shrink-0">{formatTime(nextUp.created_at)}</span>
              </div>
              {nextUp.distance_km != null && (
                <div className="mt-3 pt-2.5 border-t border-border-subtle/50 flex items-center justify-between text-xs text-ink-muted">
                  <span className="tabular-nums font-semibold">Jarak: {Number(nextUp.distance_km).toFixed(1)} km</span>
                  <span className="font-bold text-brand">Buka Detail &rarr;</span>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
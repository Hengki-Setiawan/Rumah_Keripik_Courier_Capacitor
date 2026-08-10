import { useNavigate } from 'react-router-dom';
import { Package, MapPin, Clock3, CheckCircle2, Wallet, TimerReset, Navigation, Siren, ChevronRight } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { IconBadge } from '@/components/ui/IconBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTodayDeliveries, invalidateDeliveries } from '@/hooks/use-deliveries';
import { useStats } from '@/hooks/use-stats';
import { useEarnings } from '@/hooks/use-earnings';
import { useAuthStore } from '@/stores/auth-store';
import { formatCurrency, formatTime } from '@/lib/format';
import { useQueryClient } from '@tanstack/react-query';

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const courier = useAuthStore((s) => s.courier);
  const { data: deliveries, isLoading } = useTodayDeliveries();
  const { data: stats } = useStats('week');
  const { data: earnings } = useEarnings('weekly');

  const pending = (deliveries ?? []).filter((d) => d.status === 'Siap_Dikirim');
  const active = (deliveries ?? []).find((d) => d.status === 'Dalam_Pengiriman');
  const sent = (deliveries ?? []).filter((d) => d.status === 'Terkirim');
  const nextUp = active ?? pending[0];

  function refresh() {
    invalidateDeliveries(queryClient);
  }

  return (
    <AppShell
      title="Beranda"
      activeTab="beranda"
      onTabChange={(t) => navigate(t === 'beranda' ? '/' : `/${t}`)}
      onRefresh={refresh}
    >
      <div className="flex flex-col gap-4">
        <Card elevation={2} padding="lg" className="relative overflow-hidden">
          <div className="absolute -right-8 -top-8 size-36 rounded-full bg-brand/20 blur-xl" />
          <p className="text-xs text-ink-muted">Selamat datang,</p>
          <h2 className="mt-0.5 text-xl font-bold text-ink">{courier?.name ?? 'Kurir'}</h2>
          {courier?.phone && <p className="mt-1 text-xs text-ink-secondary">{courier.phone}</p>}
        </Card>

        <button
          onClick={() => navigate('/route')}
          className="group relative flex items-center justify-between overflow-hidden rounded-[20px] bg-brand px-5 py-4 text-left shadow-card-lg transition-all active:scale-[0.98]"
          aria-label="Mulai lacak lokasi real-time"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-brand to-brand-pressed opacity-60" />
          <div className="relative flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/20 text-on-accent">
              <Navigation className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-on-accent">Mulai Lacak Lokasi Real-Time</p>
              <p className="mt-0.5 text-xs font-medium text-on-accent/80">Buka rute & kirim posisimu ke admin</p>
            </div>
          </div>
          <ChevronRight className="relative size-5 text-on-accent/80 transition-transform group-active:translate-x-0.5" />
        </button>

        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Pengiriman Hari Ini"
            value={String((deliveries ?? []).length)}
            icon={<Package className="size-5" />}
            tone="amber"
          />
          <StatCard
            label="Menunggu"
            value={String(pending.length)}
            icon={<Clock3 className="size-5" />}
            tone="blue"
            hint={active ? '1 dalam perjalanan' : undefined}
          />
          <StatCard
            label="Terkirim"
            value={String(sent.length)}
            icon={<CheckCircle2 className="size-5" />}
            tone="emerald"
          />
          <StatCard
            label="Pendapatan Minggu Ini"
            value={formatCurrency(earnings?.summary.totalConfirmed ?? 0)}
            icon={<Wallet className="size-5" />}
            tone="money"
            hint={stats ? `${stats.totalCompleted} selesai` : undefined}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/route')}
            className="flex items-center gap-3 rounded-[20px] bg-raised p-4 text-ink shadow-card hover:shadow-card-lg active:scale-[0.98] transition-all"
          >
            <IconBadge icon={Navigation} tone="brand" />
            <span className="text-sm font-semibold">Rute</span>
          </button>
          <button
            onClick={() => navigate('/shift')}
            className="flex items-center gap-3 rounded-[20px] bg-raised p-4 text-ink shadow-card hover:shadow-card-lg active:scale-[0.98] transition-all"
          >
            <IconBadge icon={TimerReset} tone="brand" />
            <span className="text-sm font-semibold">Shift</span>
          </button>
          <button
            onClick={() => navigate('/earnings')}
            className="flex items-center gap-3 rounded-[20px] bg-raised p-4 text-ink shadow-card hover:shadow-card-lg active:scale-[0.98] transition-all"
          >
            <IconBadge icon={Wallet} tone="money" />
            <span className="text-sm font-semibold">Pendapatan</span>
          </button>
          <button
            onClick={() => navigate('/sos')}
            className="flex items-center gap-3 rounded-[20px] bg-raised p-4 text-ink shadow-card hover:shadow-card-lg active:scale-[0.98] transition-all ring-1 ring-alert/30"
          >
            <IconBadge icon={Siren} emphasis="solid-alert" />
            <span className="text-sm font-semibold">SOS</span>
          </button>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Berikutnya</h3>
            <button onClick={() => navigate('/history')} className="flex h-11 items-center px-1 text-xs text-brand-pressed">
              Lihat semua
            </button>
          </div>
          {isLoading && !deliveries ? (
            <div aria-busy="true" aria-label="Memuat pengiriman">
              <Skeleton className="h-[76px] w-full rounded-[20px]" />
            </div>
          ) : !nextUp ? (
            <Card>
              <EmptyState
                icon={<Package className="size-6" />}
                title="Tidak ada pengiriman"
                description="Belum ada pengiriman untuk hari ini. Tarik untuk memuat ulang."
              />
            </Card>
          ) : (
            <Card interactive onClick={() => navigate(`/delivery/${nextUp.id}`)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand-pressed">
                    <MapPin className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">{nextUp.customer_name || 'Pelanggan'}</p>
                    <p className="mt-0.5 text-xs text-ink-secondary line-clamp-1">{nextUp.address || 'Alamat tidak tersedia'}</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-brand-pressed">{formatTime(nextUp.created_at)}</span>
              </div>
              {nextUp.distance_km != null && (
                <p className="mt-3 text-xs tabular-nums text-ink-muted">Jarak: {Number(nextUp.distance_km).toFixed(1)} km</p>
              )}
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
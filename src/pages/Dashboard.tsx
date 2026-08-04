import { useNavigate } from 'react-router-dom';
import { Package, MapPin, Clock3, CheckCircle2, Wallet, TimerReset, Navigation, Siren, ChevronRight } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTodayDeliveries, invalidateDeliveries } from '@/hooks/use-deliveries';
import { useStats } from '@/hooks/use-stats';
import { useAuthStore } from '@/stores/auth-store';
import { formatCurrency, formatTime } from '@/lib/format';
import { useQueryClient } from '@tanstack/react-query';

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const courier = useAuthStore((s) => s.courier);
  const { data: deliveries, isLoading } = useTodayDeliveries();
  const { data: stats } = useStats('week');

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
          <div className="absolute -right-6 -top-6 size-28 rounded-full bg-amber-500/10 blur-2xl" />
          <p className="text-xs text-umber-400">Selamat datang,</p>
          <h2 className="mt-0.5 text-xl font-bold text-umber-50">{courier?.name ?? 'Kurir'}</h2>
          {courier?.phone && <p className="mt-1 text-xs text-umber-500">{courier.phone}</p>}
        </Card>

        <button
          onClick={() => navigate('/route')}
          className="group relative flex items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 px-5 py-4 text-left shadow-[0_8px_24px_-6px_rgba(197,90,43,0.5)] transition-all active:scale-[0.98]"
          aria-label="Mulai lacak lokasi real-time"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-black/15 text-white">
              <Navigation className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-umber-950">Mulai Lacak Lokasi Real-Time</p>
              <p className="mt-0.5 text-xs font-medium text-umber-900/70">Buka rute & kirim posisimu ke admin</p>
            </div>
          </div>
          <ChevronRight className="size-5 text-umber-950/70 transition-transform group-active:translate-x-0.5" />
        </button>

        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Pengiriman Hari Ini"
            value={String((deliveries ?? []).length)}
            icon={<Package className="size-4" />}
            tone="amber"
          />
          <StatCard
            label="Menunggu"
            value={String(pending.length)}
            icon={<Clock3 className="size-4" />}
            tone="blue"
            hint={active ? '1 dalam perjalanan' : undefined}
          />
          <StatCard
            label="Terkirim"
            value={String(sent.length)}
            icon={<CheckCircle2 className="size-4" />}
            tone="emerald"
          />
          <StatCard
            label="Pendapatan Minggu Ini"
            value={stats?.totalCompleted ? formatCurrency(stats.totalCompleted * 10000) : formatCurrency(0)}
            icon={<Wallet className="size-4" />}
            tone="emerald"
            hint={stats ? `${stats.totalCompleted} selesai` : undefined}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/route')}
            className="flex flex-col items-center gap-2 rounded-2xl border border-umber-700 bg-umber-900 p-4 text-umber-200 hover:border-amber-600/50 active:scale-[0.98] transition-all"
          >
            <Navigation className="size-6 text-amber-500" />
            <span className="text-xs font-semibold">Rute</span>
          </button>
          <button
            onClick={() => navigate('/shift')}
            className="flex flex-col items-center gap-2 rounded-2xl border border-umber-700 bg-umber-900 p-4 text-umber-200 hover:border-amber-600/50 active:scale-[0.98] transition-all"
          >
            <TimerReset className="size-6 text-amber-500" />
            <span className="text-xs font-semibold">Shift</span>
          </button>
          <button
            onClick={() => navigate('/earnings')}
            className="flex flex-col items-center gap-2 rounded-2xl border border-umber-700 bg-umber-900 p-4 text-umber-200 hover:border-amber-600/50 active:scale-[0.98] transition-all"
          >
            <Wallet className="size-6 text-amber-500" />
            <span className="text-xs font-semibold">Pendapatan</span>
          </button>
          <button
            onClick={() => navigate('/sos')}
            className="flex flex-col items-center gap-2 rounded-2xl border border-red-600/40 bg-red-950/30 p-4 text-red-300 hover:border-red-500/70 active:scale-[0.98] transition-all"
          >
            <Siren className="size-6 text-red-500" />
            <span className="text-xs font-semibold">SOS</span>
          </button>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-umber-200">Berikutnya</h3>
            <button onClick={() => navigate('/history')} className="text-xs text-amber-500">
              Lihat semua
            </button>
          </div>
          {isLoading && !deliveries ? (
            <Card><p className="text-center text-sm text-umber-400 py-4">Memuat...</p></Card>
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
                  <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
                    <MapPin className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-umber-100">{nextUp.customer_name || 'Pelanggan'}</p>
                    <p className="mt-0.5 text-xs text-umber-400 line-clamp-1">{nextUp.address || 'Alamat tidak tersedia'}</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-amber-500">{formatTime(nextUp.created_at)}</span>
              </div>
              {nextUp.distance_km != null && (
                <p className="mt-3 text-xs text-umber-500">Jarak: {Number(nextUp.distance_km).toFixed(1)} km</p>
              )}
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
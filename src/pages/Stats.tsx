import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ChartColumnBig, PackageCheck, Clock4, Route } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { FilterPill } from '@/components/ui/FilterPill';
import { Skeleton } from '@/components/ui/Skeleton';
import { useStats } from '@/hooks/use-stats';

export default function Stats() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const { data, isLoading } = useStats(period);

  return (
    <AppShell
      title="Statistik"
      activeTab="stats"
      onTabChange={(t) => navigate(t === 'beranda' ? '/' : `/${t}`)}
      onRefresh={async () => {
        await queryClient.refetchQueries({ queryKey: ['stats', period], type: 'active' });
      }}
    >
      <div className="flex gap-2 pb-2">
        <FilterPill label="7 Hari" active={period === 'week'} onClick={() => setPeriod('week')} />
        <FilterPill label="30 Hari" active={period === 'month'} onClick={() => setPeriod('month')} />
      </div>

      <div className="flex flex-col gap-4">
        {isLoading && !data ? (
          <div className="flex flex-col gap-4" aria-busy="true" aria-label="Memuat statistik">
            <Card elevation={2} className="flex flex-col items-center gap-4 py-6">
              <Skeleton className="size-[120px] rounded-full" />
              <Skeleton className="h-4 w-28" />
            </Card>
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((n) => (
                <Skeleton key={n} className="h-28 w-full rounded-[20px]" />
              ))}
            </div>
          </div>
        ) : (
          <>
            <Card elevation={2} className="flex flex-col items-center gap-4 py-6">
              <ScoreRing
                score={data?.score ?? 0}
                size={120}
                label="Skor"
              />
              <div className="text-center">
                <p className="text-sm font-semibold text-ink">Skor Kinerja</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {data && data.totalCouriers > 0
                    ? `Peringkat ${data.rank ?? 0} dari ${data.totalCouriers} kurir`
                    : 'Belum ada data periode ini'}
                </p>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Diterima"
                value={String(data?.totalAssigned ?? 0)}
                icon={<PackageCheck className="size-4" />}
                tone="amber"
              />
              <StatCard
                label="Tepat Waktu"
                value={data?.onTimeRate !== undefined ? `${Math.round(data.onTimeRate)}%` : '0%'}
                icon={<Clock4 className="size-4" />}
                tone="emerald"
              />
              <StatCard
                label="Jarak Tempuh"
                value={data?.totalDistanceKm !== undefined ? `${Math.round(data.totalDistanceKm)} km` : '0 km'}
                icon={<Route className="size-4" />}
                tone="blue"
              />
              <StatCard
                label="Tingkat Selesai"
                value={`${data?.completionRate ?? 0}%`}
                icon={<ChartColumnBig className="size-4" />}
                tone="emerald"
              />
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
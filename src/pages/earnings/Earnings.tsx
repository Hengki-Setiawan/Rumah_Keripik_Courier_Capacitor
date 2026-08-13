import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { FilterPill } from '@/components/ui/FilterPill';
import { EmptyState } from '@/components/ui/EmptyState';
import { Sparkline } from '@/components/ui/Sparkline';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiRequest } from '@/lib/api-client';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { EarningsEntry, EarningsSummary } from '@/lib/types';

interface EarningsResponse {
  ok: boolean;
  earnings: EarningsEntry[];
  summary: EarningsSummary;
}

async function fetchEarnings(period: string): Promise<EarningsResponse> {
  const res = await apiRequest<EarningsResponse>(`/api/courier/earnings?period=${period}`, { method: 'GET' });
  return res;
}

export default function Earnings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'daily'>('weekly');
  const { data, isLoading } = useQuery({
    queryKey: ['earnings', period],
    queryFn: () => fetchEarnings(period),
  });

  const total = data?.summary.totalConfirmed ?? 0;
  const entries = data?.earnings ?? [];

  const sparkValues = useMemo(() => {
    if (entries.length === 0) return [];
    const byDay = new Map<string, number>();
    for (const e of entries) {
      if (e.status !== 'confirmed') continue;
      const day = e.createdAt.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + e.baseFee + e.bonusAmount);
    }
    const days = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-7);
    return days.map(([, v]) => v);
  }, [entries]);

  return (
    <AppShell
      title="Pendapatan"
      onBack={() => navigate(-1)}
      onRefresh={() => queryClient.invalidateQueries({ queryKey: ['earnings', period] })}
    >
      <div className="flex gap-2 pb-2">
        <FilterPill label="Harian" active={period === 'daily'} onClick={() => setPeriod('daily')} />
        <FilterPill label="7 Hari" active={period === 'weekly'} onClick={() => setPeriod('weekly')} />
        <FilterPill label="30 Hari" active={period === 'monthly'} onClick={() => setPeriod('monthly')} />
      </div>

      <div className="flex flex-col gap-4">
        <Card elevation={2} className="flex flex-col items-center gap-1 py-6">
          <p className="text-xs text-ink-muted">Total Pendapatan Terkonfirmasi</p>
          <p className="text-3xl font-bold text-brand">{formatCurrency(total)}</p>
          {data?.summary.pendingTotal !== undefined && data.summary.pendingTotal > 0 && (
            <p className="text-xs text-ink-muted">
              + {formatCurrency(data.summary.pendingTotal)} belum dikonfirmasi
            </p>
          )}
          {sparkValues.length >= 2 && (
            <div className="mt-3 w-full max-w-[280px]">
              <Sparkline values={sparkValues} className="mx-auto" />
              <p className="mt-1 text-center text-[10px] text-ink-muted">Tren pendapatan harian (7 hari terakhir)</p>
            </div>
          )}
        </Card>

        {isLoading && !data ? (
          <div className="flex flex-col gap-3" aria-busy="true" aria-label="Memuat pendapatan">
            <Skeleton className="h-28 w-full rounded-[20px]" />
            <Skeleton className="h-16 w-full rounded-[20px]" />
            <Skeleton className="h-16 w-full rounded-[20px]" />
          </div>
        ) : entries.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Wallet className="size-6" />}
              title="Belum ada pendapatan"
              description="Riwayat pendapatan akan tampil di sini setelah pengiriman selesai."
            />
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {entries.map((e) => (
              <Card key={e.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    Pengiriman #{e.id}
                    {e.note ? ` · ${e.note}` : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">{formatDateTime(e.createdAt)}</p>
                </div>
                <span className="text-sm font-bold text-ok">+{formatCurrency(e.baseFee + e.bonusAmount)}</span>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
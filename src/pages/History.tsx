import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ScrollText, MapPin } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { FilterPill } from '@/components/ui/FilterPill';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTodayDeliveries, invalidateDeliveries } from '@/hooks/use-deliveries';
import { formatTime } from '@/lib/format';

type Filter = 'all' | 'sent' | 'failed';

export default function History() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const { data: deliveries, isLoading } = useTodayDeliveries();

  const filtered = (deliveries ?? []).filter((d) => {
    if (filter === 'all') return true;
    if (filter === 'sent') return d.status === 'Terkirim';
    if (filter === 'failed') return d.status === 'Gagal';
    return true;
  });

  const counts = {
    all: (deliveries ?? []).length,
    sent: (deliveries ?? []).filter((d) => d.status === 'Terkirim').length,
    failed: (deliveries ?? []).filter((d) => d.status === 'Gagal').length,
  };

  return (
    <AppShell
      title="Riwayat"
      activeTab="history"
      onTabChange={(t) => navigate(t === 'beranda' ? '/' : `/${t}`)}
      onRefresh={() => invalidateDeliveries(queryClient)}
    >
      <div className="flex gap-2 overflow-x-auto pb-2">
        <FilterPill label="Semua" active={filter === 'all'} onClick={() => setFilter('all')} count={counts.all} />
        <FilterPill label="Terkirim" active={filter === 'sent'} onClick={() => setFilter('sent')} count={counts.sent} />
        <FilterPill label="Gagal" active={filter === 'failed'} onClick={() => setFilter('failed')} count={counts.failed} />
      </div>

      {isLoading && !deliveries ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Memuat riwayat">
          {[0, 1, 2].map((n) => (
            <div key={n} className="flex items-start justify-between gap-3 rounded-[20px] bg-raised p-4 shadow-card">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-xl" />
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-44" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ScrollText className="size-6" />}
            title="Belum ada riwayat"
            description="Pengiriman yang selesai atau gagal akan tampil di sini."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((d) => (
              <Card key={d.id} interactive onClick={() => navigate(`/delivery/${d.id}`)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-raised text-ink-secondary">
                      <MapPin className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">{d.customer_name || 'Pelanggan'}</p>
                      <p className="mt-0.5 text-xs text-ink-muted line-clamp-1">{d.address || '-'}</p>
                      <StatusBadge status={d.status} className="mt-1.5" />
                    </div>
                  </div>
                  <span className="text-[10px] text-ink-muted">{formatTime(d.created_at)}</span>
                </div>
              </Card>
            ))}
        </div>
      )}
    </AppShell>
  );
}
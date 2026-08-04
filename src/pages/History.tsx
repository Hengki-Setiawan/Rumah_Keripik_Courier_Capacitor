import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScrollText, MapPin } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { FilterPill } from '@/components/ui/FilterPill';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTodayDeliveries } from '@/hooks/use-deliveries';
import { formatTime } from '@/lib/format';
import type { CourierDelivery } from '@/lib/types';

type Filter = 'all' | 'sent' | 'failed';

export default function History() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const { data: deliveries, isLoading } = useTodayDeliveries();

  const filtered = (deliveries ?? []).filter((d) => {
    if (filter === 'all') return true;
    if (filter === 'sent') return d.status === 'Terkirim';
    if (filter === 'failed') return d.status === 'Gagal';
    return true;
  });

  function statusLabel(s: CourierDelivery['status']): { text: string; cls: string } {
    switch (s) {
      case 'Terkirim':
        return { text: 'Terkirim', cls: 'bg-emerald-500/15 text-emerald-400' };
      case 'Gagal':
        return { text: 'Gagal', cls: 'bg-red-500/15 text-red-400' };
      case 'Dalam_Pengiriman':
        return { text: 'Dalam Pengiriman', cls: 'bg-blue-500/15 text-blue-400' };
      default:
        return { text: s, cls: 'bg-umber-700/40 text-umber-300' };
    }
  }

  const counts = {
    all: (deliveries ?? []).length,
    sent: (deliveries ?? []).filter((d) => d.status === 'Terkirim').length,
    failed: (deliveries ?? []).filter((d) => d.status === 'Gagal').length,
  };

  return (
    <AppShell title="Riwayat" activeTab="history" onTabChange={(t) => navigate(t === 'beranda' ? '/' : `/${t}`)}>
      <div className="flex gap-2 overflow-x-auto pb-2">
        <FilterPill label="Semua" active={filter === 'all'} onClick={() => setFilter('all')} count={counts.all} />
        <FilterPill label="Terkirim" active={filter === 'sent'} onClick={() => setFilter('sent')} count={counts.sent} />
        <FilterPill label="Gagal" active={filter === 'failed'} onClick={() => setFilter('failed')} count={counts.failed} />
      </div>

      {isLoading && !deliveries ? (
        <Card><p className="text-center text-sm text-umber-400 py-6">Memuat...</p></Card>
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
          {filtered.map((d) => {
            const s = statusLabel(d.status);
            return (
              <Card key={d.id} interactive onClick={() => navigate(`/delivery/${d.id}`)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-umber-800 text-umber-300">
                      <MapPin className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-umber-100">{d.customer_name || 'Pelanggan'}</p>
                      <p className="mt-0.5 text-xs text-umber-400 line-clamp-1">{d.address || '-'}</p>
                      <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}>
                        {s.text}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-umber-500">{formatTime(d.created_at)}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
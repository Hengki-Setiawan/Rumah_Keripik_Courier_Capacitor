import { cn } from '@/lib/cn';

export type DeliveryStatus = 'Siap_Dikirim' | 'Dalam_Pengiriman' | 'Terkirim' | 'Gagal';

const statusMap: Record<DeliveryStatus, { label: string; cls: string; dot: string }> = {
  Siap_Dikirim: { label: 'Siap Dikirim', cls: 'bg-info-soft text-info', dot: 'bg-info' },
  Dalam_Pengiriman: { label: 'Dalam Pengiriman', cls: 'bg-brand-soft text-brand', dot: 'bg-brand' },
  Terkirim: { label: 'Terkirim', cls: 'bg-ok-soft text-ok', dot: 'bg-ok' },
  Gagal: { label: 'Gagal', cls: 'bg-alert-soft text-alert', dot: 'bg-alert' },
};

export function StatusBadge({ status, className }: { status: DeliveryStatus | string; className?: string }) {
  const isDelivery = status === 'Dalam_Pengiriman';
  const s = statusMap[status as DeliveryStatus] ?? { label: String(status ?? ''), cls: 'bg-ink-muted/10 text-ink-muted', dot: 'bg-ink-muted' };
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-bold shadow-sm', s.cls, className)}>
      <span className={cn('size-2 rounded-full', s.dot, isDelivery && 'animate-ping opacity-75')} />
      {s.label}
    </span>
  );
}
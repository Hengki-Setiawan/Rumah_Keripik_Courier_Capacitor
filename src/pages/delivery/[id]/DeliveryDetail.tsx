import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { MapPin, Phone, MessageCircle, User, Wallet, Package, Hash, Scale, CreditCard, Bell } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useDeliveryDetail, invalidateDeliveries } from '@/hooks/use-deliveries';
import { useDeliveryStore } from '@/stores/delivery-store';
import { apiRequest } from '@/lib/api-client';
import { enqueueAction } from '@/lib/sync/offline-queue';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { hapticImpact, hapticNotification } from '@/lib/haptics';
import { toast } from '@/stores/toast-store';

export default function DeliveryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const deliveryId = Number(id);
  const { data: delivery, isLoading } = useDeliveryDetail(deliveryId);
  const updateDeliveryStatus = useDeliveryStore((s) => s.updateDeliveryStatus);
  const [busy, setBusy] = useState(false);
  const [notifyBusy, setNotifyBusy] = useState<'arriving' | 'arrived' | null>(null);

  if (isLoading && !delivery) {
    return (
      <AppShell title="Detail Pengiriman" onBack={() => navigate(-1)}>
        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Memuat detail pengiriman">
          <Skeleton className="h-24 w-full rounded-[20px]" />
          <Skeleton className="h-28 w-full rounded-[20px]" />
          <Skeleton className="h-24 w-full rounded-[20px]" />
        </div>
      </AppShell>
    );
  }
  if (!delivery) {
    return <AppShell title="Detail Pengiriman" onBack={() => navigate(-1)}><Card><p className="text-center text-sm text-alert py-6">Pengiriman tidak ditemukan.</p></Card></AppShell>;
  }

  async function transition(status: 'start' | 'arrived' | 'complete') {
    setBusy(true);
    try {
      await apiRequest(`/api/courier/deliveries/${deliveryId}/${status}`, { method: 'POST' });
      updateDeliveryStatus(deliveryId, status === 'start' ? 'Dalam_Pengiriman' : status === 'complete' ? 'Terkirim' : 'Dalam_Pengiriman');
      invalidateDeliveries(queryClient);
      await hapticImpact(status === 'complete' ? 'heavy' : 'light');
      if (status === 'start' || status === 'arrived') {
        navigate(`/delivery/${deliveryId}/proof`);
      } else {
        await hapticNotification('success');
        toast.success('Pengiriman selesai');
        navigate('/');
      }
    } catch {
      await enqueueAction({
        entityType: 'delivery',
        entityId: String(deliveryId),
        action: status,
        payload: { deliveryId },
      });
      updateDeliveryStatus(deliveryId, status === 'start' ? 'Dalam_Pengiriman' : status === 'complete' ? 'Terkirim' : 'Dalam_Pengiriman');
      invalidateDeliveries(queryClient);
      if (status === 'start' || status === 'arrived') {
        navigate(`/delivery/${deliveryId}/proof`);
      } else {
        await hapticNotification('success');
        toast.warning('Offline — "Selesai" disimpan & dikirim otomatis');
        navigate('/');
      }
    } finally {
      setBusy(false);
    }
  }

  async function notifyWa(type: 'arriving' | 'arrived') {
    setNotifyBusy(type);
    try {
      await apiRequest(`/api/courier/deliveries/${deliveryId}/notify-wa`, {
        method: 'POST',
        body: JSON.stringify({ type }),
      });
      await hapticImpact('light');
      toast.success(type === 'arriving' ? 'Pemberitahuan segera tiba terkirim' : 'Pemberitahuan sampai terkirim');
    } catch {
      toast.error('Gagal kirim notifikasi. Periksa koneksi lalu coba lagi.');
    } finally {
      setNotifyBusy(null);
    }
  }

  return (
    <AppShell title="Detail Pengiriman" onBack={() => navigate(-1)}>
      <div className="flex flex-col gap-4">
        <Card elevation={2}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-ink-muted">Kode Pesanan</p>
              <p className="text-lg font-bold text-brand">{delivery.kodePesanan}</p>
            </div>
            <StatusBadge status={delivery.status} />
          </div>
          {delivery.totalBayar > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-sm text-ink-secondary">
              <Wallet className="size-4 text-ink-muted" /> {formatCurrency(delivery.totalBayar)}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-muted">
            {delivery.routePoints.length > 0 && (
              <span className="flex items-center gap-1">
                <Hash className="size-3" /> Rute ke-{delivery.routePoints[0].sequenceNo} dari {delivery.routePoints.length}
              </span>
            )}
            {delivery.totalQty ? (
              <span className="flex items-center gap-1">
                <Package className="size-3" /> {delivery.totalQty} item
              </span>
            ) : null}
            {delivery.totalBeratGram ? (
              <span className="flex items-center gap-1">
                <Scale className="size-3" /> {formatBerat(delivery.totalBeratGram)}
              </span>
            ) : null}
          </div>
        </Card>

        <Card>
          <p className="mb-2 text-xs font-semibold text-ink-muted">Penerima</p>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-highest text-ink-secondary">
              <User className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">{delivery.namaPenerima || 'Penerima'}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{delivery.noHpPenerima || '-'}</p>
            </div>
          </div>
          <div className="mt-3 flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-ink-muted" />
            <p className="text-sm text-ink-secondary">{delivery.alamatPenerima || 'Alamat tidak tersedia'}</p>
          </div>
          {delivery.catatan && <p className="mt-2 text-xs text-ink-muted">Catatan: {delivery.catatan}</p>}
          <p className="mt-1 text-[11px] text-ink-muted">Dipesan {formatDateTime(delivery.createdAt)}</p>
        </Card>

        {delivery.items && delivery.items.length > 0 && (
          <Card>
            <div className="mb-2 flex items-center gap-1.5">
              <Package className="size-4 text-ink-muted" />
              <p className="text-xs font-semibold text-ink-muted">Rincian Pesanan</p>
            </div>
            <div className="flex flex-col gap-2">
              {delivery.items.map((item, idx) => (
                <div key={idx} className="flex items-start justify-between gap-2 border-b border-border-subtle pb-2 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">
                      {item.namaProduk || 'Produk'}
                      {item.varian ? <span className="text-ink-muted"> · {item.varian}</span> : null}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {item.qty} × {formatCurrency(item.harga)}
                      {item.beratGram ? ` · ${item.beratGram} g` : ''}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-ink">{formatCurrency(item.subtotal)}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {delivery.noHpPenerima && (
          <div className="grid grid-cols-2 gap-3">
            <a
              href={`tel:${delivery.noHpPenerima}`}
              className="flex items-center justify-center gap-2 rounded-2xl border border-border-default bg-raised py-3 text-sm font-semibold text-ink hover:border-brand/50"
            >
              <Phone className="size-4" /> Telepon
            </a>
            <a
              href={`https://wa.me/${delivery.noHpPenerima.replace(/^0/, '62')}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl border border-ok/40 bg-ok-soft py-3 text-sm font-semibold text-ok hover:border-ok/70"
            >
              <MessageCircle className="size-4" /> WhatsApp
            </a>
          </div>
        )}

        <Card>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-ink-muted">
                <CreditCard className="size-4" /> Pembayaran
              </span>
              <span className="font-medium text-ink">
                {paymentLabel(delivery.statusPembayaran || delivery.paymentStatus)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Total Item</span>
              <span className="font-medium text-ink">{delivery.totalQty ?? delivery.items?.length ?? 0} item</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Total Berat</span>
              <span className="font-medium text-ink">
                {delivery.totalBeratGram ? formatBerat(delivery.totalBeratGram) : '-'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Subtotal</span>
              <span className="font-semibold tabular-nums text-brand">{formatCurrency(delivery.totalBayar)}</span>
            </div>
            {delivery.notes && (
              <div className="border-t border-border-subtle pt-2 text-xs text-ink-muted">
                Catatan kurir: {delivery.notes}
              </div>
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-2">
          {delivery.status === 'Siap_Dikirim' ? (
            <Button size="lg" loading={busy} onClick={() => transition('start')} fullWidth>
              Mulai Pengiriman
            </Button>
          ) : delivery.status === 'Dalam_Pengiriman' ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="secondary" loading={notifyBusy === 'arriving'} disabled={notifyBusy !== null} onClick={() => notifyWa('arriving')} fullWidth>
                  <Bell className="mr-1.5 size-4" /> Segera Tiba
                </Button>
                <Button size="sm" variant="secondary" loading={notifyBusy === 'arrived'} disabled={notifyBusy !== null} onClick={() => notifyWa('arrived')} fullWidth>
                  <Bell className="mr-1.5 size-4" /> Sudah Sampai
                </Button>
              </div>
              <Button size="lg" variant="success" loading={busy} onClick={() => transition('arrived')} fullWidth>
                Saya Sudah Sampai
              </Button>
              <Button size="lg" variant="secondary" loading={busy} onClick={() => transition('complete')} fullWidth>
                Selesaikan Pengiriman
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

function paymentLabel(s: string | null | undefined): string {
  switch (s) {
    case 'Lunas':
    case 'paid':
    case 'Paid':
      return 'Lunas';
    case 'Piutang':
      return 'Piutang';
    case 'Tidak_Lunas':
      return 'Belum Lunas';
    case 'Menunggu_Verifikasi':
    case 'Menunggu_Bayar':
    case 'unpaid':
    case 'Unpaid':
      return 'Menunggu Pembayaran';
    case 'Dibatalkan':
      return 'Dibatalkan';
    default:
      return s || '-';
  }
}

function formatBerat(gram: number): string {
  if (gram >= 1000) return `${(gram / 1000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} kg`;
  return `${gram} g`;
}
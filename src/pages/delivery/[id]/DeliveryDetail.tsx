import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { MapPin, Phone, MessageCircle, User, Wallet, Package, Hash, Scale, CreditCard, Bell, Camera, XCircle } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { SwipeAction } from '@/components/ui/SwipeAction';
import { useDeliveryDetail, invalidateDeliveries } from '@/hooks/use-deliveries';
import { useDeliveryStore } from '@/stores/delivery-store';
import { apiRequest } from '@/lib/api-client';
import { enqueueAction } from '@/lib/sync/offline-queue';
import { formatCurrency } from '@/lib/format';
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
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Memuat detail pengiriman">
          <Skeleton className="h-28 w-full rounded-3xl" />
          <Skeleton className="h-44 w-full rounded-3xl" />
          <Skeleton className="h-32 w-full rounded-3xl" />
        </div>
      </AppShell>
    );
  }
  if (!delivery) {
    return (
      <AppShell title="Detail Pengiriman" onBack={() => navigate(-1)}>
        <Card className="rounded-3xl py-8 text-center">
          <p className="text-sm font-semibold text-alert">Pengiriman tidak ditemukan.</p>
        </Card>
      </AppShell>
    );
  }

  async function transition(status: 'complete') {
    setBusy(true);
    try {
      await apiRequest(`/api/courier/deliveries/${deliveryId}/${status}`, { method: 'POST' });
      updateDeliveryStatus(deliveryId, 'Terkirim');
      invalidateDeliveries(queryClient);
      await hapticImpact('heavy');
      await hapticNotification('success');
      toast.success('Pengiriman selesai');
      navigate('/');
    } catch {
      await enqueueAction({
        entityType: 'delivery',
        entityId: String(deliveryId),
        action: status,
        payload: { deliveryId },
      });
      updateDeliveryStatus(deliveryId, 'Terkirim');
      invalidateDeliveries(queryClient);
      await hapticNotification('success');
      toast.warning('Offline — "Selesai" disimpan & dikirim otomatis');
      navigate('/');
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
        {/* Single Fluid Frameless Container */}
        <Card elevation={2} className="relative overflow-hidden rounded-3xl border border-white/10 bg-surface/90 shadow-frameless backdrop-blur-xl p-5">
          <div className="absolute -right-8 -top-8 size-36 rounded-full bg-brand/15 blur-xl pointer-events-none" />
          
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-ink-muted">Kode Pesanan</p>
              <p className="text-xl font-extrabold text-brand tracking-tight">{delivery.kodePesanan}</p>
            </div>
            <StatusBadge status={delivery.status} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-y border-border-subtle/50 py-3 text-xs text-ink-secondary">
            {delivery.totalBayar > 0 && (
              <span className="flex items-center gap-1 font-bold text-ink">
                <Wallet className="size-4 text-brand" /> {formatCurrency(delivery.totalBayar)}
              </span>
            )}
            {delivery.routePoints.length > 0 && (
              <span className="flex items-center gap-1">
                <Hash className="size-3 text-ink-muted" /> Stop ke-{delivery.routePoints[0].sequenceNo}
              </span>
            )}
            {delivery.totalQty ? (
              <span className="flex items-center gap-1">
                <Package className="size-3 text-ink-muted" /> {delivery.totalQty} item
              </span>
            ) : null}
            {delivery.totalBeratGram ? (
              <span className="flex items-center gap-1">
                <Scale className="size-3 text-ink-muted" /> {formatBerat(delivery.totalBeratGram)}
              </span>
            ) : null}
          </div>

          {/* Recipient Section */}
          <div className="mt-4">
            <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Penerima Paket</p>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-highest text-ink shadow-inner font-bold">
                  {delivery.namaPenerima?.charAt(0) || <User className="size-4" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-ink">{delivery.namaPenerima || 'Penerima'}</p>
                  <p className="text-xs text-ink-muted">{delivery.noHpPenerima || '-'}</p>
                </div>
              </div>
              {delivery.noHpPenerima && (
                <div className="flex items-center gap-1.5">
                  <a
                    href={`tel:${delivery.noHpPenerima}`}
                    aria-label="Telepon penerima"
                    className="flex size-9 items-center justify-center rounded-xl bg-raised border border-border-subtle text-ink shadow-sm active:scale-95 transition-all"
                  >
                    <Phone className="size-4" />
                  </a>
                  <a
                    href={`https://wa.me/${delivery.noHpPenerima.replace(/^0/, '62')}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Chat WhatsApp penerima"
                    className="flex size-9 items-center justify-center rounded-xl bg-ok-soft text-ok border border-ok/30 shadow-sm active:scale-95 transition-all"
                  >
                    <MessageCircle className="size-4" />
                  </a>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-2xl bg-raised/60 p-3 text-xs text-ink-secondary">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand" />
              <div>
                <p className="font-semibold text-ink">{delivery.alamatPenerima || 'Alamat tidak tersedia'}</p>
                {delivery.catatan && <p className="mt-1 text-ink-muted italic">Catatan: {delivery.catatan}</p>}
              </div>
            </div>
          </div>

          {/* WhatsApp One-Tap Quick Notify Pills */}
          {(delivery.status === 'Siap_Dikirim' || delivery.status === 'Dalam_Pengiriman') && (
            <div className="mt-3.5 grid grid-cols-2 gap-2">
              <button
                disabled={notifyBusy !== null}
                onClick={() => notifyWa('arriving')}
                className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-brand/25 bg-brand-soft px-3 text-xs font-bold text-brand-pressed active:scale-95 transition-all disabled:opacity-50"
              >
                <Bell className="size-3.5" />
                <span>{notifyBusy === 'arriving' ? 'Mengirim...' : 'Segera Tiba'}</span>
              </button>
              <button
                disabled={notifyBusy !== null}
                onClick={() => notifyWa('arrived')}
                className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-brand/25 bg-brand-soft px-3 text-xs font-bold text-brand-pressed active:scale-95 transition-all disabled:opacity-50"
              >
                <Bell className="size-3.5" />
                <span>{notifyBusy === 'arrived' ? 'Mengirim...' : 'Sudah Sampai'}</span>
              </button>
            </div>
          )}

          {/* Items & Payment Section */}
          {delivery.items && delivery.items.length > 0 && (
            <div className="mt-4 border-t border-border-subtle/50 pt-3">
              <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">Rincian Barang</p>
              <div className="flex flex-col gap-2">
                {delivery.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1">
                    <div>
                      <p className="font-semibold text-ink">
                        {item.namaProduk || 'Produk'}
                        {item.varian ? <span className="text-ink-muted"> ({item.varian})</span> : null}
                      </p>
                      <p className="text-ink-muted">{item.qty} pcs &middot; {formatCurrency(item.harga)}</p>
                    </div>
                    <span className="font-bold tabular-nums text-ink">{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 pt-2.5 border-t border-border-subtle/50 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-ink-muted">
              <CreditCard className="size-3.5" /> {paymentLabel(delivery.statusPembayaran || delivery.paymentStatus)}
            </span>
            <span className="font-extrabold text-sm text-brand">{formatCurrency(delivery.totalBayar)}</span>
          </div>
        </Card>

        {/* Action Controls: Swipe-to-Action & Secondary Actions */}
        {(delivery.status === 'Siap_Dikirim' || delivery.status === 'Dalam_Pengiriman') && (
          <div className="flex flex-col gap-3 mt-1">
            <SwipeAction
              label="Geser untuk Selesaikan"
              variant="success"
              loading={busy}
              onComplete={() => transition('complete')}
            />

            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant="secondary"
                size="md"
                onClick={() => navigate(`/delivery/${deliveryId}/proof`)}
                className="rounded-2xl font-bold border border-white/10"
              >
                <Camera className="mr-1.5 size-4" /> Foto / Bukti
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={() => navigate(`/delivery/${deliveryId}/proof?fail=1`)}
                className="rounded-2xl font-bold bg-alert/15 text-alert border border-alert/30 hover:bg-alert/25"
              >
                <XCircle className="mr-1.5 size-4" /> Tandai Gagal
              </Button>
            </div>
          </div>
        )}
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
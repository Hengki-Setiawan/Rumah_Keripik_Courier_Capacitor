import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Phone, MessageCircle, User, ArrowLeft, Wallet } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useDeliveryDetail } from '@/hooks/use-deliveries';
import { useDeliveryStore } from '@/stores/delivery-store';
import { apiRequest } from '@/lib/api-client';
import { enqueueAction } from '@/lib/sync/offline-queue';
import { formatCurrency, formatDateTime } from '@/lib/format';

export default function DeliveryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const deliveryId = Number(id);
  const { data: delivery, isLoading } = useDeliveryDetail(deliveryId);
  const updateDeliveryStatus = useDeliveryStore((s) => s.updateDeliveryStatus);
  const [busy, setBusy] = useState(false);

  if (isLoading && !delivery) {
    return <AppShell title="Detail Pengiriman"><Card><p className="text-center text-sm text-umber-400 py-6">Memuat...</p></Card></AppShell>;
  }
  if (!delivery) {
    return <AppShell title="Detail Pengiriman"><Card><p className="text-center text-sm text-red-400 py-6">Pengiriman tidak ditemukan.</p></Card></AppShell>;
  }

  async function transition(status: 'start' | 'arrived' | 'complete') {
    setBusy(true);
    try {
      await apiRequest(`/api/courier/deliveries/${deliveryId}/${status}`, { method: 'POST' });
      updateDeliveryStatus(deliveryId, status === 'start' ? 'Dalam_Pengiriman' : status === 'complete' ? 'Terkirim' : 'Dalam_Pengiriman');
      if (status === 'start' || status === 'arrived') {
        navigate(`/delivery/${deliveryId}/proof`);
      } else {
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
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Detail Pengiriman">
      <div className="flex flex-col gap-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs text-amber-500">
          <ArrowLeft className="size-3.5" /> Kembali
        </button>

        <Card elevation={2}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-umber-400">Kode Pesanan</p>
              <p className="text-lg font-bold text-amber-500">{delivery.kodePesanan}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusBadge(delivery.status)}`}>
              {delivery.status}
            </span>
          </div>
          {delivery.totalBayar > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-sm text-umber-200">
              <Wallet className="size-4 text-umber-400" /> {formatCurrency(delivery.totalBayar)}
            </div>
          )}
        </Card>

        <Card>
          <p className="mb-2 text-xs font-semibold text-umber-400">Penerima</p>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-umber-800 text-umber-300">
              <User className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-umber-100">{delivery.namaPenerima || 'Penerima'}</p>
              <p className="mt-0.5 text-xs text-umber-400">{delivery.noHpPenerima || '-'}</p>
            </div>
          </div>
          <div className="mt-3 flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-umber-400" />
            <p className="text-sm text-umber-200">{delivery.alamatPenerima || 'Alamat tidak tersedia'}</p>
          </div>
          {delivery.catatan && <p className="mt-2 text-xs text-umber-500">Catatan: {delivery.catatan}</p>}
          <p className="mt-1 text-[11px] text-umber-500">Dipesan {formatDateTime(delivery.createdAt)}</p>
        </Card>

        {delivery.noHpPenerima && (
          <div className="grid grid-cols-2 gap-3">
            <a
              href={`tel:${delivery.noHpPenerima}`}
              className="flex items-center justify-center gap-2 rounded-2xl border border-umber-700 bg-umber-900 py-3 text-sm font-semibold text-umber-100 hover:border-amber-600/50"
            >
              <Phone className="size-4" /> Telepon
            </a>
            <a
              href={`https://wa.me/${delivery.noHpPenerima.replace(/^0/, '62')}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-600/40 bg-emerald-950/30 py-3 text-sm font-semibold text-emerald-400 hover:border-emerald-500/70"
            >
              <MessageCircle className="size-4" /> WhatsApp
            </a>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {delivery.status === 'Siap_Dikirim' ? (
            <Button size="lg" loading={busy} onClick={() => transition('start')} fullWidth>
              Mulai Pengiriman
            </Button>
          ) : delivery.status === 'Dalam_Pengiriman' ? (
            <>
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

function statusBadge(s: string): string {
  switch (s) {
    case 'Terkirim':
      return 'bg-emerald-500/15 text-emerald-400';
    case 'Gagal':
      return 'bg-red-500/15 text-red-400';
    case 'Dalam_Pengiriman':
      return 'bg-blue-500/15 text-blue-400';
    default:
      return 'bg-umber-700/40 text-umber-300';
  }
}
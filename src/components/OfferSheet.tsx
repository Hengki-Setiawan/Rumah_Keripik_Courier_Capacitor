import { Package } from 'lucide-react';
import { useOfferStore } from '@/stores/offer-store';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export function OfferSheet() {
  const { offer, busy, error, respond, dismiss } = useOfferStore();

  if (!offer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <Card elevation={3} className="w-full max-w-md rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Package className="size-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-ink">Tawaran Pengiriman Baru</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {offer.deliveryId != null
                ? `Pengiriman #${offer.deliveryId} menunggu jawaban Anda.`
                : 'Ada tawaran pengiriman menunggu jawaban Anda.'}
            </p>
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-alert">{error}</p>}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button variant="danger" loading={busy} onClick={() => respond('reject')} fullWidth>
            Tolak
          </Button>
          <Button variant="success" loading={busy} onClick={() => respond('accept')} fullWidth>
            Terima
          </Button>
        </div>
        <div className="mt-3 text-center">
          <button onClick={dismiss} className="flex h-11 items-center text-[11px] text-ink-muted underline">
            Nanti
          </button>
        </div>
      </Card>
    </div>
  );
}
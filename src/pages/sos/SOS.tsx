import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Siren, MapPin, PhoneCall } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { hapticVibrate, hapticNotification } from '@/lib/haptics';
import { apiRequest } from '@/lib/api-client';
import { enqueueAction } from '@/lib/sync/offline-queue';
import { getCurrentPosition } from '@/lib/location';
import { toast } from '@/stores/toast-store';

const SOS_REASONS = ['Kecelakaan', 'Kendaraan Mogok', 'Darurat Medis', 'Terlambat', 'Lainnya'];
const HOLD_MS = 800;
const RING_R = 9;
const RING_C = 2 * Math.PI * RING_R;

export default function SOS() {
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [reason, setReason] = useState(SOS_REASONS[0]);
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (holdTimer.current) clearInterval(holdTimer.current);
    };
  }, []);

  async function triggerSOS() {
    if (sending || sent) return;
    setSending(true);
    await hapticVibrate();
    let location: { lat: number; lng: number } | undefined;
    try {
      const pos = await getCurrentPosition();
      if (pos) location = { lat: pos.lat, lng: pos.lng };
    } catch {
      // lanjut tanpa lokasi
    }
    const payload = {
      location,
      timestamp: new Date().toISOString(),
      metadata: { reason },
    };
    try {
      await apiRequest('/api/courier/sos', { method: 'POST', body: JSON.stringify(payload) });
      setSent(true);
      toast.success('Laporan SOS terkirim');
    } catch {
      await enqueueAction({ entityType: 'sos', entityId: Date.now().toString(), action: 'report', payload: payload as unknown as Record<string, unknown> });
      setSent(true);
      toast.warning('Offline — laporan disimpan & dikirim otomatis');
    } finally {
      setSending(false);
    }
    await hapticNotification('success');
  }

  function startHold() {
    if (sending || sent) return;
    setHolding(true);
    setProgress(0);
    const start = Date.now();
    holdTimer.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        cancelHold();
        void triggerSOS();
      }
    }, 30);
  }

  function cancelHold() {
    if (holdTimer.current) clearInterval(holdTimer.current);
    holdTimer.current = null;
    setHolding(false);
    setProgress(0);
  }

  function callAdmin() {
    window.location.href = 'tel:081234567890';
  }

  const holdLabel = sending ? 'Mengirim...' : holding ? 'Lepaskan untuk batal' : 'Tahan untuk Kirim SOS';

  return (
    <AppShell title="SOS Darurat" onBack={() => navigate(-1)}>
      <div className="flex flex-col gap-4">
        <Card className="bg-alert-soft">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-alert text-on-danger">
              <Siren className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-alert">Keadaan Darurat</p>
              <p className="mt-0.5 text-xs text-ink-secondary">
                Tahan tombol SOS untuk mengirim laporan mendesak ke admin beserta lokasi Anda.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <p className="mb-2 text-xs font-medium text-ink-secondary">Alasan</p>
          <div className="flex flex-wrap gap-2">
            {SOS_REASONS.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={cn(
                  'h-11 rounded-full px-4 text-sm font-medium transition-colors',
                  reason === r ? 'bg-alert text-on-danger' : 'bg-surface text-ink-secondary',
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <MapPin className="size-5 text-ink-muted" />
            <p className="text-xs text-ink-secondary">Lokasi otomatis terlampir jika tersedia</p>
          </div>
        </Card>

        <div className="relative w-full select-none touch-none">
          <button
            type="button"
            onPointerDown={startHold}
            onPointerUp={cancelHold}
            onPointerLeave={cancelHold}
            onPointerCancel={cancelHold}
            onContextMenu={(e) => e.preventDefault()}
            disabled={sending || sent}
            aria-label="Kirim SOS (tahan untuk konfirmasi)"
            className={cn(
              'flex h-14 w-full items-center justify-center rounded-2xl bg-alert text-base font-semibold text-on-danger shadow-card',
              'transition-all duration-150 active:scale-[0.98] disabled:opacity-60',
            )}
          >
            <span className="relative flex items-center justify-center gap-2">
              <svg width="24" height="24" viewBox="0 0 24 24" className="-rotate-90">
                <circle cx="12" cy="12" r={RING_R} stroke="currentColor" strokeOpacity="0.35" strokeWidth="3" fill="none" />
                <circle
                  cx="12"
                  cy="12"
                  r={RING_R}
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  strokeDashoffset={RING_C * (1 - progress)}
                  className="transition-none"
                />
              </svg>
              {sent ? 'Laporan Terkirim' : holdLabel}
            </span>
          </button>
          {holding && (
            <p className="mt-2 text-center text-xs text-ink-secondary">
              Lepaskan sebelum 1 detik untuk membatalkan.
            </p>
          )}
        </div>

        <Button variant="secondary" size="xl" onClick={callAdmin} fullWidth>
          <PhoneCall className="size-5" /> Hubungi Admin via Telepon
        </Button>

        {sent && (
          <Card className="bg-ok-soft">
            <p className="text-center text-sm font-semibold text-ok">
              Laporan SOS terkirim. Tim akan segera menghubungi Anda.
            </p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
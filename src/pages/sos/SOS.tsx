import { useState } from 'react';
import { Siren, MapPin, PhoneCall } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiRequest } from '@/lib/api-client';
import { enqueueAction } from '@/lib/sync/offline-queue';
import { getCurrentPosition } from '@/lib/location';

const SOS_REASONS = ['Kecelakaan', 'Kendaraan Mogok', 'Darurat Medis', 'Terlambat', 'Lainnya'];

export default function SOS() {
    const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [reason, setReason] = useState(SOS_REASONS[0]);

  async function triggerSOS() {
    setSending(true);
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
    } catch {
      await enqueueAction({ entityType: 'sos', entityId: Date.now().toString(), action: 'report', payload: payload as unknown as Record<string, unknown> });
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  function callAdmin() {
    // Alur darurat: panggil admin via telepon
    window.location.href = 'tel:081234567890';
  }

  return (
    <AppShell title="SOS Darurat">
      <div className="flex flex-col gap-4">
        <Card className="border-red-600/40 bg-red-950/20">
          <div className="flex items-center gap-3">
            <Siren className="size-6 text-red-500" />
            <div>
              <p className="text-sm font-bold text-red-300">Keadaan Darurat</p>
              <p className="mt-0.5 text-xs text-red-300/70">
                Tombol ini mengirim laporan mendesak ke admin beserta lokasi Anda.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <p className="mb-2 text-xs font-medium text-umber-400">Alasan</p>
          <div className="flex flex-wrap gap-2">
            {SOS_REASONS.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  reason === r
                    ? 'bg-red-500 text-white border-red-500'
                    : 'bg-umber-900 border-umber-700 text-umber-300'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <MapPin className="size-5 text-umber-400" />
            <p className="text-xs text-umber-400">Lokasi otomatis terlampir jika tersedia</p>
          </div>
        </Card>

        <Button variant="danger" size="xl" loading={sending} onClick={triggerSOS} fullWidth className="shadow-glow-red">
          {sent ? 'Laporan Terkirim' : 'Kirim SOS'}
        </Button>

        <Button variant="ghost" onClick={callAdmin}>
          <PhoneCall className="size-4" /> Hubungi Admin via Telepon
        </Button>

        {sent && (
          <Card className="border-emerald-500/30 bg-emerald-500/10">
            <p className="text-center text-sm font-semibold text-emerald-400">
              Laporan SOS terkirim. Tim akan segera menghubungi Anda.
            </p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
import { useState } from 'react';
import { AlertTriangle, MapPin } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiRequest } from '@/lib/api-client';
import { enqueueAction } from '@/lib/sync/offline-queue';
import { getCurrentPosition } from '@/lib/location';

const INCIDENT_OPTIONS = [
  { label: 'Kecelakaan', value: 'kecelakaan', severity: 'high' },
  { label: 'Kendaraan Mogok', value: 'kendaraan_mogok', severity: 'medium' },
  { label: 'Ban Bocor', value: 'kendaraan_mogok', severity: 'medium' },
  { label: 'Kehabisan Bahan Bakar', value: 'kendaraan_mogok', severity: 'low' },
  { label: 'Lainnya', value: 'lainnya', severity: 'medium' },
];

type IncidentType = 'kecelakaan' | 'kendaraan_mogok' | 'cuaca_ekstrem' | 'keamanan' | 'kesehatan' | 'lainnya';

export default function Incidents() {
  const [selected, setSelected] = useState(INCIDENT_OPTIONS[0]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setSubmitting(true);
    const payload: Record<string, unknown> = {
      type: selected.value as IncidentType,
      severity: selected.severity,
      description,
    };
    try {
      const pos = await getCurrentPosition();
      if (pos) {
        payload.lat = String(pos.lat);
        payload.lng = String(pos.lng);
      }
    } catch {
      // tanpa lokasi
    }
    try {
      await apiRequest('/api/courier/incidents', { method: 'POST', body: payload });
      setDone(true);
    } catch {
      await enqueueAction({ entityType: 'incident', entityId: Date.now().toString(), action: 'report', payload });
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="Lapor Insiden">
      <div className="flex flex-col gap-4">
        <Card className="border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-5 text-amber-500" />
            <p className="text-xs text-umber-300">
              Laporkan kendala selama pengiriman. Laporan dikirim ke admin beserta lokasi Anda.
            </p>
          </div>
        </Card>

        <Card>
          <p className="mb-2 text-xs font-medium text-umber-400">Jenis Insiden</p>
          <div className="flex flex-wrap gap-2">
            {INCIDENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelected(opt)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  selected.value === opt.value ? 'bg-amber-500 text-umber-950 border-amber-500' : 'bg-umber-900 border-umber-700 text-umber-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <p className="mb-2 text-xs font-medium text-umber-400">Keterangan</p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Jelaskan insiden secara singkat..."
            rows={4}
            className="w-full rounded-xl border border-umber-700 bg-umber-950 p-3 text-sm text-umber-100 placeholder:text-umber-600 focus:border-amber-600 focus:outline-none"
          />
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <MapPin className="size-5 text-umber-400" />
            <p className="text-xs text-umber-400">Lokasi otomatis terlampir jika tersedia</p>
          </div>
        </Card>

        <Button size="lg" loading={submitting} onClick={submit} fullWidth>
          {done ? 'Laporan Terkirim' : 'Kirim Laporan'}
        </Button>

        {done && (
          <Card className="border-emerald-500/30 bg-emerald-500/10">
            <p className="text-center text-sm font-semibold text-emerald-400">Laporan berhasil dikirim.</p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
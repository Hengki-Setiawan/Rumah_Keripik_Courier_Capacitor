import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, MapPin } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiRequest } from '@/lib/api-client';
import { enqueueAction } from '@/lib/sync/offline-queue';
import { getCurrentPosition } from '@/lib/location';

type ServerIncidentType = 'kecelakaan' | 'kendaraan_mogok' | 'cuaca_ekstrem' | 'keamanan' | 'kesehatan' | 'lainnya';

interface IncidentOption {
  label: string;
  value: string;
  severity: 'low' | 'medium' | 'high';
}

const INCIDENT_OPTIONS: IncidentOption[] = [
  { label: 'Kecelakaan', value: 'kecelakaan', severity: 'high' },
  { label: 'Kendaraan Mogok', value: 'kendaraan_mogok', severity: 'medium' },
  { label: 'Ban Bocor', value: 'ban_bocor', severity: 'medium' },
  { label: 'Kehabisan Bahan Bakar', value: 'habis_bbm', severity: 'low' },
  { label: 'Cuaca Ekstrem', value: 'cuaca_ekstrem', severity: 'medium' },
  { label: 'Keamanan', value: 'keamanan', severity: 'high' },
  { label: 'Kesehatan', value: 'kesehatan', severity: 'high' },
  { label: 'Lainnya', value: 'lainnya', severity: 'medium' },
];

// Memetakan pilihan lokal ke enum server (server hanya menerima 6 nilai tetap).
const TO_SERVER_TYPE: Record<string, ServerIncidentType> = {
  kecelakaan: 'kecelakaan',
  kendaraan_mogok: 'kendaraan_mogok',
  cuaca_ekstrem: 'cuaca_ekstrem',
  keamanan: 'keamanan',
  kesehatan: 'kesehatan',
  ban_bocor: 'lainnya',
  habis_bbm: 'lainnya',
  lainnya: 'lainnya',
};

export default function Incidents() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<IncidentOption>(INCIDENT_OPTIONS[0]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setSubmitting(true);
    const payload: Record<string, unknown> = {
      type: TO_SERVER_TYPE[selected.value],
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
    <AppShell title="Lapor Insiden" onBack={() => navigate(-1)}>
      <div className="flex flex-col gap-4">
        <Card className="border-brand/30 bg-brand-soft">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-5 text-brand" />
            <p className="text-xs text-ink-secondary">
              Laporkan kendala selama pengiriman. Laporan dikirim ke admin beserta lokasi Anda.
            </p>
          </div>
        </Card>

        <Card>
          <p className="mb-2 text-xs font-medium text-ink-muted">Jenis Insiden</p>
          <div className="flex flex-wrap gap-2">
            {INCIDENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelected(opt)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  selected.value === opt.value ? 'bg-brand text-on-accent border-brand' : 'bg-surface border-border-subtle text-ink-secondary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <p className="mb-2 text-xs font-medium text-ink-muted">Keterangan</p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Jelaskan insiden secara singkat..."
            rows={4}
            className="w-full rounded-xl border border-border-subtle bg-surface p-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
          />
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <MapPin className="size-5 text-ink-muted" />
            <p className="text-xs text-ink-muted">Lokasi otomatis terlampir jika tersedia</p>
          </div>
        </Card>

        <Button size="lg" loading={submitting} onClick={submit} fullWidth>
          {done ? 'Laporan Terkirim' : 'Kirim Laporan'}
        </Button>

        {done && (
          <Card className="border-ok/30 bg-ok-soft">
            <p className="text-center text-sm font-semibold text-ok">Laporan berhasil dikirim.</p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
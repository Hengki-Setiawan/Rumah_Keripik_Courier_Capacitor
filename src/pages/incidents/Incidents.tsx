import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, MapPin } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiRequest } from '@/lib/api-client';
import { enqueueAction } from '@/lib/sync/offline-queue';
import { getCurrentPosition } from '@/lib/location';
import { toast } from '@/stores/toast-store';

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
      toast.success('Laporan berhasil dikirim');
    } catch {
      await enqueueAction({ entityType: 'incident', entityId: Date.now().toString(), action: 'report', payload });
      setDone(true);
      toast.warning('Offline — laporan disimpan & dikirim otomatis');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="Lapor Insiden" onBack={() => navigate(-1)}>
      <div className="flex flex-col gap-4">
        {/* Banner Info */}
        <div className="flex items-center gap-3 rounded-2xl border border-brand/25 bg-brand-soft p-3.5 shadow-sm">
          <AlertTriangle className="size-5 shrink-0 text-brand" />
          <p className="text-xs font-semibold text-brand-pressed leading-snug">
            Laporkan kendala di jalan. Laporan terkirim ke admin dengan lokasi GPS terkini.
          </p>
        </div>

        {/* Unified Form Card */}
        <Card elevation={2} className="rounded-3xl border border-white/10 bg-surface/90 p-4 shadow-frameless backdrop-blur-xl">
          <p className="mb-2 text-xs font-bold text-ink-muted uppercase tracking-wider">Pilih Jenis Kendala</p>
          <div className="grid grid-cols-2 gap-2">
            {INCIDENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelected(opt)}
                className={`flex h-12 items-center justify-center rounded-2xl border px-3 text-xs font-bold transition-all active:scale-95 ${
                  selected.value === opt.value
                    ? 'bg-brand text-on-accent border-brand shadow-[0_4px_12px_rgba(197,90,43,0.35)]'
                    : 'bg-raised/70 border-border-subtle text-ink-secondary hover:text-ink'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="mt-4 border-t border-border-subtle/50 pt-3">
            <p className="mb-2 text-xs font-bold text-ink-muted uppercase tracking-wider">Keterangan Tambahan</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan detail kendala (opsional)..."
              rows={3}
              className="w-full rounded-2xl border border-border-subtle bg-raised/50 p-3.5 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none transition-colors"
            />
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
            <MapPin className="size-4 text-brand" />
            <span>Lokasi GPS otomatis dilampirkan</span>
          </div>
        </Card>

        <Button
          size="lg"
          loading={submitting}
          disabled={done}
          onClick={submit}
          fullWidth
          className="h-14 rounded-2xl font-extrabold shadow-card-lg"
        >
          {done ? '✓ Laporan Berhasil Dikirim' : 'Kirim Laporan Insiden'}
        </Button>
      </div>
    </AppShell>
  );
}
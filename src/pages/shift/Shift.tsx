import { useEffect, useState } from 'react';
import { TimerReset, MapPin, Clock3, Play, Square } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiRequest } from '@/lib/api-client';
import { enqueueAction } from '@/lib/sync/offline-queue';
import { getCurrentPosition } from '@/lib/location';
import { startLocationTracking, stopLocationTracking } from '@/lib/background-location';
import { formatTime } from '@/lib/format';

interface ClockInResponse {
  ok: boolean;
  data: { shiftId: number; clockInAt: string };
}

export default function Shift() {
  const [isActive, setIsActive] = useState(false);
  const [clockedAt, setClockedAt] = useState<string | null>(null);
  const [shiftId, setShiftId] = useState<number | null>(null);
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getCurrentPosition()
      .then((p) => { if (p) setLoc({ lat: p.lat, lng: p.lng }); })
      .catch(() => undefined);
  }, []);

  async function clockIn() {
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {};
      if (loc) {
        payload.lat = loc.lat;
        payload.lng = loc.lng;
      }
      const res = await apiRequest<ClockInResponse>('/api/courier/shift/clock-in', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setShiftId(res.data.shiftId);
      setClockedAt(res.data.clockInAt);
      setIsActive(true);
      await startLocationTracking();
    } catch {
      await enqueueAction({
        entityType: 'shift',
        entityId: 'clock-in',
        action: 'clock-in',
        payload: loc ? { lat: loc.lat, lng: loc.lng } : {},
      });
      setIsActive(true);
      setClockedAt(new Date().toISOString());
      await startLocationTracking();
    } finally {
      setBusy(false);
    }
  }

  async function clockOut() {
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {};
      if (loc) {
        payload.lat = loc.lat;
        payload.lng = loc.lng;
      }
      await apiRequest('/api/courier/shift/clock-out', { method: 'POST', body: JSON.stringify(payload) });
    } catch {
      await enqueueAction({
        entityType: 'shift',
        entityId: 'clock-out',
        action: 'clock-out',
        payload: { shiftId },
      });
    } finally {
      await stopLocationTracking();
      setIsActive(false);
      setShiftId(null);
      setClockedAt(null);
      setBusy(false);
    }
  }

  return (
    <AppShell title="Shift">
      <div className="flex flex-col gap-4">
        <Card elevation={2} className="flex flex-col items-center gap-4 py-8">
          <div
            className={`flex size-20 items-center justify-center rounded-full border-2 ${
              isActive ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-amber-500 bg-amber-500/10 text-amber-500'
            }`}
          >
            {isActive ? <Play className="size-9" /> : <TimerReset className="size-9" />}
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-umber-50">{isActive ? 'Sedang Aktif' : 'Belum Mulai'}</p>
            <p className="mt-1 text-xs text-umber-400">
              {isActive && clockedAt ? `Mulai ${formatTime(clockedAt)}` : 'Mulai shift untuk menerima pengiriman'}
            </p>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <MapPin className="size-5 text-umber-400" />
            <div>
              <p className="text-xs text-umber-400">Lokasi saat ini</p>
              <p className="text-sm font-semibold text-umber-100">
                {loc ? `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}` : 'Mendapatkan lokasi...'}
              </p>
            </div>
          </div>
        </Card>

<Card>
          <div className="flex items-center gap-3">
            <Clock3 className="size-5 text-umber-400" />
            <div>
              <p className="text-xs text-umber-400">Jam masuk tercatat</p>
              <p className="text-sm font-semibold text-umber-100">{clockedAt ? formatTime(clockedAt) : '—'}</p>
            </div>
          </div>
        </Card>

        {isActive && (
          <Card>
            <div className="flex items-center gap-3">
              <span className="relative flex size-3">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
              </span>
              <p className="text-sm font-semibold text-umber-100">Tracking lokasi aktif</p>
              <p className="ml-auto text-[11px] text-umber-500">Lokasi dikirim berkala</p>
            </div>
          </Card>
        )}

        <Button
          variant={isActive ? 'danger' : 'success'}
          size="xl"
          loading={busy}
          onClick={isActive ? clockOut : clockIn}
          fullWidth
        >
          {isActive ? <Square className="size-5" /> : <Play className="size-5" />}
          {isActive ? 'Akhiri Shift' : 'Mulai Shift'}
        </Button>

        <p className="text-center text-[11px] text-umber-500">
          Jika offline, aksi shift akan disimpan dan dikirim otomatis saat kembali online.
        </p>
      </div>
    </AppShell>
  );
}
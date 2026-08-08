import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TimerReset, MapPin, Clock3, Play, Square, CalendarCheck2, AlertTriangle } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiRequest, ApiError } from '@/lib/api-client';
import { enqueueAction } from '@/lib/sync/offline-queue';
import { getCurrentPosition } from '@/lib/location';
import { startLocationTracking, stopLocationTracking } from '@/lib/background-location';
import { formatTime } from '@/lib/format';
import { hapticImpact, hapticNotification } from '@/lib/haptics';
import type { AttendanceRecord } from '@/lib/types';

interface ClockInResponse {
  ok: boolean;
  data: {
    shiftId: number;
    clockInAt: string;
    geofence?: {
      inside: boolean;
      distanceMeters: number;
      warehouseName: string | null;
      zoneName: string | null;
    } | null;
  };
}

interface AttendanceResponse {
  ok: boolean;
  data: { attendance: AttendanceRecord[] };
}

export default function Shift() {
  const navigate = useNavigate();
  const [isActive, setIsActive] = useState(false);
  const [clockedAt, setClockedAt] = useState<string | null>(null);
  const [shiftId, setShiftId] = useState<number | null>(null);
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geofence, setGeofence] = useState<ClockInResponse['data']['geofence']>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  async function loadAttendance() {
    try {
      const res = await apiRequest<AttendanceResponse>('/api/courier/attendance?limit=7', { method: 'GET' });
      setAttendance(res.data?.attendance ?? []);
    } catch {
      setAttendance([]);
    }
  }

  useEffect(() => {
    getCurrentPosition()
      .then((p) => { if (p) setLoc({ lat: p.lat, lng: p.lng }); })
      .catch(() => undefined);
    loadAttendance();
  }, []);

  async function clockIn() {
    setBusy(true);
    setGeoError(null);
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
      setGeofence(res.data.geofence ?? null);
      setIsActive(true);
      await hapticNotification('success');
      await startLocationTracking();
      loadAttendance();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setGeoError(
          err.details && typeof err.details === 'object' && 'message' in err.details
            ? String((err.details as { message: unknown }).message)
            : 'Lokasi di luar batas radius gudang.',
        );
        await hapticNotification('error');
        return;
      }
      await enqueueAction({
        entityType: 'shift',
        entityId: 'clock-in',
        action: 'clock-in',
        payload: loc ? { lat: loc.lat, lng: loc.lng } : {},
      });
      setIsActive(true);
      setClockedAt(new Date().toISOString());
      setGeofence(null);
      await hapticImpact('light');
      await startLocationTracking();
    } finally {
      setBusy(false);
    }
  }

  async function clockOut() {
    setBusy(true);
    setGeoError(null);
    try {
      const payload: Record<string, unknown> = {};
      if (loc) {
        payload.lat = loc.lat;
        payload.lng = loc.lng;
      }
      await apiRequest('/api/courier/shift/clock-out', { method: 'POST', body: JSON.stringify(payload) });
      await hapticNotification('success');
    } catch {
      await enqueueAction({
        entityType: 'shift',
        entityId: 'clock-out',
        action: 'clock-out',
        payload: { shiftId },
      });
      await hapticImpact('light');
    } finally {
      await stopLocationTracking();
      setIsActive(false);
      setShiftId(null);
      setClockedAt(null);
      setGeofence(null);
      setBusy(false);
      loadAttendance();
    }
  }

  const lastGeo = attendance[0];

  return (
    <AppShell title="Shift" onBack={() => navigate(-1)}>
      <div className="flex flex-col gap-4">
        <Card elevation={2} className="flex flex-col items-center gap-4 py-8">
          <div
            className={`flex size-20 items-center justify-center rounded-full border-2 ${
              isActive ? 'border-ok bg-ok-soft text-ok' : 'border-brand bg-brand-soft text-brand'
            }`}
          >
            {isActive ? <Play className="size-9" /> : <TimerReset className="size-9" />}
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-ink">{isActive ? 'Sedang Aktif' : 'Belum Mulai'}</p>
            <p className="mt-1 text-xs text-ink-muted">
              {isActive && clockedAt ? `Mulai ${formatTime(clockedAt)}` : 'Mulai shift untuk menerima pengiriman'}
            </p>
          </div>
        </Card>

        {geoError && (
          <Card className="border-red-600/40 bg-red-950/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-alert" />
              <div>
                <p className="text-sm font-semibold text-red-200">Lokasi di luar batas</p>
                <p className="mt-1 text-xs text-red-300">{geoError}</p>
              </div>
            </div>
          </Card>
        )}

        {geofence && geofence.zoneName && (
          <Card>
            <div className="flex items-center gap-3">
              <MapPin className="size-5 text-ok" />
              <div>
                <p className="text-xs text-ink-muted">Zona absensi</p>
                <p className="text-sm font-semibold text-ink">
                  {geofence.zoneName || geofence.warehouseName || 'Gudang'}
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card>
          <div className="flex items-center gap-3">
            <MapPin className="size-5 text-ink-muted" />
            <div>
              <p className="text-xs text-ink-muted">Lokasi saat ini</p>
              <p className="text-sm font-semibold text-ink">
                {loc ? `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}` : 'Mendapatkan lokasi...'}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <Clock3 className="size-5 text-ink-muted" />
            <div>
              <p className="text-xs text-ink-muted">Jam masuk tercatat</p>
              <p className="text-sm font-semibold text-ink">{clockedAt ? formatTime(clockedAt) : '—'}</p>
            </div>
          </div>
        </Card>

        {isActive && (
          <Card>
            <div className="flex items-center gap-3">
              <span className="relative flex size-3">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok opacity-60" />
                <span className="relative inline-flex size-3 rounded-full bg-ok" />
              </span>
              <p className="text-sm font-semibold text-ink">Tracking lokasi aktif</p>
              <p className="ml-auto text-[11px] text-ink-muted">Lokasi dikirim berkala</p>
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

        <Card>
          <div className="mb-3 flex items-center gap-3">
            <CalendarCheck2 className="size-5 text-brand" />
            <div>
              <p className="text-sm font-semibold text-ink">Rekap Absensi</p>
              <p className="text-xs text-ink-muted">
                {lastGeo
                  ? lastGeo.clockOutAt
                    ? `Terakhir ${formatTime(lastGeo.clockInAt)} - ${formatTime(lastGeo.clockOutAt)}`
                    : `Masuk ${formatTime(lastGeo.clockInAt)}${lastGeo.status === 'flagged_no_geofence' ? ' (luar zona)' : ''}`
                  : 'Belum ada catatan absensi'}
              </p>
            </div>
          </div>
          {attendance.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {attendance.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center justify-between border-t border-border-subtle pt-1.5 text-xs">
                  <span className="text-ink-secondary">
                    {formatTime(a.clockInAt)}
                    {a.clockOutAt ? ` - ${formatTime(a.clockOutAt)}` : ' - sekarang'}
                  </span>
                  <span className="text-ink-muted">
                    {a.status === 'flagged_no_geofence' ? 'Luar zona' : a.clockOutAt ? 'Selesai' : 'Berjalan'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <p className="text-center text-[11px] text-ink-muted">
          Jika offline, aksi shift akan disimpan dan dikirim otomatis saat kembali online.
        </p>
      </div>
    </AppShell>
  );
}
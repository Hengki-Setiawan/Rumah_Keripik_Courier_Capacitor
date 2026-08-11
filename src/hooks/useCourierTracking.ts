import { useCallback, useEffect, useRef, useState } from 'react';
import type { TrackedLocation } from '@/lib/location';
import type { OptimizedRoute } from '@/lib/routing/types';
import { bearingDegrees, haversineMeters } from '@/lib/routing/distance';
import { interpolateLatLng, isOffRoute } from '@/lib/routing/tracking';

export interface CourierTracking {
  position: TrackedLocation | null;
  bearing: number | null;
  offRoute: boolean;
  offRouteDeviationM: number | null;
  followMode: boolean;
  setFollowMode: (on: boolean) => void;
}

const TWEEN_MS = 450;
const OFF_ROUTE_MAX_M = 80;
const OFF_ROUTE_MIN_MS = 30_000;
const MAX_HISTORY = 40;

/**
 * Tracking kurir yang di-haluskan (tween interpolasi posisi) + rotasi bearing
 * sesuai arah gerak + mode follow camera + deteksi keluar rute (Fase D blueprint).
 */
export function useCourierTracking(
  raw: TrackedLocation | null,
  route: OptimizedRoute | null,
): CourierTracking {
  const [position, setPosition] = useState<TrackedLocation | null>(null);
  const [bearing, setBearing] = useState<number | null>(null);
  const [followMode, setFollowMode] = useState(true);

  const prevRef = useRef<TrackedLocation | null>(null);
  const tweenRef = useRef<{ from: TrackedLocation; to: TrackedLocation; startedAt: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const historyRef = useRef<Array<{ lat: number; lng: number; timestamp: number }>>([]);
  const routeRef = useRef<OptimizedRoute | null>(null);
  routeRef.current = route;

  // Ketika GPS mengirim titik baru, mulai tween dari posisi tampil saat ini.
  useEffect(() => {
    if (!raw) return;

    const from = position ?? raw;
    tweenRef.current = { from, to: raw, startedAt: performance.now() };

    // Saat app di-background rAF berhenti berjalan; langsung lompat ke posisi
    // target agar navigasi+suara tetap update (tween hanya untuk foreground).
    const isHidden = typeof document !== 'undefined' && document.hidden;
    if (isHidden) {
      setPosition(raw);
      prevRef.current = raw;
      tweenRef.current = null;
      return;
    }

    if (raw.speed != null && raw.speed > 0.5) {
      const dist = haversineMeters(from, raw);
      if (dist > 1.5) setBearing(bearingDegrees(from, raw));
    }

    // Simpan jejak untuk deteksi keluar rute (batasi panjangnya).
    const history = historyRef.current;
    history.push({ lat: raw.lat, lng: raw.lng, timestamp: raw.timestamp });
    if (history.length > MAX_HISTORY) history.shift();

    if (rafRef.current != null) return;

    const step = () => {
      const tween = tweenRef.current;
      if (!tween) {
        rafRef.current = null;
        return;
      }
      const t = (performance.now() - tween.startedAt) / TWEEN_MS;
      const stillHidden = typeof document !== 'undefined' && document.hidden;
      if (t >= 1 || stillHidden) {
        setPosition(tween.to);
        prevRef.current = tween.to;
        tweenRef.current = null;
        rafRef.current = null;
        return;
      }
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const mid = interpolateLatLng(tween.from, tween.to, eased);
      setPosition({ ...mid, timestamp: tween.to.timestamp, speed: tween.to.speed, accuracy: tween.to.accuracy });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, [raw]);

  // Pembersihan rAF saat unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Deteksi keluar rute: jalankan tiap 2 detik (hemat).
  const [offRoute, setOffRoute] = useState(false);
  const [offRouteDeviationM, setOffRouteDeviationM] = useState<number | null>(null);
  useEffect(() => {
    const interval = setInterval(() => {
      const routeNow = routeRef.current;
      const pos = prevRef.current;
      if (!routeNow || routeNow.legs.length === 0 || !pos) {
        setOffRoute(false);
        setOffRouteDeviationM(null);
        return;
      }
      const result = isOffRoute(routeNow.legs, OFF_ROUTE_MAX_M, OFF_ROUTE_MIN_MS, historyRef.current);
      setOffRoute(result.offRoute);
      setOffRouteDeviationM(result.deviationM === Infinity ? null : result.deviationM);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const setFollow = useCallback((on: boolean) => setFollowMode(on), []);

  return { position, bearing, offRoute, offRouteDeviationM, followMode, setFollowMode: setFollow };
}

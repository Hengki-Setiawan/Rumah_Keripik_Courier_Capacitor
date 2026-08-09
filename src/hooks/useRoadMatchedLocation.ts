import { useEffect, useRef, useState } from 'react';
import type { TrackedLocation } from '@/lib/location';
import type { OptimizedRoute } from '@/lib/routing/types';
import { snapToRoute } from '@/lib/routing/navigation';
import { haversineMeters } from '@/lib/routing/distance';
import { interpolateLatLng } from '@/lib/routing/tracking';
import { matchShapeToRoad } from '@/lib/routing/valhallaClient';

const TWEEN_MS = 450;
const MAX_BUFFER = 8;
const MATCH_COOLDOWN_MS = 10_000;
// Snap ke jalan hanya untuk leg nyata (polyline dengan banyak vertex dari ORS/OSRM).
// Leg fallback garis lurus hanya punya 2 titik -> menarik marker ke garis imajiner
// yang bukan jalan = penyebab "GPS tidak akurat" di peta.
const MIN_REAL_LEG_VERTICES = 3;
// Batas jarak snap: jika GPS error besar (akurasi buruk), jangan paksa marker
// menempel jauh dari posisi asli ke jalan. Mirip perilaku map-matching Google Maps.
const MAX_SNAP_DIST_M = 60;

interface Tween {
  from: TrackedLocation;
  to: TrackedLocation;
  startedAt: number;
}

/**
 * Map-matching ringan untuk marker kurir (Fase navigasi):
 * - Normal: posisi diproyeksikan ke polyline leg aktif ("menempel di jalan").
 * - Saat di luar rute: Valhalla trace_route menyediakan polyline jalan nyata
 *   yang diambil GPS, sehingga marker ikut jalan tersebut sampai kembali ke rute.
 * Mengembalikan null saat tidak ada rute/posisi (pemanggil memakai posisi mentah).
 */
export function useRoadMatchedLocation(
  raw: TrackedLocation | null,
  route: OptimizedRoute | null,
  legIndex: number,
  offRoute: boolean,
): TrackedLocation | null {
  const [display, setDisplay] = useState<TrackedLocation | null>(null);
  const displayRef = useRef<TrackedLocation | null>(null);
  const tweenRef = useRef<Tween | null>(null);
  const rafRef = useRef<number | null>(null);
  const bufferRef = useRef<TrackedLocation[]>([]);
  const shapeRef = useRef<{ lat: number; lng: number }[] | null>(null);
  const lastMatchAtRef = useRef(0);
  const offRouteRef = useRef(offRoute);
  offRouteRef.current = offRoute;

  // Kumpulkan jejak GPS terbaru (untuk Valhalla map-matching saat off-route).
  useEffect(() => {
    if (!raw) return;
    const buf = bufferRef.current;
    buf.push(raw);
    if (buf.length > MAX_BUFFER) buf.shift();
  }, [raw]);

  // Proyeksi posisi ke garis (leg aktif atau shape hasil match) + tween halus.
  useEffect(() => {
    if (!raw) return;
    const shape = shapeRef.current;
    const leg = route?.legs[legIndex];
    // Leg jalan nyata hanya jika punya cukup vertex. Leg fallback garis lurus
    // (2 titik) tidak boleh dipakai untuk snap marker — itu menarik marker ke
    // garis imajiner yang bukan jalan (akar "GPS tidak akurat").
    const legIsRealRoad = leg != null && leg.coordinates.length >= MIN_REAL_LEG_VERTICES;
    const line: [number, number][] | null =
      shape && shape.length >= 2
        ? shape.map((p) => [p.lng, p.lat] as [number, number])
        : legIsRealRoad
          ? leg.coordinates
          : null;
    if (!line) return;

    const snapped = snapToRoute({ lat: raw.lat, lng: raw.lng }, line);
    if (!snapped) return;
    // Jangan paksa marker menempel jauh dari fix GPS saat akurasi buruk.
    if (haversineMeters(raw, snapped.point) > MAX_SNAP_DIST_M) return;

    const target: TrackedLocation = {
      lat: snapped.point.lat,
      lng: snapped.point.lng,
      accuracy: raw.accuracy,
      speed: raw.speed,
      timestamp: raw.timestamp,
    };
    const from = displayRef.current ?? target;
    tweenRef.current = { from, to: target, startedAt: performance.now() };

    if (rafRef.current != null) return;

    const step = () => {
      const tween = tweenRef.current;
      if (!tween) {
        rafRef.current = null;
        return;
      }
      const t = (performance.now() - tween.startedAt) / TWEEN_MS;
      if (t >= 1) {
        displayRef.current = tween.to;
        setDisplay(tween.to);
        tweenRef.current = null;
        rafRef.current = null;
        return;
      }
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const mid = interpolateLatLng(tween.from, tween.to, eased);
      const next: TrackedLocation = {
        ...mid,
        timestamp: tween.to.timestamp,
        speed: tween.to.speed,
        accuracy: tween.to.accuracy,
      };
      displayRef.current = next;
      setDisplay(next);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, [raw, route, legIndex]);

  // Saat off-route: ambil polyline jalan nyata dari Valhalla (throttled).
  useEffect(() => {
    if (!offRoute) {
      shapeRef.current = null;
      return;
    }
    const attempt = async () => {
      const buf = bufferRef.current;
      if (buf.length < 2) return;
      const now = Date.now();
      if (now - lastMatchAtRef.current < MATCH_COOLDOWN_MS) return;
      lastMatchAtRef.current = now;
      try {
        const shape = await matchShapeToRoad(buf);
        if (shape.length >= 2) shapeRef.current = shape;
      } catch {
        // biarkan shape lama (fallback ke proyeksi leg aktif)
      }
    };
    void attempt();
    const interval = setInterval(() => {
      if (offRouteRef.current) void attempt();
    }, MATCH_COOLDOWN_MS);
    return () => clearInterval(interval);
  }, [offRoute]);

  // Pembersihan rAF saat unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return display;
}

import { decodePolyline } from '../map/polyline';
import type { LatLng } from './types';

const VALHALLA_BASE = 'https://valhalla1.openstreetmap.de';

/**
 * Map-matching Valhalla: snap jejak GPS ke jaringan jalan nyata (trace_route).
 * Dipakai saat kurir di luar rute agar marker mengikuti jalan yang sebenarnya
 * diambil, bukan polyline rencana. Mengembalikan polyline hasil match.
 * Catatan: server public mengembalikan `shape` sebagai encoded polyline (precision 6).
 */
export async function matchShapeToRoad(points: LatLng[]): Promise<LatLng[]> {
  if (points.length < 2) throw new Error('Valhalla: butuh minimal 2 titik');
  const res = await fetch(`${VALHALLA_BASE}/trace_route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      costing: 'auto',
      shape_match: 'map_snap',
      shape: points.map((p) => ({ lat: p.lat, lon: p.lng })),
    }),
  });
  if (!res.ok) throw new Error(`Valhalla trace_route error: ${res.status}`);
  const data = await res.json();
  const shape = data.trip?.legs?.[0]?.shape;
  if (typeof shape === 'string') {
    return decodePolyline(shape, 6).map(([lng, lat]) => ({ lat, lng }));
  }
  if (Array.isArray(shape)) {
    return shape.map((s: number[]) => ({ lat: s[1], lng: s[0] }));
  }
  throw new Error('Valhalla: shape tidak ditemukan di respons');
}

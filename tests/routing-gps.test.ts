import { describe, it, expect } from 'vitest';
import { buildRouteQueryKey, buildOptimizedRouteQueryKey } from '../src/lib/routing/routingService';
import type { LatLng, RouteWaypoint } from '../src/lib/routing/types';

describe('buildOptimizedRouteQueryKey (re-optimize dari posisi GPS kurir)', () => {
  const stops: RouteWaypoint[] = [
    { deliveryId: '10', sequence: 0, lat: -5.145123, lng: 119.422, address: 'A' },
    { deliveryId: '12', sequence: 1, lat: -5.155, lng: 119.43, address: 'B' },
  ];
  const courierPos: LatLng = { lat: -5.140123456, lng: 119.41876543 };

  it('pakai "warehouse" saat depot kosong (rute awal dari gudang)', () => {
    const key = buildOptimizedRouteQueryKey(stops);
    expect(key[0]).toBe('route');
    expect(key[1]).toBe('optimized');
    expect(key[3]).toBe('warehouse');
    expect(key[4]).toBe(0);
  });

  it('menyertakan posisi GPS kurir (dibulatkan 5 desimal) sebagai depot', () => {
    const key = buildOptimizedRouteQueryKey(stops, courierPos);
    expect(key[3]).toBe('-5.14012,119.41877');
  });

  it('depot berbeda (gudang vs GPS) menghasilkan query key berbeda → fetch ulang', () => {
    const fromWarehouse = buildOptimizedRouteQueryKey(stops);
    const fromCourier = buildOptimizedRouteQueryKey(stops, courierPos);
    expect(fromWarehouse).not.toEqual(fromCourier);
  });

  it('forceKey memaksa key berubah walau depot sama (tombol Optimalkan)', () => {
    const a = buildOptimizedRouteQueryKey(stops, courierPos, 0);
    const b = buildOptimizedRouteQueryKey(stops, courierPos, 1);
    expect(a).not.toEqual(b);
    expect(b[4]).toBe(1);
  });

  it('stop hilang karena selesai → key berubah', () => {
    const before = buildOptimizedRouteQueryKey(stops);
    const after = buildOptimizedRouteQueryKey(stops.slice(1));
    expect(before).not.toEqual(after);
  });

  it('buildRouteQueryKey stabil terhadap urutan array tidak bermakna', () => {
    const a = buildRouteQueryKey(stops);
    const b = buildRouteQueryKey([...stops].reverse());
    expect(a).toBe(b);
  });
});

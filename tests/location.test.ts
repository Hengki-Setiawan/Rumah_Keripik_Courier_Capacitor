import { describe, it, expect } from 'vitest';
import { getAccuracyForSpeed, haversineKm, isWithinGeofence } from '@/lib/location';

describe('getAccuracyForSpeed (adaptive tracking)', () => {
  it('uses tight sampling when parked', () => {
    const spec = getAccuracyForSpeed(0);
    expect(spec).toEqual({ intervalMs: 10_000, distanceFilterM: 0, accuracyM: 10, label: 'parked' });
  });

  it('treats null/undefined as parked', () => {
    expect(getAccuracyForSpeed(null).label).toBe('parked');
    expect(getAccuracyForSpeed(undefined).label).toBe('parked');
  });

  it('uses walking spec for slow speeds', () => {
    expect(getAccuracyForSpeed(10)).toEqual({ intervalMs: 15_000, distanceFilterM: 10, accuracyM: 25, label: 'walking' });
  });

  it('uses driving spec for city speeds', () => {
    expect(getAccuracyForSpeed(40)).toEqual({ intervalMs: 30_000, distanceFilterM: 30, accuracyM: 50, label: 'driving' });
  });

  it('uses fast spec for highway speeds', () => {
    expect(getAccuracyForSpeed(80)).toEqual({ intervalMs: 60_000, distanceFilterM: 100, accuracyM: 100, label: 'fast' });
  });
});

describe('haversineKm', () => {
  it('returns ~0 for identical coordinates', () => {
    expect(haversineKm(-5.134, 119.4135, -5.134, 119.4135)).toBeLessThan(0.001);
  });

  it('computes ~1 degree of latitude as ~111 km', () => {
    expect(haversineKm(0, 0, 1, 0)).toBeCloseTo(111.19, 0);
  });

  it('is symmetric', () => {
    const a = haversineKm(-6.2, 106.8, -6.9, 107.6);
    const b = haversineKm(-6.9, 107.6, -6.2, 106.8);
    expect(a).toBeCloseTo(b, 6);
  });
});

describe('isWithinGeofence', () => {
  it('accepts points within radius', () => {
    expect(isWithinGeofence(-5.134, 119.4135, -5.134, 119.4135, 100)).toBe(true);
  });

  it('rejects far points', () => {
    expect(isWithinGeofence(-5.134, 119.4135, -5.14, 119.42, 100)).toBe(false);
  });
});
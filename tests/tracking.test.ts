import { describe, it, expect } from 'vitest';
import { lerp, interpolateLatLng, distanceToSegmentM, distanceToPolylineM, isOffRoute } from '../src/lib/routing/tracking';
import type { RouteLegGeometry } from '../src/lib/routing/types';

describe('lerp', () => {
  it('interpolates linearly', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
  });
});

describe('interpolateLatLng', () => {
  it('clamps t to [0, 1]', () => {
    const from = { lat: 0, lng: 0 };
    const to = { lat: 2, lng: 4 };
    expect(interpolateLatLng(from, to, -1)).toEqual(from);
    expect(interpolateLatLng(from, to, 2)).toEqual(to);
  });
  it('moves halfway at t=0.5', () => {
    const from = { lat: 0, lng: 0 };
    const to = { lat: 10, lng: 20 };
    expect(interpolateLatLng(from, to, 0.5)).toEqual({ lat: 5, lng: 10 });
  });
});

describe('distanceToSegmentM', () => {
  it('returns 0 when point lies exactly on the segment', () => {
    const p = { lat: 5, lng: 5 };
    const a = { lat: 0, lng: 0 };
    const b = { lat: 10, lng: 10 };
    expect(distanceToSegmentM(p, a, b)).toBeLessThan(1);
  });
  it('measures distance to nearest endpoint when projection falls outside', () => {
    // Titik di belakang a: jarak = haversine(p, a) > 0.
    const p = { lat: -5, lng: -5 };
    const a = { lat: 0, lng: 0 };
    const b = { lat: 10, lng: 10 };
    const d = distanceToSegmentM(p, a, b);
    expect(d).toBeGreaterThan(100000);
    expect(d).toBeLessThan(900000); // ~787 km
  });
  it('degenerate segment (a == b) falls back to point distance', () => {
    const p = { lat: 0, lng: 1 };
    const a = { lat: 0, lng: 0 };
    const b = { lat: 0, lng: 0 };
    expect(distanceToSegmentM(p, a, b)).toBeCloseTo(111195, -2);
  });
});

describe('distanceToPolylineM', () => {
  it('returns Infinity for empty line', () => {
    expect(distanceToPolylineM({ lat: 0, lng: 0 }, [])).toBe(Infinity);
  });
  it('single point falls back to point-to-point distance', () => {
    const d = distanceToPolylineM({ lat: 0, lng: 1 }, [[0, 0]]);
    expect(d).toBeCloseTo(111195, -2);
  });
  it('point far off the line measures a large deviation', () => {
    // Garis di sepanjang lng=0 (khatulistiwa), titik di lng=1 => ~111 km.
    const line: [number, number][] = [[0, -1], [0, 1]];
    const d = distanceToPolylineM({ lat: 0, lng: 1 }, line);
    expect(d).toBeGreaterThan(100000);
    expect(d).toBeLessThan(120000);
  });
});

describe('isOffRoute', () => {
  const leg: RouteLegGeometry = {
    coordinates: [[0, -1], [0, 1]], // garis lurus di sepanjang lng=0
    distanceMeters: 222000,
    durationSeconds: 1200,
  };
  const legs = [leg];

  it('returns offRoute=false when position is on the route', () => {
    const history = [
      { lat: 0, lng: 0, timestamp: 0 },
      { lat: 0, lng: 0.0005, timestamp: 20_000 },
    ];
    const r = isOffRoute(legs, 80, 30_000, history);
    expect(r.offRoute).toBe(false);
  });

  it('returns offRoute=false when deviation is small even for a long time', () => {
    const history = [
      { lat: 0, lng: 0.0004, timestamp: 0 },
      { lat: 0, lng: 0.0004, timestamp: 60_000 },
    ];
    const r = isOffRoute(legs, 80, 30_000, history);
    expect(r.offRoute).toBe(false);
    expect(r.deviationM).toBeLessThan(80);
  });

  it('returns offRoute=true only after sustained deviation beyond threshold', () => {
    // ~111 km jauh dari garis -> deviation jauh > 80 m.
    const history = [
      { lat: 0, lng: 1, timestamp: 0 },
      { lat: 0, lng: 1, timestamp: 45_000 },
    ];
    const r = isOffRoute(legs, 80, 30_000, history);
    expect(r.offRoute).toBe(true);
    expect(r.deviationM).toBeGreaterThan(100000);
  });

  it('sustained off-route but shorter than min duration is not flagged yet', () => {
    const history = [
      { lat: 0, lng: 1, timestamp: 0 },
      { lat: 0, lng: 1, timestamp: 15_000 },
    ];
    const r = isOffRoute(legs, 80, 30_000, history);
    expect(r.offRoute).toBe(false);
  });

  it('returns deviation Infinity when no legs have geometry', () => {
    const history = [{ lat: 0, lng: 0, timestamp: 0 }];
    const r = isOffRoute([{ coordinates: [], distanceMeters: 0, durationSeconds: 0 }], 80, 30_000, history);
    expect(r.deviationM).toBe(Infinity);
  });
});

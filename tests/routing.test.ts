import { describe, it, expect } from 'vitest';
import { haversineMeters, buildDistanceMatrix, bearingDegrees } from '../src/lib/routing/distance';
import { nearestNeighborRoute, twoOptImprove, orOptImprove, optimizeStopOrder } from '../src/lib/routing/tsp';
import { decodePolyline } from '../src/lib/map/polyline';
import type { LatLng } from '../src/lib/routing/types';

/** Standar encoder utk menguji round-trip decode (precision 5). */
function encodePolyline(points: [number, number][], precision = 5): string {
  const factor = Math.pow(10, precision);
  let out = '';
  let prevLat = 0;
  let prevLng = 0;
  const enc = (value: number) => {
    let v = value < 0 ? ~(value << 1) : value << 1;
    let chunk: number;
    let s = '';
    do {
      chunk = v & 0x1f;
      v >>= 5;
      if (v > 0) chunk |= 0x20;
      s += String.fromCharCode(chunk + 63);
    } while (v > 0);
    return s;
  };
  for (const [lng, lat] of points) {
    const dLat = Math.round(lat * factor) - prevLat;
    const dLng = Math.round(lng * factor) - prevLng;
    out += enc(dLat) + enc(dLng);
    prevLat = Math.round(lat * factor);
    prevLng = Math.round(lng * factor);
  }
  return out;
}

describe('haversineMeters', () => {
  it('returns ~0 for identical points', () => {
    expect(haversineMeters({ lat: -5.134, lng: 119.4135 }, { lat: -5.134, lng: 119.4135 })).toBeCloseTo(0, 5);
  });
  it('is symmetric', () => {
    const a = { lat: -5.13, lng: 119.41 };
    const b = { lat: -5.15, lng: 119.45 };
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
  });
});

describe('buildDistanceMatrix', () => {
  it('builds a symmetric N x N matrix with zero diagonal', () => {
    const pts: LatLng[] = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 1, lng: 0 },
    ];
    const m = buildDistanceMatrix(pts);
    expect(m).toHaveLength(3);
    expect(m[0][0]).toBe(0);
    expect(m[0][1]).toBeCloseTo(m[1][0], 6);
  });
});

describe('bearingDegrees', () => {
  it('north = 0, east = 90', () => {
    const base = { lat: 0, lng: 0 };
    expect(bearingDegrees(base, { lat: 1, lng: 0 })).toBeCloseTo(0, 0);
    expect(bearingDegrees(base, { lat: 0, lng: 1 })).toBeCloseTo(90, 0);
  });
});

describe('TSP heuristic', () => {
  const depot: LatLng = { lat: -5.134, lng: 119.4135 };
  const stops: LatLng[] = [
    { lat: -5.15, lng: 119.42 },
    { lat: -5.12, lng: 119.40 },
    { lat: -5.16, lng: 119.45 },
    { lat: -5.11, lng: 119.44 },
  ];

  it('nearest neighbor visits every point exactly once starting from depot', () => {
    const res = nearestNeighborRoute([depot, ...stops]);
    expect(res.orderIndices[0]).toBe(0);
    expect(new Set(res.orderIndices).size).toBe(stops.length + 1);
    expect(res.totalDistanceMeters).toBeGreaterThan(0);
  });

  it('optimizeStopOrder returns a valid tour with no duplicates', () => {
    const res = optimizeStopOrder(depot, stops);
    const seen = new Set(res.orderIndices);
    expect(seen.size).toBe(stops.length + 1);
    expect(seen.has(0)).toBe(true);
  });

  it('2-opt does not worsen a small route', () => {
    const pts = [depot, ...stops];
    const dist = buildDistanceMatrix(pts);
    const initial = [0, 1, 2, 3, 4];
    const improved = twoOptImprove(pts, initial, dist);
    const distOf = (ord: number[]) => {
      let d = 0;
      for (let i = 0; i < ord.length - 1; i++) d += dist[ord[i]][ord[i + 1]];
      return d;
    };
    expect(distOf(improved)).toBeLessThanOrEqual(distOf(initial) + 1e-6);
  });

  it('or-opt preserves depot first', () => {
    const pts = [depot, ...stops];
    const dist = buildDistanceMatrix(pts);
    const out = orOptImprove([0, 1, 2, 3, 4], dist);
    expect(out[0]).toBe(0);
  });
});

describe('decodePolyline', () => {
  it('round-trips encoded [lng, lat] coordinates at precision 5', () => {
    const input: [number, number][] = [
      [-5.134, 119.4135],
      [-5.15, 119.42],
      [-5.16, 119.45],
      [-5.11, 119.44],
    ];
    const encoded = encodePolyline(input);
    const decoded = decodePolyline(encoded, 5);
    expect(decoded).toHaveLength(input.length);
    decoded.forEach((pt, i) => {
      expect(pt[0]).toBeCloseTo(input[i][0], 4);
      expect(pt[1]).toBeCloseTo(input[i][1], 4);
    });
  });

  it('returns [lng, lat] order (GeoJSON standard)', () => {
    const encoded = encodePolyline([[119.42, -5.15]]);
    const decoded = decodePolyline(encoded, 5);
    expect(decoded[0][0]).toBeGreaterThan(decoded[0][1]); // lng > lat is a strong sanity cue
  });
});
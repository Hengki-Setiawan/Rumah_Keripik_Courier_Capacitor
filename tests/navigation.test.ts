import { describe, it, expect } from 'vitest';
import {
  snapToRoute,
  indexOfNearestVertex,
  remainingDistanceToEndM,
  findUpcomingStep,
  maneuverToDisplay,
  formatMeters,
} from '../src/lib/routing/navigation';
import { parseOsrmSteps } from '../src/lib/routing/osrmClient';
import { parseOrsSteps } from '../src/lib/routing/orsClient';
import type { RouteLegGeometry } from '../src/lib/routing/types';

// Garis sepanjang lng=0 (khatulistiwa), dari lat -1 ke lat 1 => ~222 km.
const LINE: [number, number][] = [[0, -1], [0, 0], [0, 1]];

describe('snapToRoute', () => {
  it('returns null for empty line', () => {
    expect(snapToRoute({ lat: 0, lng: 0 }, [])).toBeNull();
  });

  it('single vertex falls back to that point', () => {
    const snap = snapToRoute({ lat: 5, lng: 0.5 }, [[0, 5]]);
    expect(snap?.point).toEqual({ lat: 5, lng: 0 });
    expect(snap?.distanceAlongM).toBe(0);
  });

  it('projects a point onto the line and reports distance along', () => {
    const snap = snapToRoute({ lat: 0, lng: 0 }, LINE);
    expect(snap).not.toBeNull();
    expect(snap!.point.lat).toBeCloseTo(0, 6);
    expect(snap!.point.lng).toBeCloseTo(0, 6);
    expect(snap!.distanceAlongM).toBeCloseTo(111195, -2);
  });

  it('snaps an off-line point perpendicularly', () => {
    const snap = snapToRoute({ lat: 0, lng: 0.5 }, LINE);
    expect(snap!.point.lng).toBeCloseTo(0, 4);
    expect(snap!.distanceAlongM).toBeCloseTo(111195, -2);
  });
});

describe('indexOfNearestVertex', () => {
  it('finds the closest vertex index', () => {
    expect(indexOfNearestVertex(LINE, { lat: 0.6, lng: 0 })).toBe(2);
    expect(indexOfNearestVertex(LINE, { lat: -0.4, lng: 0 })).toBe(1);
    expect(indexOfNearestVertex(LINE, { lat: 0.05, lng: 0 })).toBe(1);
  });
});

describe('remainingDistanceToEndM', () => {
  const leg: RouteLegGeometry = { coordinates: LINE, distanceMeters: 222390, durationSeconds: 1200 };

  it('reports distance from position to the end of the leg', () => {
    const remaining = remainingDistanceToEndM(leg, { lat: 0, lng: 0 });
    expect(remaining).toBeCloseTo(111195, -2);
  });

  it('is ~full length at the start', () => {
    const remaining = remainingDistanceToEndM(leg, { lat: -1, lng: 0 });
    expect(remaining).toBeCloseTo(222390, -1);
  });

  it('is ~0 at the end', () => {
    const remaining = remainingDistanceToEndM(leg, { lat: 1, lng: 0 });
    expect(remaining).toBeCloseTo(0, 0);
  });
});

describe('findUpcomingStep', () => {
  const leg: RouteLegGeometry = {
    coordinates: LINE,
    distanceMeters: 222390,
    durationSeconds: 1200,
    steps: [
      { index: 0, instruction: 'Depart', modifier: 'depart', roadName: 'Jl. A', distanceMeters: 0, durationSeconds: 0, location: { lat: -1, lng: 0 } },
      { index: 1, instruction: 'Turn left', modifier: 'left', roadName: 'Jl. B', distanceMeters: 111195, durationSeconds: 600, location: { lat: 0, lng: 0 } },
      { index: 2, instruction: 'Arrive', modifier: 'arrive', roadName: '', distanceMeters: 111195, durationSeconds: 600, location: { lat: 1, lng: 0 } },
    ],
  };

  it('returns the next turn before it is reached', () => {
    const upcoming = findUpcomingStep(leg, { lat: -0.5, lng: 0 });
    expect(upcoming).not.toBeNull();
    expect(upcoming!.step.modifier).toBe('left');
    expect(upcoming!.step.roadName).toBe('Jl. B');
    expect(upcoming!.distanceM).toBeCloseTo(55597, -2);
  });

  it('moves to the next maneuver after passing a turn', () => {
    const upcoming = findUpcomingStep(leg, { lat: 0.5, lng: 0 });
    expect(upcoming!.step.modifier).toBe('arrive');
    expect(upcoming!.distanceM).toBeCloseTo(55597, -2);
  });

  it('returns null when the leg has no steps', () => {
    const noSteps: RouteLegGeometry = { coordinates: LINE, distanceMeters: 222390, durationSeconds: 1200 };
    expect(findUpcomingStep(noSteps, { lat: 0, lng: 0 })).toBeNull();
  });
});

describe('maneuverToDisplay', () => {
  it('maps turns to labels and rotations', () => {
    expect(maneuverToDisplay('left')).toEqual({ label: 'Belok kiri', rotationDeg: -90, vibrate: true });
    expect(maneuverToDisplay('right')).toEqual({ label: 'Belok kanan', rotationDeg: 90, vibrate: true });
    expect(maneuverToDisplay('straight')).toEqual({ label: 'Tetap lurus', rotationDeg: 0, vibrate: false });
    expect(maneuverToDisplay('arrive')).toEqual({ label: 'Tiba di tujuan', rotationDeg: 0, vibrate: true });
  });
});

describe('formatMeters', () => {
  it('formats meters and kilometers', () => {
    expect(formatMeters(300)).toBe('300 m');
    expect(formatMeters(999)).toBe('999 m');
    expect(formatMeters(1200)).toBe('1.2 km');
    expect(formatMeters(0)).toBe('1 m');
  });
});

describe('parseOsrmSteps', () => {
  it('maps OSRM maneuver types/modifiers', () => {
    const steps = [
      { distance: 350, duration: 30, name: 'Jl. A', instruction: 'Depart', maneuver: { type: 'depart', modifier: 'straight', location: [119.41, -5.13] } },
      { distance: 800, duration: 75, name: 'Jl. B', instruction: 'Turn left onto Jl. B', maneuver: { type: 'turn', modifier: 'left', location: [119.42, -5.14] } },
      { distance: 100, duration: 10, name: '', instruction: 'Arrive', maneuver: { type: 'arrive', modifier: 'uturn', location: [119.43, -5.15] } },
    ];
    const parsed = parseOsrmSteps(steps);
    expect(parsed).toHaveLength(3);
    expect(parsed[0].modifier).toBe('depart');
    expect(parsed[0].roadName).toBe('Jl. A');
    expect(parsed[0].location).toEqual({ lat: -5.13, lng: 119.41 });
    expect(parsed[1].modifier).toBe('left');
    expect(parsed[2].modifier).toBe('arrive'); // type 'arrive' menang atas modifier 'uturn'
  });
});

describe('parseOrsSteps', () => {
  it('maps ORS numeric step types', () => {
    const steps = [
      { type: 6, name: 'Jl. A', instruction: 'Continue straight onto Jl. A', distance: 500, maneuver: { location: [119.41, -5.13] } },
      { type: 0, name: 'Jl. B', instruction: 'Turn left onto Jl. B', distance: 700, maneuver: { location: [119.42, -5.14] } },
      { type: 10, name: '-', instruction: 'You have arrived at your destination', distance: 0, maneuver: { location: [119.43, -5.15] } },
    ];
    const parsed = parseOrsSteps(steps);
    expect(parsed[0].modifier).toBe('straight');
    expect(parsed[0].roadName).toBe('Jl. A');
    expect(parsed[1].modifier).toBe('left');
    expect(parsed[2].modifier).toBe('arrive');
    expect(parsed[2].roadName).toBe(''); // '-' dinormalisasi jadi kosong
    expect(parsed[2].location).toEqual({ lat: -5.15, lng: 119.43 });
  });
});

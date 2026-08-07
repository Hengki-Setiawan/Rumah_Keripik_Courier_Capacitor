import type { LatLng } from './types';
import { buildDistanceMatrix } from './distance';

export interface TspResult {
  orderIndices: number[];
  totalDistanceMeters: number;
}

export function nearestNeighborRoute(points: LatLng[]): TspResult {
  const n = points.length;
  if (n <= 1) return { orderIndices: points.map((_, i) => i), totalDistanceMeters: 0 };

  const dist = buildDistanceMatrix(points);
  const visited = new Array(n).fill(false);
  const order = [0];
  visited[0] = true;

  let current = 0;
  let total = 0;
  for (let step = 1; step < n; step++) {
    let nearest = -1;
    let nearestDist = Infinity;
    for (let j = 0; j < n; j++) {
      if (!visited[j] && dist[current][j] < nearestDist) {
        nearest = j;
        nearestDist = dist[current][j];
      }
    }
    order.push(nearest);
    visited[nearest] = true;
    total += nearestDist;
    current = nearest;
  }

  return { orderIndices: order, totalDistanceMeters: total };
}

export function twoOptImprove(
  _points: LatLng[],
  initialOrder: number[],
  distMatrix: number[][],
  maxIterations = 200,
): number[] {
  let order = [...initialOrder];
  const n = order.length;
  if (n < 4) return order;

  const routeDistance = (ord: number[]) => {
    let d = 0;
    for (let i = 0; i < ord.length - 1; i++) d += distMatrix[ord[i]][ord[i + 1]];
    return d;
  };

  let improved = true;
  let iterations = 0;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 1; i < n - 2; i++) {
      for (let k = i + 1; k < n - 1; k++) {
        const before =
          distMatrix[order[i - 1]][order[i]] + distMatrix[order[k]][order[k + 1]];
        const after =
          distMatrix[order[i - 1]][order[k]] + distMatrix[order[i]][order[k + 1]];

        if (after < before - 1e-6) {
          const reversed = order.slice(i, k + 1).reverse();
          order = [...order.slice(0, i), ...reversed, ...order.slice(k + 1)];
          improved = true;
        }
      }
    }
  }

  void routeDistance;
  return order;
}

export function orOptImprove(
  order: number[],
  distMatrix: number[][],
  segmentLengths = [1, 2, 3],
  maxIterations = 100,
): number[] {
  let result = [...order];
  const n = result.length;
  let improved = true;
  let iterations = 0;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (const segLen of segmentLengths) {
      for (let i = 1; i < n - segLen; i++) {
        const segment = result.slice(i, i + segLen);
        const before = result.slice(0, i).concat(result.slice(i + segLen));

        const prevNode = result[i - 1];
        const nextNode = result[i + segLen] ?? null;
        const removedCost =
          distMatrix[prevNode][segment[0]] +
          (nextNode !== null ? distMatrix[segment[segment.length - 1]][nextNode] : 0) -
          (nextNode !== null ? distMatrix[prevNode][nextNode] : 0);

        let bestGain = 0;
        let bestInsertPos = -1;

        for (let j = 1; j < before.length; j++) {
          if (j >= i) continue;
          const a = before[j - 1];
          const b = before[j];
          const insertCost =
            distMatrix[a][segment[0]] + distMatrix[segment[segment.length - 1]][b] - distMatrix[a][b];
          const gain = removedCost - insertCost;
          if (gain > bestGain + 1e-6) {
            bestGain = gain;
            bestInsertPos = j;
          }
        }

        if (bestInsertPos !== -1) {
          const newOrder = [
            ...before.slice(0, bestInsertPos),
            ...segment,
            ...before.slice(bestInsertPos),
          ];
          result = newOrder;
          improved = true;
        }
      }
    }
  }

  return result;
}

export function optimizeStopOrder(depot: LatLng, stops: LatLng[]): TspResult {
  const points = [depot, ...stops];
  const distMatrix = buildDistanceMatrix(points);

  const constructed = nearestNeighborRoute(points);
  const afterTwoOpt = twoOptImprove(points, constructed.orderIndices, distMatrix);
  const afterOrOpt = orOptImprove(afterTwoOpt, distMatrix);

  let total = 0;
  for (let i = 0; i < afterOrOpt.length - 1; i++) {
    total += distMatrix[afterOrOpt[i]][afterOrOpt[i + 1]];
  }

  return { orderIndices: afterOrOpt, totalDistanceMeters: total };
}
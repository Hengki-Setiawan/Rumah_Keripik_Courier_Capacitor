import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { RouteWaypoint } from '@/lib/types';

interface Props {
  waypoints: RouteWaypoint[];
}

const WAREHOUSE: [number, number] = [-5.134, 119.4135];

const ROUTE_LAYER_ID = 'route-polyline';
const ROUTE_SOURCE_ID = 'route-line';

/**
 * Peta rute berbasis MapLibre GL JS (OpenStreetMap raster tiles).
 * Tanpa API key, tanpa plugin native — berjalan di WebView Capacitor & browser.
 */
export default function NativeRouteMap({ waypoints }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const waypointsRef = useRef<RouteWaypoint[]>(waypoints);

  useEffect(() => {
    waypointsRef.current = waypoints;
  }, [waypoints]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      center: WAREHOUSE,
      zoom: 12,
      attributionControl: false,
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    mapRef.current = map;

    map.on('load', () => {
      map.addSource('osm', {
        type: 'raster',
        tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      });
      map.addLayer({ id: 'osm', type: 'raster', source: 'osm' });

      addSourceLayer(map, waypointsRef.current);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    waypointsRef.current = waypoints;
    if (map.isStyleLoaded()) addSourceLayer(map, waypoints);
  }, [waypoints]);

  return (
    <div
      ref={containerRef}
      className="relative z-0 h-64 w-full overflow-hidden rounded-2xl border border-umber-800"
    />
  );
}

function addSourceLayer(map: maplibregl.Map, rawWaypoints: RouteWaypoint[]) {
  const points = rawWaypoints
    .filter((w) => w.lat !== 0 && w.lng !== 0)
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

  removeLayerSafe(map, ROUTE_LAYER_ID);
  removeLayerSafe(map, ROUTE_SOURCE_ID);

  map.addSource(ROUTE_SOURCE_ID, {
    type: 'geojson',
    data: buildFeature(points),
  });
  map.addLayer({
    id: ROUTE_LAYER_ID,
    type: 'line',
    source: ROUTE_SOURCE_ID,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': '#D97706',
      'line-width': 4,
      'line-opacity': 0.85,
    },
  });

  addPointLayers(map, points);

  const coords = [WAREHOUSE, ...points.map((w): [number, number] => [w.lng, w.lat])];
  const b = coords.reduce((bb, c) => bb.extend(c), new maplibregl.LngLatBounds(WAREHOUSE, WAREHOUSE));
  map.fitBounds(b, { padding: 40, animate: false, maxZoom: 15 });
}

type GeoJsonFeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: Record<string, unknown>;
    geometry: { type: 'LineString'; coordinates: Array<[number, number]> };
  }>;
};

function buildFeature(points: RouteWaypoint[]): GeoJsonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [WAREHOUSE, ...points.map((p): [number, number] => [p.lng, p.lat])],
        },
      },
    ],
  };
}

function addPointLayers(map: maplibregl.Map, points: RouteWaypoint[]) {
  // hapus sisa layer lama
  let i = 1;
  for (;;) {
    const id = `route-marker-circle-${i}`;
    if (!map.getLayer(id)) break;
    removeLayerSafe(map, id);
    i++;
  }

  points.forEach((p, idx) => {
    const circleId = `route-marker-circle-${idx + 1}`;
    const labelId = `route-marker-label-${idx + 1}`;
    removeLayerSafe(map, circleId);
    removeLayerSafe(map, labelId);

    const sourceId = `route-point-${idx + 1}`;
    map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      },
    });
    map.addLayer({
      id: circleId,
      type: 'circle',
      source: sourceId,
      paint: {
        'circle-radius': 12,
        'circle-color': '#D97706',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });
    map.addLayer({
      id: labelId,
      type: 'symbol',
      source: sourceId,
      layout: {
        'text-field': String(idx + 1),
        'text-size': 11,
        'text-anchor': 'center',
      },
      paint: {
        'text-color': '#120f0d',
        'text-halo-color': '#ffffff',
        'text-halo-width': 0,
      },
    });
  });
}

function removeLayerSafe(map: maplibregl.Map, id: string) {
  try {
    if (map.getLayer(id)) map.removeLayer(id);
    if (map.getSource(id)) map.removeSource(id);
  } catch {
    /* ignore */
  }
}
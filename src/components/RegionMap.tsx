import { useEffect, useRef } from 'react';
import maplibregl, { type Map as MapLibreMap, type MapMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { RegionGeoJson } from '@/lib/data';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';
const NZ_BOUNDS: [number, number, number, number] = [165.5, -47.6, 179.5, -34.0];

/** Sequential amber ramp on the dark theme; darkest is cheapest. */
const RAMP = ['#452c0a', '#78450d', '#a95f0c', '#d97b06', '#f59e0b', '#fbbf24'];

export interface ChoroplethValues {
  /** slug -> value used for colour. Regions absent get a neutral fill. */
  values: ReadonlyMap<string, number>;
}

interface RegionMapProps {
  boundaries: RegionGeoJson;
  values: ReadonlyMap<string, number>;
  selected: string | undefined;
  onSelect: (slug: string) => void;
}

function quantileBreaks(values: ReadonlyMap<string, number>): number[] {
  const sorted = [...values.values()].sort((a, b) => a - b);
  if (sorted.length === 0) {
    return [];
  }
  const breaks: number[] = [];
  for (let i = 1; i < RAMP.length; i++) {
    const q = sorted[Math.min(sorted.length - 1, Math.floor((i / RAMP.length) * sorted.length))];
    if (q !== undefined) {
      breaks.push(q);
    }
  }
  return [...new Set(breaks)];
}

function fillColourExpression(values: ReadonlyMap<string, number>): unknown {
  const breaks = quantileBreaks(values);
  if (breaks.length === 0) {
    return '#27272a';
  }
  const match: unknown[] = ['match', ['get', 'slug']];
  for (const [slug, value] of values) {
    let colour = RAMP[0];
    for (let i = 0; i < breaks.length; i++) {
      const b = breaks[i];
      if (b !== undefined && value >= b) {
        colour = RAMP[i + 1] ?? colour;
      }
    }
    match.push(slug, colour);
  }
  match.push('#27272a');
  return match;
}

export function RegionMap({ boundaries, values, selected, onSelect }: RegionMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      bounds: NZ_BOUNDS,
      fitBoundsOptions: { padding: 24 },
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    if (import.meta.env.DEV) {
      Reflect.set(window, '__map', map);
    }

    // style.load fires once the style is parsed; unlike the full load
    // event it does not wait for every basemap tile, so region layers
    // appear even when a tile host is slow.
    map.on('style.load', () => {
      map.addSource('regions', { type: 'geojson', data: boundaries as GeoJSON.GeoJSON });
      map.addLayer({
        id: 'region-fill',
        type: 'fill',
        source: 'regions',
        paint: {
          'fill-color': '#27272a',
          'fill-opacity': 0.72,
        },
      });
      map.addLayer({
        id: 'region-line',
        type: 'line',
        source: 'regions',
        paint: {
          'line-color': '#0a0a0b',
          'line-width': 1,
        },
      });
      map.addLayer({
        id: 'region-selected',
        type: 'line',
        source: 'regions',
        paint: {
          'line-color': '#fafafa',
          'line-width': 2,
        },
        filter: ['==', ['get', 'slug'], ''],
      });
      loadedRef.current = true;
      map.setPaintProperty('region-fill', 'fill-color', fillColourExpression(values));
    });

    const clickHandler = (event: MapMouseEvent) => {
      const feature = map.queryRenderedFeatures(event.point, { layers: ['region-fill'] })[0];
      const slug = feature?.properties.slug as string | undefined;
      if (slug) {
        onSelect(slug);
      }
    };
    map.on('click', clickHandler);
    map.on('mousemove', (event: MapMouseEvent) => {
      const hit = map.queryRenderedFeatures(event.point, { layers: ['region-fill'] }).length > 0;
      map.getCanvas().style.cursor = hit ? 'pointer' : '';
    });

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      loadedRef.current = false;
      map.remove();
      mapRef.current = null;
    };
    // The map instance is created once; data updates flow through the
    // effects below instead of re-creating the map.
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) {
      return;
    }
    map.setPaintProperty('region-fill', 'fill-color', fillColourExpression(values));
  }, [values]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) {
      return;
    }
    map.setFilter('region-selected', ['==', ['get', 'slug'], selected ?? '']);
  }, [selected]);

  return <div ref={containerRef} className="h-full w-full" aria-label="Map of NZ regions" />;
}

import { useEffect, useState } from 'react';
import type { HousingData, MonthPoint, RegionSeries } from '../../pipeline/lib/types.ts';

export type { HousingData, MonthPoint, RegionSeries };

export interface RegionGeoJson {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    properties: { slug: string; name: string };
    geometry: GeoJSON.Geometry;
  }[];
}

interface Loaded {
  housing: HousingData;
  boundaries: RegionGeoJson;
}

export function useHousingData(): { data?: Loaded; error?: string } {
  const [state, setState] = useState<{ data?: Loaded; error?: string }>({});

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const [housingRes, boundariesRes] = await Promise.all([
          fetch('/data/housing.json', { signal: controller.signal }),
          fetch('/data/regions.geojson', { signal: controller.signal }),
        ]);
        if (!housingRes.ok || !boundariesRes.ok) {
          throw new Error('data files failed to load');
        }
        const housing = (await housingRes.json()) as HousingData;
        const boundaries = (await boundariesRes.json()) as RegionGeoJson;
        setState({ data: { housing, boundaries } });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        setState({ error: error instanceof Error ? error.message : 'failed to load data' });
      }
    })();
    return () => {
      controller.abort();
    };
  }, []);

  return state;
}

/** Latest point at or before the given month that has the field. */
export function latestValue(
  series: RegionSeries,
  field: keyof MonthPoint,
  upToMonth?: string,
): { month: string; value: number } | undefined {
  for (let i = series.points.length - 1; i >= 0; i--) {
    const point = series.points[i];
    if (!point) {
      continue;
    }
    if (upToMonth && point.month > upToMonth) {
      continue;
    }
    const value = point[field];
    if (typeof value === 'number') {
      return { month: point.month, value };
    }
  }
  return undefined;
}

const nzd = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  maximumFractionDigits: 0,
});

export function formatNzd(value: number): string {
  return nzd.format(value);
}

export function formatMonth(month: string): string {
  const [year, m] = month.split('-');
  const date = new Date(Number(year), Number(m) - 1);
  return date.toLocaleDateString('en-NZ', { month: 'short', year: 'numeric' });
}

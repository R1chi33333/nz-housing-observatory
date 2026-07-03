/**
 * Graceful degradation for the rent source. catalogue.data.govt.nz
 * blocks datacenter IP ranges (GitHub Actions included) behind an
 * Imperva challenge, so scheduled refreshes cannot always reach it.
 * When that happens the pipeline reuses the rent series already
 * committed in housing.json and refreshes only the sales data.
 * Local runs, which are not blocked, refresh both. See SOURCES.md.
 */

import type { HousingData, MonthPoint } from './types.ts';

const RENT_FIELDS = [
  'medianRent',
  'rentLowerQuartile',
  'rentUpperQuartile',
  'lodgedBonds',
] as const;

/** Pull only the rent observations back out of a previous output. */
export function extractRentSeries(data: HousingData): Map<string, MonthPoint[]> {
  const result = new Map<string, MonthPoint[]>();
  for (const series of [data.national, ...data.regions]) {
    const points: MonthPoint[] = [];
    for (const point of series.points) {
      const rentOnly: MonthPoint = { month: point.month };
      let hasRentData = false;
      for (const field of RENT_FIELDS) {
        const value = point[field];
        if (value !== undefined) {
          rentOnly[field] = value;
          hasRentData = true;
        }
      }
      if (hasRentData) {
        points.push(rentOnly);
      }
    }
    if (points.length > 0) {
      result.set(series.slug, points);
    }
  }
  return result;
}

import { NATIONAL_SLUG, REGIONS } from './regions.ts';
import type { HousingData, MonthPoint, RegionSeries } from './types.ts';

/** Merge rent and sales series month-by-month for one region. */
export function mergeSeries(
  rents: readonly MonthPoint[] | undefined,
  sales: readonly MonthPoint[] | undefined,
): MonthPoint[] {
  const byMonth = new Map<string, MonthPoint>();
  for (const source of [rents ?? [], sales ?? []]) {
    for (const point of source) {
      byMonth.set(point.month, { ...byMonth.get(point.month), ...point });
    }
  }
  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
}

/** Assemble the full output document. */
export function buildHousingData(
  rents: ReadonlyMap<string, MonthPoint[]>,
  sales: ReadonlyMap<string, MonthPoint[]>,
  generatedAt: string,
): HousingData {
  const regions: RegionSeries[] = REGIONS.map((region) => ({
    slug: region.slug,
    name: region.name,
    points: mergeSeries(rents.get(region.slug), sales.get(region.slug)),
  }));

  return {
    national: {
      slug: NATIONAL_SLUG,
      name: 'New Zealand',
      points: mergeSeries(rents.get(NATIONAL_SLUG), sales.get(NATIONAL_SLUG)),
    },
    regions,
    meta: {
      generatedAt,
      sources: [
        {
          name: 'MBIE Tenancy Services rental bond data',
          url: 'https://catalogue.data.govt.nz/dataset/rental-bond-data-by-region',
          licence: 'CC BY, credit Ministry of Business, Innovation and Employment',
          measures: 'median weekly rent, rent quartiles, lodged bonds',
        },
        {
          name: 'HUD property and sales statistics',
          url: 'https://www.hud.govt.nz/stats-and-insights/property-and-sales-statistics/about-the-dashboard',
          licence:
            'Open government data, credit Te Tuapapa Kura Kainga - Ministry of Housing and Urban Development',
          measures: 'median sale price and quartiles, residential sales (3-month rolling)',
        },
      ],
    },
  };
}

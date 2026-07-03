import { describe, expect, it } from 'vitest';
import { extractRentSeries } from '../pipeline/lib/fallback.ts';
import { buildHousingData } from '../pipeline/lib/merge.ts';

describe('extractRentSeries', () => {
  it('recovers rent-only series from a previous output', () => {
    const rents = new Map([
      [
        'auckland',
        [{ month: '2026-04', medianRent: 650, rentLowerQuartile: 560, lodgedBonds: 3100 }],
      ],
      ['new-zealand', [{ month: '2026-04', medianRent: 560 }]],
    ]);
    const sales = new Map([
      ['auckland', [{ month: '2026-04', medianSalePrice: 1010000, residentialSales: 2100 }]],
    ]);
    const previous = buildHousingData(rents, sales, '2026-06-05T00:00:00.000Z');

    const recovered = extractRentSeries(previous);

    expect(recovered.get('auckland')).toEqual([
      { month: '2026-04', medianRent: 650, rentLowerQuartile: 560, lodgedBonds: 3100 },
    ]);
    expect(recovered.get('new-zealand')).toEqual([{ month: '2026-04', medianRent: 560 }]);
  });

  it('drops months and regions that carried no rent data', () => {
    const sales = new Map([['auckland', [{ month: '2026-04', medianSalePrice: 1010000 }]]]);
    const previous = buildHousingData(new Map(), sales, '2026-06-05T00:00:00.000Z');

    const recovered = extractRentSeries(previous);

    expect(recovered.size).toBe(0);
  });

  it('round-trips: merging recovered rents with fresh sales rebuilds the same rent view', () => {
    const rents = new Map([['wellington', [{ month: '2026-03', medianRent: 600 }]]]);
    const previous = buildHousingData(rents, new Map(), '2026-06-05T00:00:00.000Z');

    const freshSales = new Map([['wellington', [{ month: '2026-04', medianSalePrice: 850000 }]]]);
    const rebuilt = buildHousingData(extractRentSeries(previous), freshSales, 'x');

    const wellington = rebuilt.regions.find((r) => r.slug === 'wellington');
    expect(wellington?.points).toEqual([
      { month: '2026-03', medianRent: 600 },
      { month: '2026-04', medianSalePrice: 850000 },
    ]);
  });
});

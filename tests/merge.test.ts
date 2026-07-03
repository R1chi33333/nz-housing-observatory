import { describe, expect, it } from 'vitest';
import { buildHousingData, mergeSeries } from '../pipeline/lib/merge.ts';

describe('mergeSeries', () => {
  it('merges rent and sales points by month', () => {
    const merged = mergeSeries(
      [{ month: '2026-04', medianRent: 650 }],
      [
        { month: '2026-04', medianSalePrice: 1000000 },
        { month: '2026-05', medianSalePrice: 990000 },
      ],
    );

    expect(merged).toEqual([
      { month: '2026-04', medianRent: 650, medianSalePrice: 1000000 },
      { month: '2026-05', medianSalePrice: 990000 },
    ]);
  });

  it('handles missing inputs', () => {
    expect(mergeSeries(undefined, undefined)).toEqual([]);
    expect(mergeSeries([{ month: '2026-01', medianRent: 500 }], undefined)).toHaveLength(1);
  });
});

describe('buildHousingData', () => {
  it('emits every canonical region plus the national series and meta', () => {
    const rents = new Map([
      ['auckland', [{ month: '2026-05', medianRent: 650 }]],
      ['new-zealand', [{ month: '2026-05', medianRent: 560 }]],
    ]);
    const sales = new Map([['auckland', [{ month: '2026-05', medianSalePrice: 1010000 }]]]);

    const data = buildHousingData(rents, sales, '2026-07-03T00:00:00.000Z');

    expect(data.regions).toHaveLength(16);
    const auckland = data.regions.find((r) => r.slug === 'auckland');
    expect(auckland?.points[0]).toEqual({
      month: '2026-05',
      medianRent: 650,
      medianSalePrice: 1010000,
    });
    expect(data.national.points[0]?.medianRent).toBe(560);
    expect(data.meta.generatedAt).toBe('2026-07-03T00:00:00.000Z');
    expect(data.meta.sources).toHaveLength(2);
    const westCoast = data.regions.find((r) => r.slug === 'west-coast');
    expect(westCoast?.points).toEqual([]);
  });
});

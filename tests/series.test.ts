import { describe, expect, it } from 'vitest';
import { compactNzd, toChartPoints, yearOnYear } from '../src/lib/series.ts';

describe('toChartPoints', () => {
  it('extracts a field and skips months without it', () => {
    const points = toChartPoints(
      {
        slug: 'auckland',
        name: 'Auckland',
        points: [
          { month: '2026-01', medianRent: 640 },
          { month: '2026-02' },
          { month: '2026-03', medianRent: 660, medianSalePrice: 1000000 },
        ],
      },
      'medianRent',
    );
    expect(points).toEqual([
      { month: '2026-01', value: 640 },
      { month: '2026-03', value: 660 },
    ]);
  });
});

describe('yearOnYear', () => {
  it('compares against the same month a year earlier', () => {
    const result = yearOnYear([
      { month: '2025-03', value: 100 },
      { month: '2025-06', value: 105 },
      { month: '2026-03', value: 112 },
    ]);
    expect(result?.previous.month).toBe('2025-03');
    expect(result?.change).toBeCloseTo(0.12);
  });

  it('returns undefined when the earlier month is missing or empty', () => {
    expect(yearOnYear([{ month: '2026-03', value: 100 }])).toBeUndefined();
    expect(yearOnYear([])).toBeUndefined();
  });
});

describe('compactNzd', () => {
  it('formats across magnitudes', () => {
    expect(compactNzd(1_234_000)).toBe('$1.2m');
    expect(compactNzd(845_000)).toBe('$845k');
    expect(compactNzd(620)).toBe('$620');
  });
});

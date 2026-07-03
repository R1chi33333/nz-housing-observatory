import type { MonthPoint, RegionSeries } from '../../pipeline/lib/types.ts';

export interface ChartPoint {
  month: string;
  value: number;
}

/** Extract one numeric field as chart points, skipping gaps. */
export function toChartPoints(series: RegionSeries, field: keyof MonthPoint): ChartPoint[] {
  const points: ChartPoint[] = [];
  for (const point of series.points) {
    const value = point[field];
    if (typeof value === 'number') {
      points.push({ month: point.month, value });
    }
  }
  return points;
}

export interface YearOnYear {
  latest: ChartPoint;
  previous: ChartPoint;
  /** Fractional change, e.g. 0.052 for +5.2 percent. */
  change: number;
}

/** Latest value against the same month a year earlier, when both exist. */
export function yearOnYear(points: readonly ChartPoint[]): YearOnYear | undefined {
  const latest = points.at(-1);
  if (!latest) {
    return undefined;
  }
  const [year, month] = latest.month.split('-');
  const targetMonth = `${String(Number(year) - 1)}-${month ?? ''}`;
  const previous = points.find((p) => p.month === targetMonth);
  if (!previous || previous.value === 0) {
    return undefined;
  }
  return { latest, previous, change: (latest.value - previous.value) / previous.value };
}

/** "$1.2m" / "$845k" / "$620" style compact NZD labels for axes. */
export function compactNzd(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}m`;
  }
  if (Math.abs(value) >= 10_000) {
    return `$${String(Math.round(value / 1000))}k`;
  }
  return `$${String(Math.round(value))}`;
}

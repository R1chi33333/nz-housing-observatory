import { Line, LineChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMonth, formatNzd } from '@/lib/data';
import { compactNzd, type ChartPoint } from '@/lib/series';

/** Amber plus neutrals: distinguishable without leaving the palette. */
export const SERIES_COLOURS = ['#f59e0b', '#fafafa', '#818cf8'];

export interface CompareSeries {
  slug: string;
  name: string;
  points: ChartPoint[];
}

interface CompareChartProps {
  title: string;
  series: CompareSeries[];
  sourceName: string;
}

/** Merge per-region points into Recharts rows keyed by month. */
function mergeRows(series: CompareSeries[]): Record<string, number | string>[] {
  const byMonth = new Map<string, Record<string, number | string>>();
  for (const s of series) {
    for (const point of s.points) {
      const row = byMonth.get(point.month) ?? { month: point.month };
      row[s.slug] = point.value;
      byMonth.set(point.month, row);
    }
  }
  return [...byMonth.values()].sort((a, b) => String(a.month).localeCompare(String(b.month)));
}

export function CompareChart({ title, series, sourceName }: CompareChartProps) {
  const rows = mergeRows(series);
  const nameBySlug = new Map(series.map((s) => [s.slug, s.name]));
  const lastMonth = rows.at(-1)?.month;

  if (rows.length === 0) {
    return (
      <section className="rounded-md border border-border bg-surface-1 p-4">
        <h2 className="text-xs text-fg-muted">{title}</h2>
        <p className="mt-2 text-sm text-fg-muted">No data for these regions.</p>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-border bg-surface-1 p-4">
      <h2 className="text-xs text-fg-muted">{title}</h2>
      <div className="mt-3 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="month"
              tick={{ fill: '#a1a1aa', fontSize: 10 }}
              tickFormatter={(month: string) => month.slice(0, 4)}
              minTickGap={40}
              axisLine={{ stroke: '#27272a' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#a1a1aa', fontSize: 10 }}
              tickFormatter={compactNzd}
              width={44}
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                background: '#18181b',
                border: '1px solid #27272a',
                borderRadius: 6,
                fontSize: 12,
              }}
              labelStyle={{ color: '#a1a1aa' }}
              labelFormatter={(month) => formatMonth(String(month))}
              formatter={(value, key) => [
                formatNzd(Number(value)),
                nameBySlug.get(String(key)) ?? String(key),
              ]}
            />
            <Legend
              formatter={(value: string) => (
                <span style={{ color: '#a1a1aa', fontSize: 11 }}>
                  {nameBySlug.get(value) ?? value}
                </span>
              )}
              iconSize={8}
            />
            {series.map((s, i) => (
              <Line
                key={s.slug}
                type="monotone"
                dataKey={s.slug}
                stroke={SERIES_COLOURS[i % SERIES_COLOURS.length]}
                strokeWidth={1.5}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-right text-[10px] leading-tight text-fg-muted">
        {sourceName} · updated {lastMonth ? formatMonth(String(lastMonth)) : ''}
      </p>
    </section>
  );
}

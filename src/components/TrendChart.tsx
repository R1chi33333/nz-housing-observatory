import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMonth, formatNzd } from '@/lib/data';
import { compactNzd, yearOnYear, type ChartPoint } from '@/lib/series';

interface TrendChartProps {
  title: string;
  points: ChartPoint[];
  colour: string;
  /** e.g. "HUD property sales statistics" */
  sourceName: string;
  formatValue?: (value: number) => string;
}

function YoyBadge({ points }: { points: ChartPoint[] }) {
  const yoy = yearOnYear(points);
  if (!yoy) {
    return null;
  }
  const pct = (yoy.change * 100).toFixed(1);
  return (
    <span
      className={`font-mono text-xs ${yoy.change >= 0 ? 'text-accent-soft' : 'text-fg-muted'}`}
      title={`versus ${formatMonth(yoy.previous.month)}`}
    >
      {yoy.change >= 0 ? '+' : ''}
      {pct}% y/y
    </span>
  );
}

export function TrendChart({
  title,
  points,
  colour,
  sourceName,
  formatValue = formatNzd,
}: TrendChartProps) {
  const latest = points.at(-1);

  if (points.length === 0) {
    return (
      <section className="rounded-md border border-border bg-surface-1 p-4">
        <h2 className="text-xs text-fg-muted">{title}</h2>
        <p className="mt-2 text-sm text-fg-muted">No data for this region.</p>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-border bg-surface-1 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs text-fg-muted">{title}</h2>
        <YoyBadge points={points} />
      </div>
      {latest && (
        <p className="mt-1 font-mono text-xl font-semibold">{formatValue(latest.value)}</p>
      )}
      <div className="mt-3 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
              itemStyle={{ color: '#fafafa' }}
              labelFormatter={(month) => formatMonth(String(month))}
              formatter={(value) => [formatValue(Number(value)), title]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={colour}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-right text-[10px] leading-tight text-fg-muted">
        {sourceName} · updated {latest ? formatMonth(latest.month) : ''}
      </p>
    </section>
  );
}

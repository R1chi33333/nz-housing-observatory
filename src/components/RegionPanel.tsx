import { X } from 'lucide-react';
import { CompareChart, SERIES_COLOURS, type CompareSeries } from '@/components/CompareChart';
import { TrendChart } from '@/components/TrendChart';
import type { RegionSeries } from '@/lib/data';
import { toChartPoints } from '@/lib/series';

interface RegionPanelProps {
  selection: string[];
  panelSeries: RegionSeries[];
  onToggle: (slug: string) => void;
  nameFor: (slug: string) => string;
}

/** Chips plus charts for the current selection; shared by the desktop
 * side panel and the mobile layout. */
export function RegionPanel({ selection, panelSeries, onToggle, nameFor }: RegionPanelProps) {
  const priceCompare: CompareSeries[] = panelSeries.map((series) => ({
    slug: series.slug,
    name: series.name,
    points: toChartPoints(series, 'medianSalePrice'),
  }));
  const rentCompare: CompareSeries[] = panelSeries.map((series) => ({
    slug: series.slug,
    name: series.name,
    points: toChartPoints(series, 'medianRent'),
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {selection.length === 0 ? (
          <h1 className="text-lg font-semibold">New Zealand</h1>
        ) : (
          selection.map((slug, i) => (
            <button
              key={slug}
              type="button"
              onClick={() => {
                onToggle(slug);
              }}
              className="flex items-center gap-1.5 rounded-md border border-border bg-surface-1 px-2.5 py-1 text-sm transition-colors hover:bg-surface-2"
            >
              <span
                className="size-2 rounded-full"
                style={{ background: SERIES_COLOURS[i % SERIES_COLOURS.length] }}
              />
              {nameFor(slug)}
              <X className="size-3 text-fg-muted" strokeWidth={2} />
            </button>
          ))
        )}
      </div>

      {panelSeries.length === 1 && panelSeries[0] ? (
        <>
          <TrendChart
            title="Median sale price"
            points={toChartPoints(panelSeries[0], 'medianSalePrice')}
            colour="#f59e0b"
            sourceName="HUD property sales statistics"
          />
          <TrendChart
            title="Median weekly rent"
            points={toChartPoints(panelSeries[0], 'medianRent')}
            colour="#fbbf24"
            sourceName="MBIE Tenancy Services bond data"
          />
        </>
      ) : (
        <>
          <CompareChart
            title="Median sale price"
            series={priceCompare}
            sourceName="HUD property sales statistics"
          />
          <CompareChart
            title="Median weekly rent"
            series={rentCompare}
            sourceName="MBIE Tenancy Services bond data"
          />
        </>
      )}
    </div>
  );
}

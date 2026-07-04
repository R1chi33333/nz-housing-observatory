import { useMemo, useState } from 'react';
import { Map as MapIcon, X } from 'lucide-react';
import { CompareChart, SERIES_COLOURS, type CompareSeries } from '@/components/CompareChart';
import { RegionMap } from '@/components/RegionMap';
import { TimeSlider } from '@/components/TimeSlider';
import { TrendChart } from '@/components/TrendChart';
import { formatMonth, latestValue, useHousingData, type RegionSeries } from '@/lib/data';
import { toChartPoints } from '@/lib/series';

const NATIONAL = 'new-zealand';
const MAX_COMPARE = 3;

export default function App() {
  const { data, error } = useHousingData();
  const [selection, setSelection] = useState<string[]>([]);
  const [monthIndex, setMonthIndex] = useState<number | undefined>(undefined);

  const months = useMemo(
    () =>
      data
        ? data.housing.national.points
            .filter((point) => point.medianSalePrice !== undefined)
            .map((point) => point.month)
        : [],
    [data],
  );
  const activeIndex = monthIndex ?? Math.max(0, months.length - 1);
  const activeMonth = months[activeIndex];

  const priceValues = useMemo(() => {
    const values = new Map<string, number>();
    if (data) {
      for (const region of data.housing.regions) {
        const latest = latestValue(region, 'medianSalePrice', activeMonth);
        if (latest) {
          values.set(region.slug, latest.value);
        }
      }
    }
    return values;
  }, [data, activeMonth]);

  function toggleRegion(slug: string): void {
    setSelection((current) => {
      if (current.includes(slug)) {
        return current.filter((s) => s !== slug);
      }
      if (current.length >= MAX_COMPARE) {
        return [...current.slice(0, MAX_COMPARE - 1), slug];
      }
      return [...current, slug];
    });
  }

  const findSeries = (slug: string): RegionSeries | undefined =>
    slug === NATIONAL
      ? data?.housing.national
      : data?.housing.regions.find((region) => region.slug === slug);

  const selectedSeries = selection
    .map(findSeries)
    .filter((series): series is RegionSeries => series !== undefined);
  const panelSeries =
    selectedSeries.length > 0 ? selectedSeries : data ? [data.housing.national] : [];

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
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <MapIcon className="size-5 text-accent" strokeWidth={1.5} />
          <span className="text-sm font-semibold">NZ Housing Observatory</span>
        </div>
        <a
          href="https://github.com/R1chi33333/nz-housing-observatory"
          className="text-sm text-fg-muted transition-colors hover:text-fg"
        >
          GitHub
        </a>
      </header>

      <main className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          {data ? (
            <RegionMap
              boundaries={data.boundaries}
              values={priceValues}
              selected={selection}
              onSelect={toggleRegion}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-fg-muted">
              {error ? `Could not load data: ${error}` : 'Loading data...'}
            </div>
          )}
          {data && (
            <div className="absolute inset-x-4 bottom-6 flex flex-wrap items-end justify-between gap-3">
              <div className="max-w-sm rounded-md border border-border bg-surface-1/90 px-3 py-2 text-xs text-fg-muted backdrop-blur">
                Median sale price{activeMonth ? ` in ${formatMonth(activeMonth)}` : ''}, 3-month
                rolling. Darker is cheaper, shading is relative within the month. Click up to{' '}
                {MAX_COMPARE} regions to compare.
              </div>
              <TimeSlider months={months} index={activeIndex} onChange={setMonthIndex} />
            </div>
          )}
        </div>

        <aside className="w-96 shrink-0 overflow-y-auto border-l border-border p-5 max-lg:hidden">
          {data ? (
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
                        toggleRegion(slug);
                      }}
                      className="flex items-center gap-1.5 rounded-md border border-border bg-surface-1 px-2.5 py-1 text-sm transition-colors hover:bg-surface-2"
                    >
                      <span
                        className="size-2 rounded-full"
                        style={{ background: SERIES_COLOURS[i % SERIES_COLOURS.length] }}
                      />
                      {findSeries(slug)?.name ?? slug}
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
          ) : (
            <div className="flex h-full items-center justify-center text-center text-sm text-fg-muted">
              Loading...
            </div>
          )}
        </aside>
      </main>

      <footer className="border-t border-border px-4 py-2 text-xs text-fg-muted">
        Data: MBIE Tenancy Services and HUD (open data).
        {data && ` Pipeline last ran ${formatMonth(data.housing.meta.generatedAt.slice(0, 7))}.`}
      </footer>
    </div>
  );
}

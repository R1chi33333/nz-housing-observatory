import { useMemo, useState } from 'react';
import { Map as MapIcon } from 'lucide-react';
import { RegionMap } from '@/components/RegionMap';
import { TimeSlider } from '@/components/TimeSlider';
import { TrendChart } from '@/components/TrendChart';
import { formatMonth, latestValue, useHousingData, type RegionSeries } from '@/lib/data';
import { toChartPoints } from '@/lib/series';

const NATIONAL = 'new-zealand';

export default function App() {
  const { data, error } = useHousingData();
  const [selected, setSelected] = useState<string>(NATIONAL);
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

  const series: RegionSeries | undefined =
    selected === NATIONAL
      ? data?.housing.national
      : data?.housing.regions.find((region) => region.slug === selected);

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
              selected={selected === NATIONAL ? undefined : selected}
              onSelect={setSelected}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-fg-muted">
              {error ? `Could not load data: ${error}` : 'Loading data...'}
            </div>
          )}
          {data && (
            <div className="absolute inset-x-4 bottom-6 flex flex-wrap items-end justify-between gap-3">
              <div className="rounded-md border border-border bg-surface-1/90 px-3 py-2 text-xs text-fg-muted backdrop-blur">
                Median sale price{activeMonth ? ` in ${formatMonth(activeMonth)}` : ''}, 3-month
                rolling. Darker is cheaper, shading is relative within the month. Click a region.
              </div>
              <TimeSlider months={months} index={activeIndex} onChange={setMonthIndex} />
            </div>
          )}
        </div>

        <aside className="w-96 shrink-0 overflow-y-auto border-l border-border p-5 max-lg:hidden">
          {series && data ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between gap-2">
                <h1 className="text-lg font-semibold">{series.name}</h1>
                {selected !== NATIONAL && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(NATIONAL);
                    }}
                    className="text-xs text-fg-muted transition-colors hover:text-fg"
                  >
                    Back to national
                  </button>
                )}
              </div>
              <TrendChart
                title="Median sale price"
                points={toChartPoints(series, 'medianSalePrice')}
                colour="#f59e0b"
                sourceName="HUD property sales statistics"
              />
              <TrendChart
                title="Median weekly rent"
                points={toChartPoints(series, 'medianRent')}
                colour="#fbbf24"
                sourceName="MBIE Tenancy Services bond data"
              />
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

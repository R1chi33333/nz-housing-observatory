import { useEffect, useMemo, useState } from 'react';
import { Map as MapIcon } from 'lucide-react';
import { RegionList } from '@/components/RegionList';
import { RegionMap } from '@/components/RegionMap';
import { RegionPanel } from '@/components/RegionPanel';
import { TimeSlider } from '@/components/TimeSlider';
import { formatMonth, latestValue, useHousingData, type RegionSeries } from '@/lib/data';

const NATIONAL = 'new-zealand';
const MAX_COMPARE = 3;

/** True at or above the lg breakpoint; the map only mounts there. */
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => window.matchMedia('(min-width: 1024px)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const onChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };
    query.addEventListener('change', onChange);
    return () => {
      query.removeEventListener('change', onChange);
    };
  }, []);
  return isDesktop;
}

export default function App() {
  const { data, error } = useHousingData();
  const isDesktop = useIsDesktop();
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

  const nameFor = (slug: string): string => findSeries(slug)?.name ?? slug;

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

      {!data && (
        <div className="flex flex-1 items-center justify-center text-sm text-fg-muted">
          {error ? `Could not load data: ${error}` : 'Loading data...'}
        </div>
      )}

      {data && isDesktop && (
        <main className="flex min-h-0 flex-1">
          <div className="relative min-w-0 flex-1">
            <RegionMap
              boundaries={data.boundaries}
              values={priceValues}
              selected={selection}
              onSelect={toggleRegion}
            />
            <div className="absolute inset-x-4 bottom-6 flex flex-wrap items-end justify-between gap-3">
              <div className="max-w-sm rounded-md border border-border bg-surface-1/90 px-3 py-2 text-xs text-fg-muted backdrop-blur">
                Median sale price{activeMonth ? ` in ${formatMonth(activeMonth)}` : ''}, 3-month
                rolling. Darker is cheaper, shading is relative within the month. Click up to{' '}
                {MAX_COMPARE} regions to compare.
              </div>
              <TimeSlider months={months} index={activeIndex} onChange={setMonthIndex} />
            </div>
          </div>

          <aside className="w-96 shrink-0 overflow-y-auto border-l border-border p-5">
            <RegionPanel
              selection={selection}
              panelSeries={panelSeries}
              onToggle={toggleRegion}
              nameFor={nameFor}
            />
          </aside>
        </main>
      )}

      {data && !isDesktop && (
        <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          <RegionPanel
            selection={selection}
            panelSeries={panelSeries}
            onToggle={toggleRegion}
            nameFor={nameFor}
          />
          <RegionList
            regions={data.housing.regions}
            selection={selection}
            onToggle={toggleRegion}
          />
        </main>
      )}

      <footer className="border-t border-border px-4 py-2 text-xs text-fg-muted">
        Data: MBIE Tenancy Services and HUD (open data).
        {data && ` Pipeline last ran ${formatMonth(data.housing.meta.generatedAt.slice(0, 7))}.`}
      </footer>
    </div>
  );
}

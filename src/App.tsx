import { useMemo, useState } from 'react';
import { Map as MapIcon } from 'lucide-react';
import { RegionMap } from '@/components/RegionMap';
import { formatMonth, formatNzd, latestValue, useHousingData } from '@/lib/data';

export default function App() {
  const { data, error } = useHousingData();
  const [selected, setSelected] = useState<string | undefined>();

  const priceValues = useMemo(() => {
    const values = new Map<string, number>();
    if (data) {
      for (const region of data.housing.regions) {
        const latest = latestValue(region, 'medianSalePrice');
        if (latest) {
          values.set(region.slug, latest.value);
        }
      }
    }
    return values;
  }, [data]);

  const selectedRegion = data?.housing.regions.find((region) => region.slug === selected);

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
              selected={selected}
              onSelect={setSelected}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-fg-muted">
              {error ? `Could not load data: ${error}` : 'Loading data...'}
            </div>
          )}
          {data && (
            <div className="absolute bottom-6 left-4 rounded-md border border-border bg-surface-1/90 px-3 py-2 text-xs text-fg-muted backdrop-blur">
              Median sale price, 3-month rolling. Darker is cheaper.
            </div>
          )}
        </div>

        <aside className="w-80 shrink-0 overflow-y-auto border-l border-border p-5 max-lg:hidden">
          {selectedRegion && data ? (
            <div className="flex flex-col gap-4">
              <h1 className="text-lg font-semibold">{selectedRegion.name}</h1>
              {(() => {
                const price = latestValue(selectedRegion, 'medianSalePrice');
                const rent = latestValue(selectedRegion, 'medianRent');
                return (
                  <div className="flex flex-col gap-3">
                    <div className="rounded-md border border-border bg-surface-1 p-4">
                      <p className="text-xs text-fg-muted">Median sale price</p>
                      <p className="mt-1 font-mono text-xl font-semibold">
                        {price ? formatNzd(price.value) : 'No data'}
                      </p>
                      {price && (
                        <p className="mt-0.5 text-xs text-fg-muted">{formatMonth(price.month)}</p>
                      )}
                    </div>
                    <div className="rounded-md border border-border bg-surface-1 p-4">
                      <p className="text-xs text-fg-muted">Median weekly rent</p>
                      <p className="mt-1 font-mono text-xl font-semibold">
                        {rent ? formatNzd(rent.value) : 'No data'}
                      </p>
                      {rent && (
                        <p className="mt-0.5 text-xs text-fg-muted">{formatMonth(rent.month)}</p>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-fg-muted">
                      Trend charts land in the next loop.
                    </p>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-center text-sm text-fg-muted">
              Select a region on the map
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

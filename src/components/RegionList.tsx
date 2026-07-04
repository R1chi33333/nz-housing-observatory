import { Check } from 'lucide-react';
import { formatNzd, latestValue, type RegionSeries } from '@/lib/data';

interface RegionListProps {
  regions: RegionSeries[];
  selection: string[];
  onToggle: (slug: string) => void;
}

/** Mobile stand-in for the map: regions sorted by latest price. */
export function RegionList({ regions, selection, onToggle }: RegionListProps) {
  const rows = regions
    .map((region) => ({
      region,
      price: latestValue(region, 'medianSalePrice')?.value,
    }))
    .sort((a, b) => (b.price ?? 0) - (a.price ?? 0));

  return (
    <section className="overflow-hidden rounded-md border border-border">
      <div className="border-b border-border bg-surface-1 px-4 py-2.5 text-xs text-fg-muted">
        Regions by latest median sale price. Tap to compare up to three.
      </div>
      <ul className="divide-y divide-border">
        {rows.map(({ region, price }) => {
          const active = selection.includes(region.slug);
          return (
            <li key={region.slug}>
              <button
                type="button"
                onClick={() => {
                  onToggle(region.slug);
                }}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors ${
                  active ? 'bg-surface-2' : 'hover:bg-surface-1'
                }`}
              >
                <span className="flex items-center gap-2">
                  {active && <Check className="size-4 text-accent" strokeWidth={2} />}
                  {region.name}
                </span>
                <span className="font-mono text-xs text-fg-muted">
                  {price !== undefined ? formatNzd(price) : 'No data'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

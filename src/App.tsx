import { Map } from 'lucide-react';

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <Map className="size-5 text-accent" strokeWidth={1.5} />
          <span className="text-sm font-semibold">NZ Housing Observatory</span>
        </div>
        <a
          href="https://github.com/R1chi33333/nz-housing-observatory"
          className="text-sm text-fg-muted transition-colors hover:text-fg"
        >
          GitHub
        </a>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <h1 className="max-w-xl text-3xl font-semibold tracking-tight">
          House prices and rents across New Zealand
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-fg-muted">
          Regional trends from open Stats NZ and MBIE data, refreshed monthly by an automated
          pipeline. Map and charts under construction.
        </p>
      </main>

      <footer className="border-t border-border px-6 py-4 text-xs text-fg-muted">
        MIT licensed. Data: Stats NZ, MBIE Tenancy Services (open data).
      </footer>
    </div>
  );
}

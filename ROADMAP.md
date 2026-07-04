# Roadmap

Development follows small, releasable increments. Each item below is one loop.

## Milestone: v0.1.0 — Data pipeline

- [x] Loop 1: repository scaffold, CI pipeline, deployable blank page
- [x] Loop 2: source research — datasets chosen and documented with links, licences and quirks
- [x] Loop 3: pipeline core — rent data fetched, cleaned and standardised, fully tested
- [x] Loop 4: house price series cleaned and merged, housing.json emitted with source manifest
- [x] Loop 5: GitHub Actions monthly cron runs the pipeline and commits refreshed data
- [x] Release v0.1.0

## Milestone: v0.2.0 — Dashboard

- [x] Loop 6: region choropleth map with MapLibre GL and the OpenFreeMap dark basemap
- [x] Loop 7: side panel trend charts with year-on-year change and per-chart source notes
- [x] Loop 8: time slider replaying the map through the years
- [x] Loop 9: compare mode — up to three regions overlaid on the charts
- [x] Release v0.2.0

## Milestone: v1.0.0 — Ship

- [x] Loop 10: mobile fallback — region list plus charts below the map breakpoint
- [x] Loop 11: Playwright e2e for the desktop map flow and the mobile list flow
- [x] Loop 12: README with architecture diagram, screenshot and data documentation
- [x] Release v1.0.0

## Later

- [ ] Suburb-level drill-down where data allows
- [ ] Affordability ratios (price-to-income) overlay
- [ ] CSV export of any chart series

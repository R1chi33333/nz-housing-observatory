# Roadmap

Development follows small, releasable increments. Each item below is one loop.

## Milestone: v0.1.0 — Data pipeline

- [x] Loop 1: repository scaffold, CI pipeline, deployable blank page
- [x] Loop 2: source research — datasets chosen and documented with links, licences and quirks
- [x] Loop 3: pipeline core — rent data fetched, cleaned and standardised, fully tested
- [ ] Loop 4: house price series cleaned and merged, static JSON emitted to public/data with a manifest (sources, generated-at)
- [ ] Loop 5: GitHub Actions monthly cron runs the pipeline and commits refreshed data
- [ ] Release v0.1.0

## Milestone: v0.2.0 — Dashboard

- [ ] Loop 6: region choropleth map with MapLibre GL and an open basemap
- [ ] Loop 7: side panel — median price and rent trend lines with year-on-year change for the selected region
- [ ] Loop 8: time slider replaying the map through the years
- [ ] Loop 9: compare mode — up to three regions overlaid on the charts
- [ ] Release v0.2.0

## Milestone: v1.0.0 — Ship

- [ ] Loop 10: mobile fallback — list plus charts below the map breakpoint
- [ ] Loop 11: source and updated-at annotations on every chart, polish pass
- [ ] Loop 12: README with architecture diagram, screenshot and data documentation
- [ ] Release v1.0.0

## Later

- [ ] Suburb-level drill-down where data allows
- [ ] Affordability ratios (price-to-income) overlay
- [ ] CSV export of any chart series

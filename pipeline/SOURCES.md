# Data sources

Both sources are open government data requiring no registration or API keys.
All amounts are NZD. The pipeline standardises region names across sources
(for example MBIE's "Auckland Region" and HUD's "Auckland" both become
`auckland`).

## Rents — MBIE Tenancy Services rental bond data

- Measures used: median weekly rent, lower and upper quartile rent, lodged bonds
- Coverage: 16 regional councils plus national total, monthly since February 1993
- Access: CKAN DataStore API on data.govt.nz (resource
  `410f751e-b635-4cd0-9495-1b164cbd97b0` of dataset
  [rental-bond-data-by-region](https://catalogue.data.govt.nz/dataset/rental-bond-data-by-region)),
  paginated JSON
- Why the API and not the CSV: the canonical CSV on tenancy.govt.nz and
  mbie.govt.nz sits behind bot protection that blocks non-browser downloads,
  so automated refreshes use the DataStore mirror instead
- Update frequency: monthly
- Licence: Creative Commons Attribution (credit "Ministry of Business,
  Innovation and Employment")
- Quirk: rows with Location `NA` are dropped; `ALL` becomes the national series

## House prices — HUD property and sales statistics

- Measures used: median sale price, lower and upper quartile sale price,
  residential sales count (stat type `3-Month rolling` for a stable monthly series)
- Coverage: national, 16 regions, territorial authorities and Auckland local
  boards, monthly since January 1980; sourced from the District Valuation Roll
  (council-reported sales under the Rating Valuations Act)
- Access: Excel workbook linked from
  [the dashboard page](https://www.hud.govt.nz/stats-and-insights/property-and-sales-statistics/about-the-dashboard);
  the file name is dated (for example `Property-and-Sales-data-download-June-2026.xlsx`),
  so the pipeline scrapes the page for the current link rather than hard-coding it
- Update frequency: monthly, with roughly a three month settlement lag;
  HUD recalculates all periods on each refresh, so the pipeline replaces the
  whole series rather than appending
- Licence: NZ government open data (attribution "Te Tuapapa Kura Kainga -
  Ministry of Housing and Urban Development"); the dashboard page carries a
  general-information disclaimer which the app repeats in its footer
- Quirk: `Area Outside Region` is dropped; periods are Excel serial dates

## Output contract

The pipeline writes `public/data/housing.json`:

- `regions`: slug, display name, per-month series of median rent and median
  sale price with quartiles and counts
- `national`: the same series for all of New Zealand
- `meta`: source names, source URLs, licence notes, and the generation
  timestamp shown on every chart

/**
 * HUD property sales statistics. The workbook link on the dashboard
 * page is dated (a new file name every month), so the pipeline
 * discovers the current link at run time. See SOURCES.md.
 */

import * as XLSX from 'xlsx';
import { NATIONAL_SLUG, normaliseRegionName } from './regions.ts';
import type { MonthPoint } from './types.ts';

export const HUD_DASHBOARD_PAGE =
  'https://www.hud.govt.nz/stats-and-insights/property-and-sales-statistics/about-the-dashboard';

/** Polite bot identity: some hosts reject requests with no user agent. */
const REQUEST_HEADERS = {
  'User-Agent':
    'nz-housing-observatory-pipeline/1.0 (+https://github.com/R1chi33333/nz-housing-observatory)',
};

const WORKBOOK_LINK = /\/assets\/[^"' ]*Property-and-Sales-data-download[^"' ]*\.xlsx[^"' ]*/i;

/** Find the current workbook URL on the dashboard page HTML. */
export function extractWorkbookUrl(html: string, base = 'https://www.hud.govt.nz'): string {
  const match = WORKBOOK_LINK.exec(html);
  if (!match) {
    throw new Error('Could not find the HUD sales workbook link on the dashboard page');
  }
  return new URL(match[0].replaceAll('&amp;', '&'), base).toString();
}

export async function fetchSalesWorkbook(fetchImpl: typeof fetch = fetch): Promise<ArrayBuffer> {
  const page = await fetchImpl(HUD_DASHBOARD_PAGE, { headers: REQUEST_HEADERS });
  if (!page.ok) {
    throw new Error(`HUD dashboard page request failed: ${String(page.status)}`);
  }
  const url = extractWorkbookUrl(await page.text());
  const workbook = await fetchImpl(url, { headers: REQUEST_HEADERS });
  if (!workbook.ok) {
    throw new Error(`HUD workbook download failed: ${String(workbook.status)}`);
  }
  return workbook.arrayBuffer();
}

/** Row shape of the Sales sheet. */
export interface RawSalesRow {
  stat_type: string;
  area_type: string;
  area: string;
  /** Excel serial date. */
  period: number;
  residential_sales: number | null;
  lower_quartile_sale_price: number | null;
  median_sale_price: number | null;
  upper_quartile_sale_price: number | null;
}

export function parseSalesSheet(buffer: ArrayBuffer): RawSalesRow[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets.Sales;
  if (!sheet) {
    throw new Error('Sales sheet missing from the HUD workbook');
  }
  return XLSX.utils.sheet_to_json<RawSalesRow>(sheet);
}

/** Excel serial date (1900 system) to "YYYY-MM". */
export function excelSerialToMonth(serial: number): string | undefined {
  if (!Number.isFinite(serial) || serial <= 0) {
    return undefined;
  }
  const date = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
  const year = date.getUTCFullYear();
  if (year < 1970 || year > 2100) {
    return undefined;
  }
  return `${String(year)}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function positive(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

/**
 * Clean sales rows into per-region monthly series.
 *
 * Policy decisions, also recorded in SOURCES.md:
 * - stat type "3-Month rolling" balances stability against freshness;
 *   monthly medians in small regions are too noisy to map
 * - only Region and National area types are kept for the MVP
 * - "Area Outside Region" and unknown areas are dropped
 * - suppressed or zero prices are omitted, never interpolated
 */
export function cleanSales(rows: readonly RawSalesRow[]): Map<string, MonthPoint[]> {
  const byRegion = new Map<string, Map<string, MonthPoint>>();

  for (const row of rows) {
    if (row.stat_type !== '3-Month rolling') {
      continue;
    }
    let slug: string | undefined;
    if (row.area_type === 'National') {
      slug = NATIONAL_SLUG;
    } else if (row.area_type === 'Region') {
      slug = normaliseRegionName(row.area);
    }
    if (!slug) {
      continue;
    }
    const month = excelSerialToMonth(row.period);
    if (!month) {
      continue;
    }

    const point: MonthPoint = { month };
    const median = positive(row.median_sale_price);
    const lower = positive(row.lower_quartile_sale_price);
    const upper = positive(row.upper_quartile_sale_price);
    const sales = positive(row.residential_sales);
    if (median !== undefined) {
      point.medianSalePrice = median;
    }
    if (lower !== undefined) {
      point.salesLowerQuartile = lower;
    }
    if (upper !== undefined) {
      point.salesUpperQuartile = upper;
    }
    if (sales !== undefined) {
      point.residentialSales = sales;
    }

    const months = byRegion.get(slug) ?? new Map<string, MonthPoint>();
    months.set(month, point);
    byRegion.set(slug, months);
  }

  const result = new Map<string, MonthPoint[]>();
  for (const [slug, months] of byRegion) {
    result.set(
      slug,
      [...months.values()].sort((a, b) => a.month.localeCompare(b.month)),
    );
  }
  return result;
}

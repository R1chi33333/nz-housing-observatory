/**
 * MBIE rental bond data via the data.govt.nz CKAN DataStore.
 * See SOURCES.md for why the API is used instead of the CSVs.
 */

import { NATIONAL_SLUG, normaliseRegionName } from './regions.ts';
import type { MonthPoint } from './types.ts';

const DATASTORE_URL = 'https://catalogue.data.govt.nz/api/3/action/datastore_search';
export const RENTS_RESOURCE_ID = '410f751e-b635-4cd0-9495-1b164cbd97b0';
const PAGE_SIZE = 1000;

/** Polite bot identity: some hosts reject requests with no user agent. */
const REQUEST_HEADERS = {
  'User-Agent':
    'nz-housing-observatory-pipeline/1.0 (+https://github.com/R1chi33333/nz-housing-observatory)',
};

/** Raw record shape returned by the DataStore for this resource. */
export interface RawRentRecord {
  Location: string;
  'Time Frame': string;
  'Median Rent': number | null;
  'Lower Quartile Rent': number | null;
  'Upper Quartile Rent': number | null;
  'Lodged Bonds': number | null;
}

interface DatastoreResponse {
  success: boolean;
  result: { records: RawRentRecord[]; total: number };
}

/** Page through the whole resource. */
export async function fetchRentRecords(fetchImpl: typeof fetch = fetch): Promise<RawRentRecord[]> {
  const records: RawRentRecord[] = [];
  let offset = 0;
  for (;;) {
    const url = `${DATASTORE_URL}?resource_id=${RENTS_RESOURCE_ID}&limit=${String(PAGE_SIZE)}&offset=${String(offset)}`;
    const response = await fetchImpl(url, { headers: REQUEST_HEADERS });
    if (!response.ok) {
      throw new Error(
        `DataStore request failed: ${String(response.status)} for offset ${String(offset)}`,
      );
    }
    const body = (await response.json()) as DatastoreResponse;
    if (!body.success) {
      throw new Error('DataStore request reported failure');
    }
    records.push(...body.result.records);
    offset += PAGE_SIZE;
    if (offset >= body.result.total) {
      return records;
    }
  }
}

/** A positive finite number, else undefined. Suppressed cells arrive as null or 0. */
function positive(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

/**
 * Clean raw records into per-region monthly series.
 *
 * Policy decisions, also recorded in SOURCES.md:
 * - Location "NA" rows are dropped (no usable geography)
 * - Location "ALL" becomes the national series
 * - unknown locations are dropped rather than guessed
 * - zero or null rents are treated as suppressed and omitted, never
 *   interpolated: a gap in the chart is honest, a made-up value is not
 */
export function cleanRents(records: readonly RawRentRecord[]): Map<string, MonthPoint[]> {
  const byRegion = new Map<string, Map<string, MonthPoint>>();

  for (const record of records) {
    const slug = record.Location === 'ALL' ? NATIONAL_SLUG : normaliseRegionName(record.Location);
    if (!slug) {
      continue;
    }
    const month = record['Time Frame'].slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      continue;
    }

    const point: MonthPoint = { month };
    const medianRent = positive(record['Median Rent']);
    const lower = positive(record['Lower Quartile Rent']);
    const upper = positive(record['Upper Quartile Rent']);
    const bonds = positive(record['Lodged Bonds']);
    if (medianRent !== undefined) {
      point.medianRent = medianRent;
    }
    if (lower !== undefined) {
      point.rentLowerQuartile = lower;
    }
    if (upper !== undefined) {
      point.rentUpperQuartile = upper;
    }
    if (bonds !== undefined) {
      point.lodgedBonds = bonds;
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

/**
 * MBIE Tenancy Services rental bond data, from the canonical
 * detailed-monthly-region CSV on tenancy.govt.nz.
 *
 * History: the pipeline originally read the data.govt.nz DataStore
 * mirror of this dataset, until it turned out the mirror stopped
 * updating in March 2022. The canonical CSV is current but sits
 * behind bot protection, so it is fetched through a real browser
 * (see browser-rents.ts) with the committed series as fallback.
 */

import { NATIONAL_SLUG, normaliseRegionName } from './regions.ts';
import type { MonthPoint } from './types.ts';

/** One parsed CSV row. */
export interface RawRentRow {
  location: string;
  /** ISO date string, e.g. "2026-04-01". */
  timeFrame: string;
  medianRent: number | undefined;
  lowerQuartile: number | undefined;
  upperQuartile: number | undefined;
  lodgedBonds: number | undefined;
}

/** "1,234" -> 1234; blank, dashes and zeros mean suppressed. */
function parseNumber(field: string | undefined): number | undefined {
  if (field === undefined) {
    return undefined;
  }
  const cleaned = field.replaceAll(/[,\s]/g, '');
  if (cleaned === '' || cleaned === '-') {
    return undefined;
  }
  const value = Number(cleaned);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

/** Split one CSV line of fully quoted fields. */
function splitQuotedLine(line: string): string[] {
  const fields: string[] = [];
  const pattern = /"([^"]*)"/g;
  let match;
  while ((match = pattern.exec(line)) !== null) {
    fields.push(match[1] ?? '');
  }
  return fields;
}

/**
 * Parse the detailed-monthly-region CSV. Every field is quoted and
 * numbers use comma thousands separators.
 */
export function parseRentsCsv(text: string): RawRentRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  const headerLine = lines[0];
  if (!headerLine) {
    throw new Error('Rent CSV is empty');
  }
  const header = splitQuotedLine(headerLine);
  const col = (name: string) => header.indexOf(name);
  const columns = {
    timeFrame: col('Time Frame'),
    location: col('Location'),
    medianRent: col('Median Rent'),
    lowerQuartile: col('Lower Quartile Rent'),
    upperQuartile: col('Upper Quartile Rent'),
    lodgedBonds: col('Lodged Bonds'),
  };
  if (Object.values(columns).some((index) => index === -1)) {
    throw new Error(`Rent CSV header changed: ${headerLine}`);
  }

  const rows: RawRentRow[] = [];
  for (const line of lines.slice(1)) {
    const fields = splitQuotedLine(line);
    rows.push({
      location: (fields[columns.location] ?? '').trim(),
      timeFrame: (fields[columns.timeFrame] ?? '').trim(),
      medianRent: parseNumber(fields[columns.medianRent]),
      lowerQuartile: parseNumber(fields[columns.lowerQuartile]),
      upperQuartile: parseNumber(fields[columns.upperQuartile]),
      lodgedBonds: parseNumber(fields[columns.lodgedBonds]),
    });
  }
  return rows;
}

/**
 * Clean parsed rows into per-region monthly series.
 *
 * Policy decisions, also recorded in SOURCES.md:
 * - Location "NA" rows are dropped (no usable geography)
 * - Location "ALL" becomes the national series
 * - unknown locations are dropped rather than guessed
 * - suppressed values are omitted, never interpolated: a gap in the
 *   chart is honest, a made-up value is not
 */
export function cleanRents(rows: readonly RawRentRow[]): Map<string, MonthPoint[]> {
  const byRegion = new Map<string, Map<string, MonthPoint>>();

  for (const row of rows) {
    const slug = row.location === 'ALL' ? NATIONAL_SLUG : normaliseRegionName(row.location);
    if (!slug) {
      continue;
    }
    const month = row.timeFrame.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      continue;
    }

    const point: MonthPoint = { month };
    if (row.medianRent !== undefined) {
      point.medianRent = row.medianRent;
    }
    if (row.lowerQuartile !== undefined) {
      point.rentLowerQuartile = row.lowerQuartile;
    }
    if (row.upperQuartile !== undefined) {
      point.rentUpperQuartile = row.upperQuartile;
    }
    if (row.lodgedBonds !== undefined) {
      point.lodgedBonds = row.lodgedBonds;
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

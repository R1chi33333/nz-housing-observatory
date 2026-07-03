/**
 * Rebuild public/data/housing.json from the open datasets.
 * Run with: npm run pipeline
 *
 * The rent source is unreachable from datacenter IPs (see
 * fallback.ts); when it fails, the committed rent series is reused
 * and only sales data refreshes.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fetchRentsCsvViaBrowser } from './lib/browser-rents.ts';
import { extractRentSeries } from './lib/fallback.ts';
import { buildHousingData } from './lib/merge.ts';
import { cleanSales, fetchSalesWorkbook, parseSalesSheet } from './lib/prices.ts';
import { cleanRents, parseRentsCsv } from './lib/rents.ts';
import type { HousingData, MonthPoint } from './lib/types.ts';

const OUT_DIR = new URL('../public/data/', import.meta.url);
const OUT_FILE = new URL('housing.json', OUT_DIR);

async function loadRents(): Promise<Map<string, MonthPoint[]>> {
  try {
    console.log('Fetching MBIE rent CSV through Chrome...');
    const csv = await fetchRentsCsvViaBrowser();
    const rows = parseRentsCsv(csv);
    console.log(`  ${String(rows.length)} rows`);
    return cleanRents(rows);
  } catch (error) {
    console.warn(
      `  Rent source unavailable: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
    console.warn('  Falling back to the rent series committed in housing.json.');
    const previous = JSON.parse(await readFile(OUT_FILE, 'utf8')) as HousingData;
    const recovered = extractRentSeries(previous);
    if (recovered.size === 0) {
      throw new Error('No previous rent data available to fall back to');
    }
    return recovered;
  }
}

const rents = await loadRents();

console.log('Fetching HUD sales workbook...');
const workbook = await fetchSalesWorkbook();
console.log(`  ${String(Math.round(workbook.byteLength / 1024))} KiB`);
const sales = cleanSales(parseSalesSheet(workbook));

const data = buildHousingData(rents, sales, new Date().toISOString());

/** Serialise with the timestamp blanked, for change detection. */
function contentKey(doc: HousingData): string {
  return JSON.stringify({ ...doc, meta: { ...doc.meta, generatedAt: '' } });
}

let unchanged = false;
try {
  const previous = JSON.parse(await readFile(OUT_FILE, 'utf8')) as HousingData;
  unchanged = contentKey(previous) === contentKey(data);
} catch {
  // No previous file: always write.
}

if (unchanged) {
  console.log('Data content unchanged; keeping the existing housing.json.');
  process.exit(0);
}

await mkdir(OUT_DIR, { recursive: true });
await writeFile(OUT_FILE, JSON.stringify(data));

const regionCount = data.regions.length;
const monthCount = data.national.points.length;
console.log(
  `Wrote housing.json: ${String(regionCount)} regions, ${String(monthCount)} national months.`,
);

/**
 * Rebuild public/data/housing.json from the open datasets.
 * Run with: npm run pipeline
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { buildHousingData } from './lib/merge.ts';
import { cleanSales, fetchSalesWorkbook, parseSalesSheet } from './lib/prices.ts';
import { cleanRents, fetchRentRecords } from './lib/rents.ts';

const OUT_DIR = new URL('../public/data/', import.meta.url);

console.log('Fetching MBIE rent records...');
const rentRecords = await fetchRentRecords();
console.log(`  ${String(rentRecords.length)} records`);
const rents = cleanRents(rentRecords);

console.log('Fetching HUD sales workbook...');
const workbook = await fetchSalesWorkbook();
console.log(`  ${String(Math.round(workbook.byteLength / 1024))} KiB`);
const sales = cleanSales(parseSalesSheet(workbook));

const data = buildHousingData(rents, sales, new Date().toISOString());

await mkdir(OUT_DIR, { recursive: true });
await writeFile(new URL('housing.json', OUT_DIR), JSON.stringify(data));

const regionCount = data.regions.length;
const monthCount = data.national.points.length;
console.log(
  `Wrote housing.json: ${String(regionCount)} regions, ${String(monthCount)} national months.`,
);

/**
 * One-off (rerunnable) extraction of NZ region boundaries.
 *
 * Source: Natural Earth 10m admin-1 states and provinces, public
 * domain (https://www.naturalearthdata.com/about/terms-of-use/).
 * Region polygons are approximate, which is fine for a choropleth.
 * Output is committed since boundaries effectively never change.
 *
 * Run with: node pipeline/boundaries.ts
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { normaliseRegionName, REGIONS } from './lib/regions.ts';

const SOURCE_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson';

interface Feature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: unknown;
}

interface FeatureCollection {
  type: 'FeatureCollection';
  features: Feature[];
}

console.log('Downloading Natural Earth admin-1 boundaries (about 40 MB)...');
const response = await fetch(SOURCE_URL);
if (!response.ok) {
  throw new Error(`Download failed: ${String(response.status)}`);
}
const world = (await response.json()) as FeatureCollection;

const names = new Map(REGIONS.map((region) => [region.slug, region.name]));
const features: Feature[] = [];
for (const feature of world.features) {
  if (feature.properties.admin !== 'New Zealand') {
    continue;
  }
  const rawName = feature.properties.name;
  const slug = normaliseRegionName(typeof rawName === 'string' ? rawName : '');
  if (!slug) {
    continue; // outlying islands and non-region units
  }
  features.push({
    type: 'Feature',
    properties: { slug, name: names.get(slug) ?? slug },
    geometry: feature.geometry,
  });
}

if (features.length !== REGIONS.length) {
  const found = new Set(features.map((f) => f.properties.slug as string));
  const missing = REGIONS.filter((r) => !found.has(r.slug)).map((r) => r.slug);
  throw new Error(`Expected ${String(REGIONS.length)} regions, missing: ${missing.join(', ')}`);
}

const collection: FeatureCollection = { type: 'FeatureCollection', features };
const out = new URL('../public/data/regions.geojson', import.meta.url);
await mkdir(new URL('.', out), { recursive: true });
await writeFile(out, JSON.stringify(collection));
console.log(`Wrote regions.geojson with ${String(features.length)} regions.`);
